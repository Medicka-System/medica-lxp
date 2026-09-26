'use client';

/**
 * `GaleriaReporte` — bloque de galería de un reporte clínico (§6.5). El médico SUBE varias
 * imágenes directo al reporte (JPG/PNG, .dcm), se acomodan en un GRID de 2 columnas (como el
 * reporte en Word), se REORDENAN arrastrando y cada una lleva un pie opcional.
 *
 * Flujo (§2/§10): firma la subida en `apps/api` → el navegador PUT el original a object
 * storage → el `api` TAPA la PII quemada (Presidio) y deja la imagen redactada → se lee con
 * URL firmada. El valor persiste en `contenido.valores[campoId]` como lista ordenada.
 */

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImageOff, ImagePlus, Loader2, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { focusRing } from '@/components/tokens';
import { leerGaleria, type ImagenGaleria } from '@/lib/reportes/estructura';
import { firmarLecturaImagenes, firmarSubidaImagen, procesarImagen } from '@/lib/reportes/imagenes-acciones';

const EXT_OK = ['jpg', 'jpeg', 'png', 'dcm'];

function extDe(file: File): string {
  const t = file.type.toLowerCase();
  if (t === 'image/png') return 'png';
  if (t === 'image/jpeg') return 'jpg';
  const e = (file.name.split('.').pop() ?? '').toLowerCase();
  if (e === 'jpeg') return 'jpg';
  return EXT_OK.includes(e) ? e : 'jpg';
}
function contentTypeDe(ext: string): string {
  return ext === 'png' ? 'image/png' : ext === 'dcm' ? 'application/dicom' : 'image/jpeg';
}

export function GaleriaReporte({
  reporteId,
  valor,
  onCambio,
  soloLectura = false,
}: {
  reporteId: string;
  valor: unknown;
  onCambio: (imagenes: ImagenGaleria[]) => void;
  /** Reporte FINALIZADO: muestra las imágenes pero sin subir/borrar/reordenar/editar pie. */
  soloLectura?: boolean;
}) {
  const imagenes = leerGaleria(valor);
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Miniaturas rasterizadas de los .dcm (BUG 1): un .dcm no se muestra como <img>; se pinta
  // con Cornerstone (wadouri) a un PNG. Los JPG/PNG siguen mostrándose con su URL firmada.
  const [rasters, setRasters] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revisar, setRevisar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refsKey = imagenes.map((i) => i.ref).join(',');

  // Firma la lectura de las refs que aún no tienen URL (para mostrarlas).
  useEffect(() => {
    const refs = refsKey ? refsKey.split(',') : [];
    if (refs.length === 0) return;
    let vivo = true;
    (async () => {
      const r = await firmarLecturaImagenes(reporteId, refs);
      if (vivo && r.ok) setUrls((u) => ({ ...u, ...r.datos.urls }));
    })();
    return () => {
      vivo = false;
    };
  }, [refsKey, reporteId]);

  // Rasteriza a miniatura los .dcm cuya URL firmada ya llegó (BUG 1). La key cambia cuando
  // aparece un .dcm nuevo con URL, disparando solo entonces el render de Cornerstone.
  const dcmPendientesKey = imagenes
    .filter((i) => i.ext === 'dcm' && urls[i.ref] && !rasters[i.ref])
    .map((i) => i.ref)
    .join(',');
  useEffect(() => {
    const pend = dcmPendientesKey ? dcmPendientesKey.split(',') : [];
    if (pend.length === 0) return;
    let vivo = true;
    (async () => {
      // Dinámico: mantiene el WASM de Cornerstone FUERA del bundle del Studio (esta pieza la
      // comparte `campo-reporte`); solo se carga al rasterizar un .dcm en el editor del campus.
      const { renderMiniaturas } = await import('@/components/dicom/engine/motor-cornerstone');
      const pngs = await renderMiniaturas(pend.map((ref) => `wadouri:${urls[ref]}`));
      if (!vivo) return;
      const add: Record<string, string> = {};
      pend.forEach((ref, i) => {
        const u = pngs[i];
        if (u) add[ref] = u;
      });
      if (Object.keys(add).length) setRasters((r) => ({ ...r, ...add }));
    })();
    return () => {
      vivo = false;
    };
  }, [dcmPendientesKey]);

  // Acumulador local sembrado del valor comprometido: evita perder imágenes al subir
  // varias a la vez (el estado de React va desfasado entre awaits del loop).
  const valorRef = useRef(valor);
  valorRef.current = valor;

  async function subir(files: FileList | File[]) {
    setError(null);
    const lista = Array.from(files).filter((f) => EXT_OK.includes(extDe(f)));
    if (lista.length === 0) {
      setError('Formatos aceptados: JPG, PNG o .dcm.');
      return;
    }
    let acumulado = leerGaleria(valorRef.current);
    for (const file of lista) {
      const ext = extDe(file);
      setSubiendo((s) => s + 1);
      try {
        const firma = await firmarSubidaImagen(reporteId, ext);
        if (!firma.ok) {
          setError(firma.error);
          continue;
        }
        const put = await fetch(firma.datos.urlSubida, {
          method: 'PUT',
          headers: { 'content-type': contentTypeDe(ext) },
          body: file,
        });
        if (!put.ok) {
          setError('No se pudo subir la imagen a storage.');
          continue;
        }
        const proc = await procesarImagen(reporteId, firma.datos.id, ext);
        if (!proc.ok) {
          setError(proc.error);
          continue;
        }
        if (proc.datos.revisionManual) setRevisar(true);
        acumulado = [...acumulado, { ref: proc.datos.ref, ext: proc.datos.ext, pie: '' }];
        onCambio(acumulado);
      } catch {
        setError('Error al subir la imagen.');
      } finally {
        setSubiendo((s) => s - 1);
      }
    }
  }

  function setPie(ref: string, pie: string) {
    onCambio(imagenes.map((i) => (i.ref === ref ? { ...i, pie } : i)));
  }
  function quitar(ref: string) {
    onCambio(imagenes.filter((i) => i.ref !== ref));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = imagenes.findIndex((i) => i.ref === active.id);
    const newI = imagenes.findIndex((i) => i.ref === over.id);
    if (oldI < 0 || newI < 0) return;
    onCambio(arrayMove(imagenes, oldI, newI));
  }

  return (
    <div className="mt-1.5">
      {/* zona de subida (oculta en read-only: reporte finalizado) */}
      {!soloLectura && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) void subir(e.dataTransfer.files);
          }}
          className={`grid cursor-pointer place-items-center rounded-[11px] border-[1.5px] border-dashed border-border bg-card px-4 py-6 text-center transition-colors hover:border-secondary hover:bg-accent ${focusRing}`}
        >
          <span className="text-[12.5px] font-semibold text-secondary">
            {subiendo > 0 ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" strokeWidth={1.75} />
            ) : (
              <Upload className="mx-auto h-6 w-6" strokeWidth={1.75} />
            )}
            {subiendo > 0 ? `Subiendo ${subiendo} imagen(es)…` : 'Arrastra tus imágenes aquí o haz click para elegir'}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">Varias a la vez · JPG, PNG o .dcm</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png,.dcm,application/dicom"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void subir(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-1.5 text-[12px] text-[color:var(--warning-foreground)]">
          {error}
        </p>
      )}
      {revisar && (
        <p className="mt-2 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-1.5 text-[11.5px] text-[color:var(--warning-foreground)]">
          <TriangleAlert aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Alguna imagen quedó marcada para revisión manual de PII (§10): verifica que no quede texto con datos del paciente.
        </p>
      )}

      {/* grid 2 columnas: reordenable en edición, plano (sin DnD/controles) en read-only */}
      {imagenes.length > 0 &&
        (soloLectura ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {imagenes.map((img, i) => (
              <ItemGaleriaSoloLectura
                key={img.ref}
                img={img}
                indice={i + 1}
                url={img.ext === 'dcm' ? rasters[img.ref] : urls[img.ref]}
              />
            ))}
          </div>
        ) : (
          // id estable → dnd-kit siembra DndDescribedBy/aria-describedby determinista (SSR = CSR);
          // sin esto el contador interno difiere y provoca hydration mismatch.
          <DndContext id={`galeria-${reporteId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={imagenes.map((i) => i.ref)} strategy={rectSortingStrategy}>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {imagenes.map((img, i) => (
                  <ItemGaleria
                    key={img.ref}
                    img={img}
                    indice={i + 1}
                    url={img.ext === 'dcm' ? rasters[img.ref] : urls[img.ref]}
                    onPie={(pie) => setPie(img.ref, pie)}
                    onQuitar={() => quitar(img.ref)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ))}
    </div>
  );
}

/** Ítem de galería READ-ONLY (reporte finalizado): imagen + pie, sin arrastrar/borrar/editar. */
function ItemGaleriaSoloLectura({
  img,
  indice,
  url,
}: {
  img: ImagenGaleria;
  indice: number;
  url?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-[11px] border border-border bg-card">
      <div className="relative">
        {url ? (
          // eslint-disable-next-line
          <img src={url} alt={img.pie || `Imagen ${indice}`} className="h-[190px] w-full bg-muted object-contain" />
        ) : (
          <div className="grid h-[190px] w-full place-items-center bg-muted text-muted-foreground">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--sidebar)] text-[11px] font-bold text-white">
          {indice}
        </span>
      </div>
      {img.pie ? (
        <figcaption className="border-t border-border p-2 text-[12px] text-foreground">{img.pie}</figcaption>
      ) : null}
    </figure>
  );
}

function ItemGaleria({
  img,
  indice,
  url,
  onPie,
  onQuitar,
}: {
  img: ImagenGaleria;
  indice: number;
  url?: string;
  onPie: (pie: string) => void;
  onQuitar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.ref });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };

  return (
    <figure
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-[11px] border border-border bg-card ${isDragging ? 'opacity-80 shadow-lg' : ''}`}
    >
      <div className="relative">
        {url ? (
          // eslint-disable-next-line
          <img src={url} alt={img.pie || `Imagen ${indice}`} className="h-[190px] w-full bg-muted object-contain" />
        ) : (
          <div className="grid h-[190px] w-full place-items-center bg-muted text-muted-foreground">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--sidebar)] text-[11px] font-bold text-white">
          {indice}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reordenar (arrastrar)"
          className={`absolute right-2 top-2 grid h-7 w-7 cursor-grab place-items-center rounded-[8px] bg-card/90 text-muted-foreground shadow-rest hover:text-foreground ${focusRing}`}
        >
          <GripVertical aria-hidden className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar imagen"
          className={`absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-[8px] bg-card/90 text-muted-foreground shadow-rest transition-colors hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)] ${focusRing}`}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <figcaption className="border-t border-border p-2">
        <input
          value={img.pie ?? ''}
          onChange={(e) => onPie(e.target.value)}
          placeholder="Pie de la imagen (ej. Corte longitudinal riñón derecho)"
          className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </figcaption>
    </figure>
  );
}

/** Placeholder para el constructor (modo previa): el médico sube aquí. */
export function GaleriaPlaceholder() {
  return (
    <div className="mt-1.5 grid place-items-center rounded-[11px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-8 text-center">
      <span className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
        <ImagePlus className="mx-auto h-6 w-6" strokeWidth={1.75} />
        Galería · el médico sube aquí varias imágenes (grid de 2 columnas, reordenables)
      </span>
    </div>
  );
}

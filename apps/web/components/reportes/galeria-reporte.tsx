'use client';

/**
 * `GaleriaReporte` — galería de un reporte clínico (§6.5), FUENTE DE VERDAD = `lxp.reporte_imagenes`
 * (mig 0085). El médico SUBE varias imágenes (JPG/PNG, .dcm); el flujo es ASÍNCRONO (unificado con
 * Bitácora): subir → firmar → PUT a storage → ENCOLAR → el worker redacta la PII quemada (§10),
 * genera thumb (frame YA redactado) y derivados webp. La UI SONDEA el estado por fila:
 *   recibido/procesando → "Anonimizando…" · listo → thumb + srcset · cuarentena/error → aviso.
 *
 * El `<img>` sirve `srcset` de derivados (JPG/PNG) con el original como fallback; el `.dcm` usa su
 * thumb server-side (nunca se rasteriza en cliente para la miniatura · §10). Reordenar/pie/quitar
 * van por el `api` (service_role) — el cliente no escribe estado/ref directamente.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { ImagenGaleria } from '@/lib/reportes/estructura';
import {
  encolarImagenReporte,
  firmarSubidaImagen,
  listarGaleriaReporte,
  quitarImagenReporte,
  editarPieImagenReporte,
  reordenarGaleriaReporte,
  type EstadoImagen,
  type ImagenReporteVista,
} from '@/lib/reportes/imagenes-acciones';

const EXT_OK = ['jpg', 'jpeg', 'png', 'dcm'];
/** `sizes` del srcset: la galería se pinta a ~ancho de columna/detalle. */
const SIZES = '(max-width: 640px) 100vw, 360px';

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

const PENDIENTE = new Set<EstadoImagen>(['recibido', 'procesando']);

export function GaleriaReporte({
  reporteId,
  campoId,
  onCambio,
  soloLectura = false,
  max,
}: {
  reporteId: string;
  /** Campo galería dentro de la plantilla (ancla las filas en `lxp.reporte_imagenes`). */
  campoId: string;
  /** `valor` (marcador) ya no se usa como almacén; la galería se lee de la tabla. */
  valor?: unknown;
  onCambio: (imagenes: ImagenGaleria[]) => void;
  soloLectura?: boolean;
  max?: number;
}) {
  const [imagenes, setImagenes] = useState<ImagenReporteVista[]>([]);
  // Miniaturas rasterizadas de los `.dcm` LISTOS: un `.dcm` no se muestra como <img>; se pinta
  // con Cornerstone (wadouri) a un data-URL. El reporte guarda el `.dcm` ÍNTEGRO (con PII · §6.5),
  // así que el frame directo rasteriza bien (sin anonimizar, sin negro). JPG/PNG usan su thumb.
  const [rasters, setRasters] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notifica al padre las imágenes LISTAS (refs reales) → conteo + rasterizado DICOM del PDF.
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
  const notificar = useCallback((lista: ImagenReporteVista[]) => {
    const listas: ImagenGaleria[] = lista
      .filter((i) => i.estado === 'listo')
      .map((i) => ({ ref: i.ref, ext: i.ext, ...(i.pie ? { pie: i.pie } : {}) }));
    onCambioRef.current(listas);
  }, []);

  const cargar = useCallback(async () => {
    const r = await listarGaleriaReporte(reporteId, campoId);
    if (r.ok) {
      setImagenes(r.datos);
      notificar(r.datos);
      return r.datos;
    }
    return null;
  }, [reporteId, campoId, notificar]);

  // Carga inicial + SONDEO mientras alguna imagen esté en proceso (fases como Bitácora).
  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const datos = await cargar();
      if (!vivo) return;
      if (datos && datos.some((i) => PENDIENTE.has(i.estado))) {
        timer = setTimeout(tick, 2000);
      }
    };
    void tick();
    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [cargar]);

  // Rasteriza a miniatura los `.dcm` LISTOS con URL firmada que aún no tengan raster. Carga
  // Cornerstone de forma DINÁMICA (su WASM fuera del bundle salvo que haya un `.dcm` que pintar).
  const dcmPendientes = imagenes
    .filter((i) => i.ext === 'dcm' && i.estado === 'listo' && i.url && !rasters[i.id])
    .map((i) => `${i.id}|${i.url}`)
    .join(',');
  useEffect(() => {
    const pend = dcmPendientes ? dcmPendientes.split(',') : [];
    if (pend.length === 0) return;
    let vivo = true;
    (async () => {
      const { renderMiniaturas } = await import('@/components/dicom/engine/motor-cornerstone');
      const ids = pend.map((p) => p.split('|')[0]!);
      const urls = pend.map((p) => p.slice(p.indexOf('|') + 1));
      const pngs = await renderMiniaturas(urls.map((u) => `wadouri:${u}`));
      if (!vivo) return;
      const add: Record<string, string> = {};
      ids.forEach((id, i) => {
        const u = pngs[i];
        if (u) add[id] = u;
      });
      if (Object.keys(add).length) setRasters((r) => ({ ...r, ...add }));
    })();
    return () => {
      vivo = false;
    };
  }, [dcmPendientes]);

  async function subir(files: FileList | File[]) {
    setError(null);
    const lista = Array.from(files).filter((f) => EXT_OK.includes(extDe(f)));
    if (lista.length === 0) {
      setError('Formatos aceptados: JPG, PNG o .dcm.');
      return;
    }
    const espacio = typeof max === 'number' ? Math.max(0, max - imagenes.length) : lista.length;
    const aSubir = lista.slice(0, espacio);
    if (aSubir.length === 0) {
      setError(`Máximo ${max} imagen${max === 1 ? '' : 'es'}.`);
      return;
    }
    for (const file of aSubir) {
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
        const enc = await encolarImagenReporte(reporteId, campoId, firma.datos.id, firma.datos.ext);
        if (!enc.ok) {
          setError(enc.error);
          continue;
        }
      } catch {
        setError('Error al subir la imagen.');
      } finally {
        setSubiendo((s) => s - 1);
      }
    }
    await cargar(); // arranca el sondeo (habrá filas en proceso)
  }

  async function setPie(id: string, pie: string) {
    setImagenes((prev) => prev.map((i) => (i.id === id ? { ...i, pie } : i)));
    await editarPieImagenReporte(reporteId, id, pie);
  }
  async function quitar(id: string) {
    setImagenes((prev) => {
      const next = prev.filter((i) => i.id !== id);
      notificar(next);
      return next;
    });
    await quitarImagenReporte(reporteId, id);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = imagenes.findIndex((i) => i.id === active.id);
    const newI = imagenes.findIndex((i) => i.id === over.id);
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(imagenes, oldI, newI);
    setImagenes(next);
    notificar(next);
    await reordenarGaleriaReporte(reporteId, campoId, next.map((i) => i.id));
  }

  return (
    <div className="mt-1.5">
      {!soloLectura && (max === undefined || imagenes.length < max) && (
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
          <span className="mt-1 text-[11px] text-muted-foreground">Varias a la vez · JPG, PNG o .dcm · documento clínico (con datos del paciente)</span>
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
      {imagenes.length > 0 &&
        (soloLectura ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {imagenes.map((img, i) => (
              <ItemGaleria key={img.id} img={img} indice={i + 1} raster={rasters[img.id]} soloLectura />
            ))}
          </div>
        ) : (
          <DndContext id={`galeria-${reporteId}-${campoId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={imagenes.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {imagenes.map((img, i) => (
                  <ItemGaleria
                    key={img.id}
                    img={img}
                    indice={i + 1}
                    raster={rasters[img.id]}
                    onPie={(pie) => setPie(img.id, pie)}
                    onQuitar={() => quitar(img.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ))}
    </div>
  );
}

/** Cuerpo visual de una imagen según su estado (listo / en proceso / error). */
function Lienzo({ img, indice, raster }: { img: ImagenReporteVista; indice: number; raster?: string }) {
  if (img.estado === 'listo') {
    // `.dcm`: miniatura rasterizada en cliente (Cornerstone) del frame directo; mientras llega,
    // un loader. JPG/PNG: su thumb/original con `srcset` de derivados.
    const esDcm = img.ext === 'dcm';
    const src = esDcm ? raster : (img.thumbUrl ?? img.url);
    if (esDcm && !src) {
      return (
        <div className="grid h-[190px] w-full place-items-center gap-1.5 bg-muted text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-secondary" strokeWidth={1.9} />
          <span className="text-[11.5px] font-semibold">Cargando estudio…</span>
        </div>
      );
    }
    if (src) {
      return (
        // eslint-disable-next-line
        <img
          src={src}
          {...(!esDcm && img.srcset ? { srcSet: img.srcset, sizes: SIZES } : {})}
          alt={img.pie || `Imagen ${indice}`}
          className="h-[190px] w-full bg-muted object-contain"
        />
      );
    }
    return (
      <div className="grid h-[190px] w-full place-items-center bg-muted text-muted-foreground">
        <ImageOff className="h-6 w-6" strokeWidth={1.5} />
      </div>
    );
  }
  if (img.estado === 'error') {
    return (
      <div className="grid h-[190px] w-full place-items-center gap-1 bg-[color:var(--warning-surface)] px-4 text-center text-[color:var(--warning-foreground)]">
        <TriangleAlert className="mx-auto h-6 w-6" strokeWidth={1.6} />
        <span className="text-[11.5px] font-semibold">No se pudo procesar</span>
      </div>
    );
  }
  // recibido | procesando
  return (
    <div className="grid h-[190px] w-full place-items-center gap-1.5 bg-muted text-muted-foreground">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-secondary" strokeWidth={1.9} />
      <span className="text-[11.5px] font-semibold">Procesando…</span>
    </div>
  );
}

function ItemGaleria({
  img,
  indice,
  raster,
  onPie,
  onQuitar,
  soloLectura = false,
}: {
  img: ImagenReporteVista;
  indice: number;
  raster?: string;
  onPie?: (pie: string) => void;
  onQuitar?: () => void;
  soloLectura?: boolean;
}) {
  const sortable = useSortable({ id: img.id, disabled: soloLectura });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };

  return (
    <figure
      ref={soloLectura ? undefined : setNodeRef}
      style={soloLectura ? undefined : style}
      className={`overflow-hidden rounded-[11px] border border-border bg-card ${isDragging ? 'opacity-80 shadow-lg' : ''}`}
    >
      <div className="relative">
        <Lienzo img={img} indice={indice} raster={raster} />
        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--sidebar)] text-[11px] font-bold text-white">
          {indice}
        </span>
        {!soloLectura && (
          <>
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
          </>
        )}
      </div>
      {soloLectura ? (
        img.pie ? <figcaption className="border-t border-border p-2 text-[12px] text-foreground">{img.pie}</figcaption> : null
      ) : (
        <figcaption className="border-t border-border p-2">
          <input
            defaultValue={img.pie ?? ''}
            onBlur={(e) => onPie?.(e.target.value)}
            placeholder="Pie de la imagen (ej. Corte longitudinal riñón derecho)"
            className="w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </figcaption>
      )}
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

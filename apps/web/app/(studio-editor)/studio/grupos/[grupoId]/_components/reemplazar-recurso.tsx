'use client';

/**
 * Reemplazar un recurso de una lección SOLO para este grupo (Paso 4b). Lista los recursos
 * reemplazables de la lección (teoría: bloques imagen/pdf/galería/video; video-lección: su
 * video) y, al elegir uno, abre la CAPTURA ya unificada (reusada, no se construye nada nuevo):
 *   · imagen/pdf → CapturaRecurso (familia imagen/archivo)
 *   · galería    → N× CapturaRecurso (familia imagen)
 *   · video      → EditorVideoAutoria (misma autoría que el bloque/lección de video)
 * Guarda el override con la FUENTE YA RESUELTA (ref/src/videotecaId/imagenes), vía el mismo
 * `aplicarOverride`/`revertirOverride` del dominio (entidad 'bloque' | 'leccion_config'). El
 * alumno del grupo lo ve por el canal del Paso 1/2; otro grupo ve el del programa.
 */

import { useEffect, useState, useTransition } from 'react';
import { Blocks, Check, FileText, Images, Image as ImageIcon, Loader2, Plus, RefreshCw, Trash2, Video } from 'lucide-react';
import { softText, focusRing } from '@/lib/studio/estilos';
import { CapturaRecurso, ListaBiblioteca, type FamiliaCaptura, type FuenteMedia } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/captura-recurso';
import { EditorVideoAutoria } from '@/components/bloques/video/editor-video-autoria';
import type { FuenteVideoConfig } from '@/components/bloques/contratos';
import { listarRecursosReemplazables, type RecursoReemplazable, type FamiliaRecurso } from '@/lib/studio/acciones';
import { resolverFuenteRecursoAutor } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/recursos-acciones';
import { aplicarOverride, revertirOverride, type EntidadOverrideUI } from '@/lib/studio/herencia-acciones';

const ICONO: Record<FamiliaRecurso, typeof ImageIcon> = {
  imagen: ImageIcon,
  archivo: FileText,
  galeria: Images,
  video: Video,
  h5p: Blocks,
};

export function ReemplazarRecurso({
  grupoId,
  leccionId,
  onCambio,
}: {
  grupoId: string;
  leccionId: string;
  /** Tras guardar/revertir: refresca el detalle del grupo (conteos, Historial). */
  onCambio: () => void;
}) {
  const [recursos, setRecursos] = useState<RecursoReemplazable[] | null>(null);
  const [sel, setSel] = useState<RecursoReemplazable | null>(null);
  const [fuente, setFuente] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  const recargar = () => {
    listarRecursosReemplazables(grupoId, leccionId)
      .then(setRecursos)
      .catch(() => setRecursos([]));
  };
  useEffect(recargar, [grupoId, leccionId]);

  function abrir(r: RecursoReemplazable) {
    setSel(r);
    setFuente(null);
    setError(null);
  }

  function guardar() {
    if (!sel || !fuente || Object.keys(fuente).length === 0) {
      setError('Elige o sube el recurso de reemplazo.');
      return;
    }
    setError(null);
    iniciar(async () => {
      const r = await aplicarOverride(grupoId, {
        entidad: sel.entidad as EntidadOverrideUI,
        entidadId: sel.entidadId,
        patch: fuente,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSel(null);
      setFuente(null);
      recargar();
      onCambio();
    });
  }

  function revertir(r: RecursoReemplazable) {
    setError(null);
    iniciar(async () => {
      const res = await revertirOverride(grupoId, r.entidad as EntidadOverrideUI, r.entidadId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (sel && sel.entidadId === r.entidadId) setSel(null);
      recargar();
      onCambio();
    });
  }

  if (recursos === null) {
    return (
      <div className="mt-2.5 grid place-items-center gap-2 py-6 text-center">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.75} />
        <p className={`text-[12px] ${softText}`}>Cargando los recursos de la lección…</p>
      </div>
    );
  }
  if (recursos.length === 0) {
    return (
      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
        Esta lección no tiene recursos reemplazables (imagen, PDF, galería o video). Los interactivos
        H5P/xAPI se personalizarán en una fase posterior.
      </p>
    );
  }

  return (
    <div className="mt-2.5 grid gap-2.5">
      <p className={`text-[12px] leading-relaxed ${softText}`}>
        Elige qué recurso de la lección quieres reemplazar solo para este grupo.
      </p>

      <ul className="grid gap-2">
        {recursos.map((r) => {
          const Icono = ICONO[r.familia];
          const activo = sel?.entidad === r.entidad && sel?.entidadId === r.entidadId;
          return (
            <li key={`${r.entidad}:${r.entidadId}`} className="rounded-[11px] border border-border bg-card">
              <div className="flex items-center gap-3 p-3">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                  <Icono className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-snug">{r.label}</span>
                  {r.yaReemplazado && (
                    <span className="mt-0.5 inline-flex h-5 items-center gap-1 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-1.5 text-[10px] font-bold text-[color:var(--info-foreground)]">
                      <RefreshCw aria-hidden className="h-2.5 w-2.5" strokeWidth={2.2} />
                      Reemplazado en este grupo
                    </span>
                  )}
                </span>
                {r.yaReemplazado && (
                  <button
                    type="button"
                    onClick={() => revertir(r)}
                    disabled={guardando}
                    className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60 ${focusRing}`}
                  >
                    Volver a heredar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrir(r)}
                  className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] px-3 text-[12px] font-bold transition-colors ${focusRing} ${
                    activo ? 'bg-[color:var(--info)] text-white' : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                  }`}
                >
                  {r.yaReemplazado ? 'Cambiar' : 'Reemplazar'}
                </button>
              </div>

              {activo && (
                <div className="border-t border-border p-3">
                  <CapturaFuente familia={r.familia} leccionId={leccionId} onFuente={setFuente} />
                  {error && (
                    <div className="mt-2.5 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] font-medium text-[color:var(--destructive-foreground)]">
                      {error}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSel(null);
                        setFuente(null);
                        setError(null);
                      }}
                      className={`h-9 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={guardar}
                      disabled={guardando || !fuente || Object.keys(fuente ?? {}).length === 0}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-primary px-4 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                      {guardando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />}
                      Guardar reemplazo
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Dispatcher de captura por familia → produce el patch de fuente resuelta ── */
function CapturaFuente({
  familia,
  leccionId,
  onFuente,
}: {
  familia: FamiliaRecurso;
  leccionId: string;
  onFuente: (patch: Record<string, unknown>) => void;
}) {
  if (familia === 'imagen' || familia === 'archivo') {
    return (
      <CapturaImagenArchivo
        familia={familia}
        onFuente={(f) => onFuente(f.ref ? { ref: f.ref } : f.src ? { src: f.src } : {})}
      />
    );
  }
  if (familia === 'galeria') {
    return <CapturaGaleria onFuente={(imagenes) => onFuente({ imagenes })} />;
  }
  if (familia === 'h5p') {
    // SOLO biblioteca (decisión 4c): re-apuntar a otro H5P ya autorado; no subir .zip.
    return <PickerBibliotecaH5p onFuente={onFuente} />;
  }
  // video
  return (
    <EditorVideoAutoria
      titulo="Video de la lección"
      leccionId={leccionId}
      config={{ hitos: [] }}
      onCambio={(f: FuenteVideoConfig) =>
        onFuente(f.videotecaId ? { videotecaId: f.videotecaId } : f.url ? { url: f.url } : {})
      }
    />
  );
}

/* ── H5P: picker SOLO-biblioteca (reusa ListaBiblioteca + el resolvedor) → {contentId} ── */
function PickerBibliotecaH5p({ onFuente }: { onFuente: (patch: Record<string, unknown>) => void }) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function elegir(recursoId: string) {
    setError(null);
    const fuente = await resolverFuenteRecursoAutor(recursoId);
    // El resolvedor mapea h5p → { campo:'contentId', valor: storage_key(=contentId) }.
    if (!fuente || fuente.campo !== 'contentId') {
      setError('Ese H5P todavía no está disponible en la biblioteca.');
      return;
    }
    setElegido(recursoId);
    onFuente({ [fuente.campo]: fuente.valor });
  }

  return (
    <div className="grid gap-2">
      <p className={`text-[12px] leading-relaxed ${softText}`}>
        Elige otro interactivo H5P ya autorado de la biblioteca. Solo se re-apunta a este grupo.
      </p>
      <ListaBiblioteca tipos={['h5p']} onElegir={elegir} />
      {elegido && !error && (
        <p className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
          H5P seleccionado. Pulsa “Guardar reemplazo”.
        </p>
      )}
      {error && (
        <p className="rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] font-medium text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── imagen / pdf: una fuente con CapturaRecurso ── */
function CapturaImagenArchivo({
  familia,
  onFuente,
}: {
  familia: Extract<FamiliaCaptura, 'imagen' | 'archivo'>;
  onFuente: (f: FuenteMedia) => void;
}) {
  const [valor, setValor] = useState<FuenteMedia>({});
  return (
    <CapturaRecurso
      familia={familia}
      valor={valor}
      onCambio={(f) => {
        setValor(f);
        onFuente(f);
      }}
      renderPreview={(url) =>
        familia === 'imagen' ? (
          // <img>: URL firmada/externa, no asset local de next/image.
          <img src={url} alt="" className="max-h-[260px] w-full rounded-[10px] border border-border object-contain" />
        ) : (
          <object data={url} type="application/pdf" className="h-[320px] w-full rounded-[10px] border border-border bg-muted" />
        )
      }
    />
  );
}

/* ── galería: N× CapturaRecurso (familia imagen) → {imagenes:[{ref|src, alt}]} ── */
type ItemGaleria = { ref?: string; src?: string; alt: string };
function CapturaGaleria({ onFuente }: { onFuente: (imagenes: ItemGaleria[]) => void }) {
  const [items, setItems] = useState<ItemGaleria[]>([]);
  const set = (next: ItemGaleria[]) => {
    setItems(next);
    // Solo las imágenes con fuente cuentan como galería lista.
    onFuente(next.filter((x) => x.ref || x.src));
  };
  return (
    <div className="grid gap-2.5">
      {items.map((img, i) => (
        <div key={i} className="rounded-[10px] border border-border bg-muted p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-muted-foreground">Imagen {i + 1}</span>
            <button
              type="button"
              onClick={() => set(items.filter((_, j) => j !== i))}
              aria-label={`Quitar imagen ${i + 1}`}
              className={`grid h-8 w-8 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <CapturaRecurso
            familia="imagen"
            valor={{ ref: img.ref, src: img.src }}
            onCambio={(f) => set(items.map((x, j) => (j === i ? { ...x, ref: f.ref, src: f.src ?? '' } : x)))}
            renderPreview={(url) => (
              <img src={url} alt={img.alt} className="aspect-video w-full rounded-[9px] border border-border object-cover" />
            )}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...items, { src: '', alt: '' }])}
        className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
      >
        <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
        Agregar imagen
      </button>
    </div>
  );
}

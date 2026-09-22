'use client';

/**
 * Panel de NOTAS del alumno (§5A · mock leccion-lectura "Sus notas", escalado para no
 * saturarse). Vive en el rail derecho (bajo el menú del curso) y, en la lección de
 * video, debajo del reproductor. Diseñado para MUCHAS notas:
 *   · FILTROS por tipo con contador (Todas / Notas / Subrayados / Video).
 *   · GRID COMPACTO de chips con ícono + preview corto; al hacer click una nota se
 *     EXPANDE (ocupa el ancho) con el texto completo, editar/borrar y su acción:
 *     marcador de video → salta al punto; subrayado → lleva al texto resaltado.
 *   · Composer para escribir una nota libre; en video, "Guardar este momento".
 */

import { useMemo, useState } from 'react';
import { Check, Highlighter, NotebookPen, Pencil, Play, Quote, Trash2, X } from 'lucide-react';
import { mono, focusRing } from '@/components/tokens';
import type { Nota, NotaTipo } from '@/lib/campus/notas-contrato';
import { esAnclaTexto, esAnclaVideo } from '@/lib/campus/notas-contrato';

function reloj(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, '0')}`;
}

const ICONO: Record<NotaTipo, typeof NotebookPen> = {
  texto_seleccionado: Quote,
  nota_libre: NotebookPen,
  subrayado: Highlighter,
  marcador_video: Play,
};

type Filtro = 'todas' | 'notas' | 'subrayados' | 'video';

/** Preview corto de una nota para el chip compacto. */
function preview(n: Nota): string {
  if (esAnclaTexto(n.ancla) && (n.tipo === 'subrayado' || n.tipo === 'texto_seleccionado')) {
    return n.ancla.texto;
  }
  if (n.tipo === 'marcador_video') return n.contenido || 'Momento marcado';
  return n.contenido || 'Nota sin texto';
}

function encaja(n: Nota, f: Filtro): boolean {
  if (f === 'todas') return true;
  if (f === 'notas') return n.tipo === 'nota_libre' || n.tipo === 'texto_seleccionado';
  if (f === 'subrayados') return n.tipo === 'subrayado';
  return n.tipo === 'marcador_video';
}

export function PanelNotas({
  notas,
  error,
  onAgregarLibre,
  onEditar,
  onBorrar,
  onGuardarMomento,
  onSaltar,
  onIrASubrayado,
}: {
  notas: Nota[];
  error?: string | null;
  onAgregarLibre: (texto: string) => Promise<unknown>;
  onEditar: (id: string, texto: string) => Promise<boolean>;
  onBorrar: (id: string) => Promise<unknown>;
  /** Video: captura el momento actual como marcador (undefined en teoría). */
  onGuardarMomento?: () => void;
  /** Video: salta al segundo del marcador. */
  onSaltar?: (segundos: number) => void;
  /** Teoría: lleva al texto resaltado del subrayado. */
  onIrASubrayado?: (nota: Nota) => void;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [editando, setEditando] = useState(false);

  const conteo = useMemo(
    () => ({
      todas: notas.length,
      notas: notas.filter((n) => n.tipo === 'nota_libre' || n.tipo === 'texto_seleccionado').length,
      subrayados: notas.filter((n) => n.tipo === 'subrayado').length,
      video: notas.filter((n) => n.tipo === 'marcador_video').length,
    }),
    [notas],
  );

  const visibles = useMemo(() => notas.filter((n) => encaja(n, filtro)), [notas, filtro]);

  const agregar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    await onAgregarLibre(texto.trim());
    setTexto('');
    setEnviando(false);
  };

  const abrir = (n: Nota) => {
    setAbierta(n.id);
    setEditando(false);
    setEditTexto(n.contenido);
  };

  const guardarEdicion = async (id: string) => {
    if (!editTexto.trim()) return;
    const ok = await onEditar(id, editTexto.trim());
    if (ok) setEditando(false);
  };

  const FILTROS: { id: Filtro; etiqueta: string; n: number }[] = [
    { id: 'todas', etiqueta: 'Todas', n: conteo.todas },
    { id: 'notas', etiqueta: 'Notas', n: conteo.notas },
    { id: 'subrayados', etiqueta: 'Subrayados', n: conteo.subrayados },
    { id: 'video', etiqueta: 'Video', n: conteo.video },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <NotebookPen aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
        <h2 className="text-[14.5px] font-bold">Mis notas</h2>
        <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>{notas.length}</span>
      </div>

      {/* Composer + guardar momento (video) */}
      <div className="border-b border-border p-4">
        {onGuardarMomento && (
          <button
            type="button"
            onClick={onGuardarMomento}
            className={`mb-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary ${focusRing}`}
          >
            <Play aria-hidden className="h-[16px] w-[16px]" strokeWidth={2} />
            Guardar este momento
          </button>
        )}
        <label htmlFor="nota-nueva" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="nota-nueva"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder=""
          className={`w-full resize-none rounded-[10px] border border-border bg-card p-3 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground ${focusRing}`}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!texto.trim() || enviando}
          className={`mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-secondary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground ${focusRing}`}
        >
          <NotebookPen aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Agregar nota
        </button>
        {error && <p className="mt-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      </div>

      {/* Filtros por tipo */}
      {notas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
          {FILTROS.map((f) => {
            const on = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition-colors ${focusRing} ${
                  on
                    ? 'bg-sidebar text-sidebar-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.etiqueta}
                <span className={`${mono} ${on ? 'opacity-80' : 'text-muted-foreground'}`}>{f.n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid compacto de notas */}
      {visibles.length > 0 ? (
        <div className="max-h-[420px] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {visibles.map((n) => {
              const Icono = ICONO[n.tipo];
              const seg = esAnclaVideo(n.ancla) ? n.ancla.segundos : null;
              const abierto = abierta === n.id;
              const cita = n.tipo === 'texto_seleccionado' || n.tipo === 'subrayado';

              if (!abierto) {
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => abrir(n)}
                    title={preview(n)}
                    className={`flex min-h-[54px] flex-col gap-1 rounded-[10px] border border-border bg-muted/40 p-2.5 text-left transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icono aria-hidden className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={1.75} />
                      {seg != null && (
                        <span className={`${mono} text-[10.5px] font-bold text-secondary`}>{reloj(seg)}</span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11.5px] leading-snug text-foreground-soft">
                      {preview(n)}
                    </span>
                  </button>
                );
              }

              // ── Nota EXPANDIDA (ocupa el ancho) ──
              return (
                <div
                  key={n.id}
                  className="col-span-2 rounded-[10px] border border-secondary/40 bg-card p-3 shadow-rest"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icono aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
                    {seg != null && (
                      <button
                        type="button"
                        onClick={() => onSaltar?.(seg)}
                        className={`${mono} inline-flex h-6 items-center gap-1 rounded-[6px] bg-accent px-1.5 text-[11px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground ${focusRing}`}
                      >
                        <Play className="h-3 w-3" strokeWidth={2.4} />
                        {reloj(seg)}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={() => setAbierta(null)}
                      className={`ml-auto grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted ${focusRing}`}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>

                  {cita && esAnclaTexto(n.ancla) && (
                    <p className="mb-2 border-l-2 border-[color:var(--primary)] pl-2 text-[12.5px] italic leading-snug text-foreground-soft">
                      “{n.ancla.texto}”
                    </p>
                  )}

                  {editando ? (
                    <div>
                      <textarea
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        rows={3}
                        className={`w-full resize-none rounded-[8px] border border-border bg-card p-2 text-[13px] leading-snug text-foreground ${focusRing}`}
                      />
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => guardarEdicion(n.id)}
                          className={`inline-flex h-8 items-center gap-1 rounded-[8px] bg-primary px-2.5 text-[12px] font-bold text-primary-foreground ${focusRing}`}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(false)}
                          className={`inline-flex h-8 items-center rounded-[8px] border border-border px-2.5 text-[12px] font-semibold text-muted-foreground ${focusRing}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {n.contenido ? (
                        <p className="text-[13px] leading-snug text-[color:var(--foreground-soft)]">{n.contenido}</p>
                      ) : (
                        !cita && <p className="text-[13px] italic leading-snug text-muted-foreground">Nota sin texto</p>
                      )}

                      <div className="mt-2.5 flex items-center gap-1.5">
                        {n.tipo === 'subrayado' && onIrASubrayado && (
                          <button
                            type="button"
                            onClick={() => onIrASubrayado(n)}
                            className={`inline-flex h-8 items-center gap-1 rounded-[8px] bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground ${focusRing}`}
                          >
                            <Highlighter className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Ir al texto
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Editar nota"
                          onClick={() => {
                            setEditando(true);
                            setEditTexto(n.contenido);
                          }}
                          className={`ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-secondary ${focusRing}`}
                        >
                          <Pencil className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          aria-label="Borrar nota"
                          onClick={() => {
                            void onBorrar(n.id);
                            setAbierta(null);
                          }}
                          className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-[color:var(--destructive)] ${focusRing}`}
                        >
                          <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-5 text-[12.5px] text-muted-foreground">
          <X aria-hidden className="h-4 w-4 shrink-0 opacity-50" strokeWidth={1.75} />
          {notas.length === 0 ? 'Aún no tienes notas en esta lección.' : 'Sin notas de este tipo.'}
        </div>
      )}
    </section>
  );
}

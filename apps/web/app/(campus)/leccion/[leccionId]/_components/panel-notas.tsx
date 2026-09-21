'use client';

/**
 * Panel de NOTAS del alumno (§5A · mock leccion-lectura · "Sus notas"). Vive en el
 * rail derecho de la lección (debajo del menú del curso) y, en la lección de video,
 * debajo del reproductor. Lista las notas de la lección (cita de texto, nota libre,
 * subrayado y marcador de video), con composer para escribir una nota, y editar/
 * borrar. En video, un botón guarda el momento actual y cada marcador salta al punto.
 */

import { useState } from 'react';
import { Highlighter, NotebookPen, Pencil, Play, Quote, Trash2, X } from 'lucide-react';
import { mono, focusRing } from '@/components/tokens';
import type { Nota } from '@/lib/campus/notas-contrato';
import { esAnclaVideo } from '@/lib/campus/notas-contrato';

function reloj(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, '0')}`;
}

const ICONO_TIPO = {
  texto_seleccionado: Quote,
  nota_libre: NotebookPen,
  subrayado: Highlighter,
  marcador_video: Play,
} as const;

export function PanelNotas({
  notas,
  error,
  onAgregarLibre,
  onEditar,
  onBorrar,
  onGuardarMomento,
  onSaltar,
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
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');

  const agregar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    await onAgregarLibre(texto.trim());
    setTexto('');
    setEnviando(false);
  };

  const guardarEdicion = async (id: string) => {
    if (!editTexto.trim()) return;
    const ok = await onEditar(id, editTexto.trim());
    if (ok) setEditId(null);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="flex items-center gap-2 border-b border-border p-5">
        <NotebookPen aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
        <h2 className="text-[14.5px] font-bold">Mis notas</h2>
        <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>{notas.length}</span>
      </div>

      <div className="p-4">
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

        {/* Composer de nota libre */}
        <label htmlFor="nota-nueva" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="nota-nueva"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Escribe lo que quieras recordar…"
          className={`w-full resize-none rounded-[10px] border border-border bg-card p-3 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground ${focusRing}`}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!texto.trim() || enviando}
          className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground ${focusRing}`}
        >
          <NotebookPen aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Agregar nota
        </button>

        {error && <p className="mt-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      </div>

      {notas.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {notas.map((n) => {
            const Icono = ICONO_TIPO[n.tipo];
            const seg = esAnclaVideo(n.ancla) ? n.ancla.segundos : null;
            const cita = n.tipo === 'texto_seleccionado' || n.tipo === 'subrayado';
            const editando = editId === n.id;
            return (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  {seg != null ? (
                    <button
                      type="button"
                      onClick={() => onSaltar?.(seg)}
                      className={`${mono} inline-flex h-6 shrink-0 items-center rounded-[6px] bg-accent px-1.5 text-[11.5px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground ${focusRing}`}
                      title="Saltar a este momento"
                    >
                      {reloj(seg)}
                    </button>
                  ) : (
                    <Icono aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  )}

                  <div className="min-w-0 flex-1">
                    {editando ? (
                      <div>
                        <textarea
                          value={editTexto}
                          onChange={(e) => setEditTexto(e.target.value)}
                          rows={2}
                          className={`w-full resize-none rounded-[8px] border border-border bg-card p-2 text-[13px] leading-snug text-foreground ${focusRing}`}
                        />
                        <div className="mt-1.5 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => guardarEdicion(n.id)}
                            className={`inline-flex h-8 items-center rounded-[8px] bg-primary px-2.5 text-[12px] font-bold text-primary-foreground ${focusRing}`}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className={`inline-flex h-8 items-center rounded-[8px] border border-border px-2.5 text-[12px] font-semibold text-muted-foreground ${focusRing}`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {cita && n.ancla && 'texto' in n.ancla && (
                          <p className="border-l-2 border-[color:var(--primary)] pl-2 text-[12.5px] italic leading-snug text-foreground-soft">
                            “{n.ancla.texto}”
                          </p>
                        )}
                        {n.contenido && (
                          <p className={`text-[13px] leading-snug text-[color:var(--foreground-soft)] ${cita ? 'mt-1' : ''}`}>
                            {n.contenido}
                          </p>
                        )}
                        {!n.contenido && !cita && (
                          <p className="text-[13px] italic leading-snug text-muted-foreground">Nota sin texto</p>
                        )}
                      </>
                    )}
                  </div>

                  {!editando && (
                    <div className="flex shrink-0 gap-0.5">
                      {(n.tipo === 'nota_libre' || n.tipo === 'marcador_video' || n.contenido) && (
                        <button
                          type="button"
                          aria-label="Editar nota"
                          onClick={() => {
                            setEditId(n.id);
                            setEditTexto(n.contenido);
                          }}
                          className={`grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-secondary ${focusRing}`}
                        >
                          <Pencil className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Borrar nota"
                        onClick={() => onBorrar(n.id)}
                        className={`grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-[color:var(--destructive)] ${focusRing}`}
                      >
                        <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {notas.length === 0 && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-4 text-[12.5px] text-muted-foreground">
          <X aria-hidden className="h-4 w-4 shrink-0 opacity-50" strokeWidth={1.75} />
          Aún no tienes notas en esta lección.
        </div>
      )}
    </section>
  );
}

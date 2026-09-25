'use client';

/**
 * Clases pasadas: cada una con su grabación (miniatura reproducible), grupo, fecha,
 * asistencia y si quedó ligada a la lección / videoteca del grupo. Ligar abre un
 * selector inline de lecciones del grupo; al confirmar, la grabación cae en la videoteca
 * del grupo (la del alumno). Filtro por grupo.
 */

import { useState } from 'react';
import { BookCopy, Check, Play, Users, X } from 'lucide-react';
import { mono, kicker, softText, card, focusRing, rayas, ChipTipo } from './ui';
import type { Grabacion, LeccionOpcion } from './tipos';

export type GrabacionesProps = {
  gruposFiltro: string[];
  totalGrabaciones: number;
  filtroGrupo: string;
  setFiltroGrupo: (g: string) => void;
  onVerGrabacion: (id: string) => void;
  onLigar: (grabacionId: string, leccionId: string) => void;
  leccionesPorGrupo: Record<string, LeccionOpcion[]>;
  visibles: Grabacion[];
};

export function Grabaciones({
  gruposFiltro,
  totalGrabaciones,
  filtroGrupo,
  setFiltroGrupo,
  onVerGrabacion,
  onLigar,
  leccionesPorGrupo,
  visibles,
}: GrabacionesProps) {
  // Grabación cuyo selector de lección está abierto (y la lección elegida).
  const [ligando, setLigando] = useState<string | null>(null);
  const [leccionSel, setLeccionSel] = useState('');

  const abrirLigar = (g: Grabacion) => {
    setLigando(g.id);
    setLeccionSel('');
  };
  const confirmarLigar = (g: Grabacion) => {
    if (!leccionSel) return;
    onLigar(g.id, leccionSel);
    setLigando(null);
  };

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={`${kicker} text-muted-foreground`}>Clases pasadas y grabaciones</h2>
        <span className={`${mono} text-[11.5px] text-muted-foreground`}>
          {totalGrabaciones} sesiones este ciclo
        </span>
        <div className="ml-auto flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {gruposFiltro.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setFiltroGrupo(g)}
              aria-pressed={filtroGrupo === g}
              className={`h-[30px] whitespace-nowrap rounded-full px-3 text-[11.5px] font-semibold transition-colors ${focusRing} ${
                filtroGrupo === g
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className={`${card} mt-3 px-6 py-10 text-center text-[13px] ${softText}`}>
          Aún no hay grabaciones de sus clases.
        </div>
      ) : (
        <ul className="mt-3 grid gap-3.5 lg:grid-cols-2">
          {visibles.map((g) => {
            const lecciones = leccionesPorGrupo[g.grupoId] ?? [];
            return (
              <li key={g.id}>
                <article className={`${card} flex gap-4 rounded-xl p-3.5 transition-colors hover:border-primary`}>
                  <button
                    type="button"
                    onClick={() => onVerGrabacion(g.id)}
                    aria-label={`Ver la grabación de ${g.tema}`}
                    className={`relative grid w-[188px] shrink-0 place-items-center overflow-hidden rounded-[10px] p-0 ${focusRing}`}
                    style={{ aspectRatio: '16 / 9', background: 'var(--sidebar)' }}
                  >
                    <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                    <span
                      aria-hidden
                      className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                    >
                      <Play className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span
                      className={`${mono} absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white`}
                      style={{ background: 'rgba(15,45,82,.82)' }}
                    >
                      {g.duracion}
                    </span>
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChipTipo tipo={g.tipo} chico />
                      <span className={`${mono} text-[11px] text-muted-foreground`}>{g.fecha}</span>
                    </div>
                    <p className="mt-2 text-[14px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>
                      {g.tema}
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">{g.grupo}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold ${softText}`}
                      >
                        <Users aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                        <span className={`${mono} font-bold text-foreground`}>
                          {g.asistieron ?? '—'}/{g.total ?? '—'}
                        </span>
                        asistieron
                      </span>
                      {g.ligada ? (
                        <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
                          En la videoteca del grupo
                        </span>
                      ) : ligando === g.id ? null : (
                        <button
                          type="button"
                          onClick={() => abrirLigar(g)}
                          className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                        >
                          <BookCopy aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                          Ligarla a una lección
                        </button>
                      )}
                    </div>

                    {/* Selector inline de lección (aparece al pulsar "Ligarla") */}
                    {ligando === g.id && !g.ligada && (
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <select
                          value={leccionSel}
                          onChange={(e) => setLeccionSel(e.target.value)}
                          aria-label="Lección a la que ligar la grabación"
                          className={`h-9 min-w-0 flex-1 rounded-[9px] border border-border bg-card px-2.5 text-[12px] text-foreground ${focusRing}`}
                        >
                          <option value="">Elige una lección…</option>
                          {lecciones.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => confirmarLigar(g)}
                          disabled={!leccionSel}
                          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-primary px-3 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
                        >
                          <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                          Ligar
                        </button>
                        <button
                          type="button"
                          onClick={() => setLigando(null)}
                          aria-label="Cancelar"
                          className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                        >
                          <X aria-hidden className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    )}

                    <div className="mt-auto flex items-center gap-1.5 pt-3">
                      <button
                        type="button"
                        onClick={() => onVerGrabacion(g.id)}
                        className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-accent px-3.5 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                      >
                        <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Ver grabación
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Las grabaciones llegan solas de Zoom, unos 20 minutos después de terminar, y se ligan a la
        lección de la clase. Las sesiones de MiCo+ se graban en el equipo y se suben cuando el
        técnico las libera.
      </p>
    </section>
  );
}

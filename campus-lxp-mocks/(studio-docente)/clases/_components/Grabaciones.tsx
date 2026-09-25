"use client";

/**
 * Clases pasadas: cada una con su grabación (miniatura reproducible), grupo, fecha, asistencia y
 * si quedó ligada a la lección / videoteca del grupo. Filtro por grupo.
 */

import {
  BookCopy,
  Check,
  Play,
  Users,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, ChipTipo } from "./ui";
import type { Grabacion } from "./tipos";

export type GrabacionesProps = {
  grabaciones: Grabacion[];
  gruposFiltro: string[];
  totalGrabaciones: number;
  filtroGrupo: string;
  setFiltroGrupo: (g: string) => void;
  onVerGrabacion: (id: string) => void;
  onVerAsistencia: (id: string) => void;
  onLigarLeccion: (id: string) => void;
  visibles: Grabacion[];
};

export function Grabaciones({ grabaciones, gruposFiltro, totalGrabaciones, filtroGrupo, setFiltroGrupo, onVerGrabacion, onVerAsistencia, onLigarLeccion, visibles }: GrabacionesProps) {
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
                        ? "bg-sidebar text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3 grid gap-3.5 lg:grid-cols-2">
              {visibles.map((g) => (
                <li key={g.id}>
                  <article className={`${card} flex gap-4 rounded-xl p-3.5 transition-colors hover:border-primary`}>
                    <button
                      type="button"
                      onClick={() => onVerGrabacion(g.id)}
                      aria-label={`Ver la grabación de ${g.tema}`}
                      className={`relative grid w-[188px] shrink-0 place-items-center overflow-hidden rounded-[10px] p-0 ${focusRing}`}
                      style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
                    >
                      {g.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.poster} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                      )}
                      <span
                        aria-hidden
                        className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                      >
                        <Play className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span
                        className={`${mono} absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white`}
                        style={{ background: "rgba(15,45,82,.82)" }}
                      >
                        {g.duracion}
                      </span>
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChipTipo tipo={g.tipo} chico />
                        <span className={`${mono} text-[11px] text-muted-foreground`}>{g.fecha}</span>
                      </div>
                      <p className="mt-2 text-[14px] font-bold leading-snug" style={{ textWrap: "pretty" }}>
                        {g.tema}
                      </p>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">{g.grupo}</p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold ${softText}`}
                        >
                          <Users aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                          <span className={`${mono} font-bold text-foreground`}>
                            {g.asistieron}/{g.total}
                          </span>
                          asistieron
                        </span>
                        {g.ligada ? (
                          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                            <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
                            En la videoteca del grupo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onLigarLeccion(g.id)}
                            className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                          >
                            <BookCopy aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                            Ligarla a una lección
                          </button>
                        )}
                      </div>

                      <div className="mt-auto flex items-center gap-1.5 pt-3">
                        <button
                          type="button"
                          onClick={() => onVerGrabacion(g.id)}
                          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-accent px-3.5 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                        >
                          <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Ver grabación
                        </button>
                        <button
                          type="button"
                          onClick={() => onVerAsistencia(g.id)}
                          className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                        >
                          Lista de asistencia
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Las grabaciones llegan solas de Zoom, unos 20 minutos después de terminar, y se ligan a
              la lección de la clase. Las sesiones de MiCo+ se graban en el equipo y se suben cuando el
              técnico las libera.
            </p>
          </section>
  );
}

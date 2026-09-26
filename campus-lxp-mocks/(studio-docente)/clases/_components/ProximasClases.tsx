"use client";

/**
 * Agenda de sus próximas sesiones: fecha, hora, grupo, tema o lección ligada, tipo y duración.
 * Editar cada una; el chip distingue clase Zoom de sesión de ultrasonido en vivo MiCo+.
 */

import {
  Calendar,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, ChipTipo } from "./ui";
import type { ClaseProgramada } from "./tipos";

export type ProximasClasesProps = {
  clases: ClaseProgramada[];
  onAbrirMiCo: (id: string) => void;
  onEditarClase: (id: string) => void;
  proximas: ClaseProgramada[];
};

export function ProximasClases({ clases, onAbrirMiCo, onEditarClase, proximas }: ProximasClasesProps) {
  return (
    <section className={`${card} mt-5 overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-3 px-[18px] py-3.5">
              <h2 className={`${kicker} text-muted-foreground`}>Próximas clases</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {proximas.length} programadas
              </span>
              <button
                type="button"
                className={`ml-auto inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Calendar aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Ver en calendario
              </button>
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted px-[18px] py-2.5">
              {(
                [
                  ["Cuándo", "shrink-0 w-[92px]"],
                  ["Tipo", "shrink-0 w-[132px]"],
                  ["Tema y grupo", "min-w-0 flex-[1.4]"],
                  ["Alumnos", "shrink-0 w-[96px]"],
                  ["Dura", "shrink-0 w-[66px]"],
                  ["", "shrink-0 w-[150px]"],
                ] as const
              ).map(([t, cls]) => (
                <span
                  key={t || "acc"}
                  className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
                >
                  {t}
                </span>
              ))}
            </div>

            {proximas.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted"
              >
                <span className="w-[92px] shrink-0">
                  <span className="block text-[12px] font-bold">{c.dia}</span>
                  <span className={`${mono} mt-0.5 block text-[13px] font-bold text-muted-foreground`}>
                    {c.hora}
                  </span>
                </span>
                <span className="w-[132px] shrink-0">
                  <ChipTipo tipo={c.tipo} chico />
                </span>
                <span className="min-w-0 flex-[1.4]">
                  <span className="block truncate text-[13.5px] font-bold leading-snug">{c.tema}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {c.grupo} · {c.leccion ? `ligada a ${c.leccion}` : "sin lección ligada"}
                  </span>
                </span>
                <span className={`inline-flex w-[96px] shrink-0 items-center gap-1.5 text-[12px] font-semibold ${softText}`}>
                  <Users aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span className={`${mono} font-bold text-foreground`}>{c.alumnos}</span>
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-[11.5px] text-muted-foreground`}>
                  {c.duracion}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => (c.tipo === "zoom" ? onEditarClase(c.id) : onAbrirMiCo(c.id))}
                    className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    {c.tipo === "zoom" ? "Ver detalles" : "Abrir sesión"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Más acciones de ${c.tema}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                  </button>
                </span>
              </div>
            ))}
          </section>
  );
}

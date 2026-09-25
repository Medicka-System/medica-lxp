"use client";

/**
 * Lista de SUS grupos: cabecera con totales, filtro (todos · con riesgo · al día) y una card por
 * grupo con avance, entregas pendientes, próxima clase y cuántos alumnos requieren atención.
 */

import {
  ChevronRight,
  Check,
  TriangleAlert,
} from "lucide-react";
import { mono, softText, focusRing, ESTADO, EcoMark } from "./ui";
import type { GrupoDocente, GruposData } from "./tipos";

export type ListaGruposProps = {
  grupos: GrupoDocente[];
  eco: GruposData["eco"];
  filtroGrupos: "todos" | "riesgo" | "al-dia";
  setFiltroGrupos: (v: "todos" | "riesgo" | "al-dia") => void;
  onAbrirGrupo: (id: string) => void;
  onFiltrar: (f: string) => void;
  grupoAbierto: GrupoDocente;
  totalAlumnos: number;
  totalRiesgo: number;
  gruposVisibles: GrupoDocente[];
};

export function ListaGrupos({ grupos, eco, filtroGrupos, setFiltroGrupos, onAbrirGrupo, onFiltrar, grupoAbierto, totalAlumnos, totalRiesgo, gruposVisibles }: ListaGruposProps) {
  return (
    <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mis grupos</h1>
            <span className={`${mono} text-[12px] text-muted-foreground`}>
              {grupos.length} grupos · {totalAlumnos} alumnos · {totalRiesgo} requieren intervención
            </span>
            <div className="ml-auto flex gap-1 rounded-full border border-border bg-card p-[3px]">
              {(
                [
                  ["todos", "Todos"],
                  ["riesgo", "Con alumnos en riesgo"],
                  ["al-dia", "Al día"],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFiltroGrupos(id);
                    onFiltrar(id);
                  }}
                  aria-pressed={filtroGrupos === id}
                  className={`h-[34px] whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                    filtroGrupos === id
                      ? "bg-sidebar text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Eco cruza los tres grupos antes de que el docente entre */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-[18px] py-3.5">
            <EcoMark size={30} invertido />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              <span className="font-bold">Eco revisó sus tres grupos:</span> {eco.resumenGlobal}
            </p>
            <button
              type="button"
              onClick={() => onAbrirGrupo(grupoAbierto.id)}
              className={`h-[38px] shrink-0 whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-sidebar ${focusRing}`}
            >
              Ver el {grupoAbierto.nombre.split(" · ")[0]}
            </button>
          </div>

          <ul className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {gruposVisibles.map((g) => {
              const est = ESTADO[g.estado];
              return (
                <li key={g.id}>
                  <article
                    className={`flex h-full flex-col rounded-[14px] border bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
                      est.atencion ? "border-[color:var(--warning-border)]" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`${mono} grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-sidebar text-[12px] font-bold text-sidebar-foreground`}
                      >
                        {g.nombre.split(" ")[1]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-bold leading-tight">{g.nombre}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {g.programa} · {g.modalidad}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                          est.atencion
                            ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {est.atencion ? (
                          <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                        ) : (
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                        )}
                        {est.texto}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>
                          {g.alumnos}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground">alumnos</span>
                      </span>
                      <span aria-hidden className="h-[26px] w-px bg-border" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>
                            {g.avance}%
                          </span>
                          <span className="text-[11.5px] text-muted-foreground">avance del grupo</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${g.avance}%` }}
                          />
                        </span>
                      </span>
                    </div>

                    {/* a quién atender: el silencio también se declara */}
                    <div
                      className={`mt-4 flex-1 rounded-[11px] px-3.5 py-3 ${
                        g.enRiesgo
                          ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {g.enRiesgo ? (
                          <TriangleAlert
                            aria-hidden
                            className="h-[15px] w-[15px] shrink-0 text-[color:var(--warning-foreground)]"
                            strokeWidth={2}
                          />
                        ) : (
                          <Check
                            aria-hidden
                            className="h-[15px] w-[15px] shrink-0 text-secondary"
                            strokeWidth={2.4}
                          />
                        )}
                        <p
                          className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${
                            g.enRiesgo ? "text-[color:var(--warning-foreground)]" : softText
                          }`}
                        >
                          {g.enRiesgo ? (
                            <>
                              <span className="font-bold">
                                {g.enRiesgo} alumnos necesitan intervención
                              </span>
                              <br />
                              {g.resumenRiesgo}
                            </>
                          ) : (
                            <>Nadie requiere intervención. {g.resumenRiesgo}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2.5">
                      <span className={`${mono} min-w-0 flex-1 text-[11px] text-muted-foreground`}>
                        {g.inicio} · cursando {g.moduloEnCurso.split(" · ")[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAbrirGrupo(g.id)}
                        className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-[13.5px] font-bold transition-colors ${focusRing} ${
                          g.enRiesgo
                            ? "bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                            : "bg-accent text-accent-foreground hover:bg-[color:var(--track)]"
                        }`}
                      >
                        Ver el grupo
                        <ChevronRight aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
  );
}

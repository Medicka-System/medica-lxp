"use client";

/**
 * Las nueve áreas agrupadas por lo que gobiernan (Personas y acceso · Inteligencia y conexiones ·
 * Academia y marca). Cada ficha: número, nombre, descripción, piezas y el dato que importa hoy.
 */

import {
  ChevronRight,
} from "lucide-react";
import { mono, softText, focusRing, ICONOS, TONO_CHIP, TONO_PUNTO } from "./ui";
import type { AreaId, GrupoAreas } from "./tipos";

export type GruposAreasProps = {
  onAbrirArea: (id: AreaId) => void;
  gruposFiltrados: GrupoAreas[];
};

export function GruposAreas({ onAbrirArea, gruposFiltrados }: GruposAreasProps) {
  return (
    <>
      {/* ══ las nueve áreas, agrupadas por lo que gobiernan ══ */}
      <div className="mt-6 flex flex-col gap-6">
        {gruposFiltrados.map((g) => (
          <section key={g.rotulo}>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{g.rotulo}</h2>
              <span className="text-[11.5px] text-muted-foreground">{g.nota}</span>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>

            <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.areas.map((a) => {
                const Icono = ICONOS[a.icono];
                const caida = a.tono === "down";
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirArea(a.id)}
                      className={`flex h-full w-full flex-col rounded-xl border p-[18px] text-left shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${focusRing} ${
                        caida ? "border-[color:var(--destructive-border)] bg-card" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] ${
                            caida
                              ? "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]"
                              : a.tono === "info"
                                ? "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                                : "bg-accent text-accent-foreground"
                          }`}
                        >
                          <Icono className="h-[19px] w-[19px]" strokeWidth={1.75} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`${mono} text-[10px] text-muted-foreground`}>
                              {a.numero}
                            </span>
                            <span className="text-[14.5px] font-bold leading-tight">{a.titulo}</span>
                            {a.estado && (
                              <span
                                className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${TONO_CHIP[a.tono]}`}
                              >
                                {(a.tono === "down" || a.tono === "warn") && (
                                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                                {a.estado}
                              </span>
                            )}
                          </span>
                          <span
                            className={`mt-1.5 block text-[12.5px] leading-relaxed ${softText}`}
                            style={{ textWrap: "pretty" }}
                          >
                            {a.descripcion}
                          </span>
                        </span>

                        <ChevronRight
                          aria-hidden
                          className="mt-2 h-[17px] w-[17px] shrink-0 text-[color:var(--track)]"
                          strokeWidth={2}
                        />
                      </div>

                      {/* qué hay dentro */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {a.dentro.map((d) => (
                          <span
                            key={d}
                            className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-medium ${softText}`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* el dato que importa hoy */}
                      {a.pie && (
                        <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
                          {a.pie.tipo === "barra" && (
                            <>
                              <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                                <span
                                  aria-hidden
                                  className={`block h-full rounded-full ${
                                    a.pie.color === "info" ? "bg-[color:var(--info)]" : "bg-primary"
                                  }`}
                                  style={{ width: `${a.pie.pct}%` }}
                                />
                              </span>
                              <span
                                className={`${mono} shrink-0 text-[11px] font-bold ${
                                  a.pie.color === "info"
                                    ? "text-[color:var(--info-foreground)]"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "semaforo" && (
                            <>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {a.pie.estados.map((e, i) => (
                                  <span
                                    key={i}
                                    aria-hidden
                                    className={`h-[9px] w-[9px] rounded-full ${TONO_PUNTO[e]}`}
                                  />
                                ))}
                              </span>
                              <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "paleta" && (
                            <>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {a.pie.colores.map((c) => (
                                  <span
                                    key={c}
                                    aria-hidden
                                    className="h-3.5 w-3.5 rounded-[5px] border border-[rgba(17,24,39,0.1)]"
                                    style={{ background: c }}
                                  />
                                ))}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "texto" && (
                            <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                              {a.pie.texto}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

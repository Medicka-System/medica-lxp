"use client";

/**
 * Columna 1 · las consultas de sus alumnos: buscador, filtro Sin responder / Todas y por grupo.
 * Cada fila: avatar, nombre, grupo, módulo en curso, extracto, hora y estado. Lo no respondido va
 * en ámbar (chip + fondo cálido); lo respondido con palomita teal.
 */

import {
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { mono, kicker, softText, focusRing, Avatar } from "./ui";
import type { Conversacion } from "./tipos";

export type ListaConsultasProps = {
  sinResponder: number;
  activaId: string;
  filtro: "sin-responder" | "todas";
  setFiltro: (f: "sin-responder" | "todas") => void;
  busca: string;
  setBusca: (v: string) => void;
  onAbrirConversacion: (id: string) => void;
  onFiltrar: (f: string) => void;
  visibles: Conversacion[];
};

export function ListaConsultas({ sinResponder, activaId, filtro, setFiltro, busca, setBusca, onAbrirConversacion, onFiltrar, visibles }: ListaConsultasProps) {
  return (
    <aside className="flex w-[330px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="shrink-0 border-b border-border p-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className={`${kicker} text-muted-foreground`}>Consultas</h2>
            {sinResponder > 0 && (
              <span className="inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-[7px] text-[10px] font-bold text-[color:var(--warning-foreground)]">
                {sinResponder} sin responder
              </span>
            )}
          </div>

          <label className="mt-2.5 flex h-[38px] items-center gap-2 rounded-[9px] border border-border bg-muted px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno o tema</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno o tema…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-2.5 flex gap-1.5">
            {(
              [
                ["sin-responder", "Sin responder"],
                ["todas", "Todas"],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFiltro(id);
                  onFiltrar(id);
                }}
                aria-pressed={filtro === id}
                className={`h-8 flex-1 rounded-lg text-[11.5px] font-semibold transition-colors ${focusRing} ${
                  filtro === id
                    ? "bg-sidebar text-sidebar-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {etiqueta}
              </button>
            ))}
            <button
              type="button"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold ${softText} ${focusRing}`}
            >
              Grupo
              <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibles.map((c) => {
            const on = c.id === activaId;
            const sin = c.estado === "sin-responder";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onAbrirConversacion(c.id)}
                aria-current={on ? "true" : undefined}
                className={`flex w-full gap-3 border-b border-l-[3px] border-b-border px-3.5 py-3.5 text-left transition-colors ${focusRing} ${
                  on
                    ? "border-l-primary bg-accent"
                    : `border-l-transparent hover:bg-muted ${sin ? "bg-[#fffdf7]" : ""}`
                }`}
              >
                <Avatar ini={c.alumno.ini} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-snug">
                      {c.alumno.nombre}
                    </span>
                    <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>
                      {c.hora}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-1.5 text-[9.5px] font-semibold ${softText}`}
                    >
                      {c.alumno.grupo.split(" · ")[0]}
                    </span>
                    <span className={`${mono} text-[9.5px] text-muted-foreground`}>
                      {c.alumno.moduloEnCurso}
                    </span>
                    {sin ? (
                      <span className="ml-auto inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                        Sin responder
                      </span>
                    ) : (
                      <Check aria-hidden className="ml-auto h-3.5 w-3.5 text-secondary" strokeWidth={2.6} />
                    )}
                  </span>
                  <span
                    className={`mt-1.5 line-clamp-2 block text-[12px] leading-snug ${softText} ${
                      sin ? "font-medium" : ""
                    }`}
                  >
                    {c.ultimoMensaje}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
  );
}

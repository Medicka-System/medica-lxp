"use client";

/**
 * Vista por grupo / actividad: selector de grupo y actividad, resumen (entregas, auto-calificadas,
 * pendientes de confirmar, promedio, sin entregar), lista por alumno con su estado y
 * "confirmar en lote" para lo que Eco pre-calificó con alta confianza.
 */

import {
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { mono, kicker, card, focusRing, ChipEstado, Avatar, Selector } from "./ui";
import type { Entrega, Actividad, EntregasData } from "./tipos";

export type VistaActividadProps = {
  grupo: string;
  actividad: Actividad;
  resumen: EntregasData["resumen"];
  entregas: Entrega[];
  sinEntregar: EntregasData["sinEntregar"];
  altaConfianza: number;
  busca: string;
  setBusca: (v: string) => void;
  soloAbiertas: boolean;
  setSoloAbiertas: (v: boolean | ((x: boolean) => boolean)) => void;
  onAbrirEntrega: (id: string) => void;
  onConfirmarLote: () => void;
  onElegirActividad: (id: string) => void;
  onRecordar: () => void;
  visibles: Entrega[];
};
export function VistaActividad({ grupo, actividad, resumen, entregas, sinEntregar, altaConfianza, busca, setBusca, soloAbiertas, setSoloAbiertas, onAbrirEntrega, onConfirmarLote, onElegirActividad, onRecordar, visibles }: VistaActividadProps) {
  return (<div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Selector rotulo="Grupo" valor={grupo} />
          <button
            type="button"
            onClick={() => onElegirActividad(actividad.id)}
            className={`inline-flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left transition-colors hover:border-primary ${focusRing}`}
          >
            <span className="flex min-w-0 flex-col leading-tight">
              <span className={`${kicker} text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
                Actividad
              </span>
              <span className="mt-0.5 whitespace-nowrap text-[12.5px] font-bold">
                {actividad.clave} · {actividad.titulo}
              </span>
            </span>
            <ChevronDown aria-hidden className="ml-auto h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
          </button>
          <label className="flex h-10 w-[220px] items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            onClick={onConfirmarLote}
            className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            Confirmar {altaConfianza} de alta confianza
          </button>
        </div>

        {/* resumen de la actividad */}
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          {(
            [
              ["Entregadas", `${resumen.entregadas} / ${resumen.delGrupo}`, `de ${resumen.delGrupo} alumnos del grupo`, "plano"],
              ["Auto-calificadas", String(resumen.autoCalificadas), "autoevaluaciones · listas", "ok"],
              ["Por confirmar", String(resumen.porConfirmar), "tareas abiertas con nota sugerida", "warn"],
              ["Promedio del grupo", resumen.promedio.toFixed(1), "sobre lo ya calificado", "plano"],
              ["Sin entregar", String(resumen.sinEntregar), resumen.vencio, "warn"],
            ] as const
          ).map(([rot, val, sub, tono]) => (
            <div
              key={rot}
              className={`min-w-[170px] flex-1 rounded-[11px] px-4 py-3.5 ${
                tono === "ok"
                  ? "bg-accent"
                  : tono === "warn"
                    ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border border-border bg-muted"
              }`}
            >
              <p
                className={`${kicker} text-[9.5px] tracking-[0.12em] ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-muted-foreground"
                }`}
              >
                {rot}
              </p>
              <p
                className={`${mono} mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.02em] ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-foreground"
                }`}
              >
                {val}
              </p>
              <p
                className={`mt-1 text-[11px] leading-snug ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-muted-foreground"
                }`}
              >
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* la regla del reparto, dicha una vez */}
        <div className="mt-4 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
          <Sparkles
            aria-hidden
            className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]"
            strokeWidth={1.75}
          />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
            <span className="font-bold">Las autoevaluaciones se califican solas</span> (opción
            múltiple, sin Eco) y las tareas abiertas ya traen nota sugerida contra la rúbrica. Eco
            propone; usted confirma — ninguna nota se asienta sola.
          </p>
        </div>

        {/* lista de entregas */}
        <section className={`${card} mt-4 overflow-hidden`}>
          <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <h2 className={`${kicker} text-muted-foreground`}>Entregas</h2>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              {resumen.entregadas} · ordenadas por lo que requiere su lectura
            </span>
            <button
              type="button"
              onClick={() => setSoloAbiertas((v) => !v)}
              aria-pressed={soloAbiertas}
              className={`ml-auto h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Solo abiertas
            </button>
          </div>

          {visibles.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onAbrirEntrega(e.id)}
              className={`flex w-full items-center gap-3.5 border-t border-border px-[18px] py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
            >
              <Avatar ini={e.alumno.ini} />
              <span className="min-w-0 flex-[1.3]">
                <span className="block text-[13.5px] font-bold leading-snug">{e.alumno.nombre}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                  {e.tipo === "abierta" ? "Tarea abierta" : "Autoevaluación"} · entregó {e.entregadaHace}
                </span>
              </span>
              <span className="w-[170px] shrink-0">
                <ChipEstado estado={e.estado} />
              </span>
              <span
                className={`min-w-0 flex-1 text-[11.5px] leading-snug ${
                  e.estado === "requiere-lectura"
                    ? "text-[color:var(--warning-foreground)]"
                    : "text-muted-foreground"
                }`}
              >
                {e.detalleCorto}
              </span>
              <span
                className={`${mono} w-16 shrink-0 text-right text-[17px] font-extrabold ${
                  e.nota === null ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {e.nota === null ? "—" : e.nota.toFixed(e.nota % 1 ? 1 : 0)}
              </span>
              <ChevronRight
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          ))}

          {/* quién no entregó */}
          <div className="flex flex-wrap items-center gap-3.5 border-t border-border bg-[color:var(--warning-surface)] px-[18px] py-3.5">
            <span
              aria-hidden
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
            >
              <TriangleAlert className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              <span className="font-bold">{sinEntregar.length} alumnos no han entregado</span> —{" "}
              {resumen.vencio}: {sinEntregar.map((a) => a.nombre).join(", ")}.
            </p>
            <button
              type="button"
              onClick={onRecordar}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
            >
              <BellRing aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              Recordarles
            </button>
          </div>
        </section>
      </div>
  );
}

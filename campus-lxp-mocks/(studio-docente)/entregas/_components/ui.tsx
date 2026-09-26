"use client";

/** Estilos y piezas visuales compartidas de Entregas. */

import {
  Check,
  ChevronDown,
  Clock,
  MonitorCheck,
  Sparkles,
} from "lucide-react";
import type { EstadoEntrega } from "./tipos";


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export const ESTADO: Record<EstadoEntrega, { texto: string; clase: string; icono?: typeof Check }> = {
  auto: { texto: "Auto-calificada", clase: "bg-accent text-accent-foreground", icono: MonitorCheck },
  sugerida: {
    texto: "Nota sugerida",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: Sparkles,
  },
  "requiere-lectura": {
    texto: "Requiere lectura",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    icono: Clock,
  },
  "sin-entregar": { texto: "Sin entregar", clase: "border border-border bg-muted text-muted-foreground" },
};

export function ChipEstado({ estado }: { estado: EstadoEntrega }) {
  const e = ESTADO[estado];
  const Icono = e.icono;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${e.clase}`}
    >
      {Icono && <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />}
      {e.texto}
    </span>
  );
}

export function Avatar({ ini, size = 34 }: { ini: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="grid shrink-0 place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground"
    >
      {ini}
    </span>
  );
}

export function Selector({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left transition-colors hover:border-primary ${focusRing}`}
    >
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`${kicker} text-[9.5px] tracking-[0.12em] text-muted-foreground`}>{rotulo}</span>
        <span className="mt-0.5 whitespace-nowrap text-[12.5px] font-bold">{valor}</span>
      </span>
      <ChevronDown aria-hidden className="ml-auto h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
    </button>
  );
}

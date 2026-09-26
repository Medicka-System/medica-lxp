"use client";

/** Estilos, marca de Eco, avatar, barra y estados compartidos de Alumnos. */

import {
  AlertTriangle,
  ClipboardCheck,
  MessageCircle,
} from "lucide-react";
import type { EstadoAlumno } from "./tipos";

export function EcoMark({ size = 26, invertido = false }: { size?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className={`grid shrink-0 place-items-center ${
        invertido
          ? "bg-[color:var(--info-foreground)] text-white"
          : "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
      }`}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </svg>
    </span>
  );
}


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export const ESTADO: Record<EstadoAlumno, { etiqueta: string; clase: string }> = {
  corriente: { etiqueta: "Al corriente", clase: "bg-accent text-accent-foreground" },
  riesgo: {
    etiqueta: "En riesgo",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  activo: { etiqueta: "Activo", clase: `border border-border bg-muted ${softText}` },
  suspendido: { etiqueta: "Suspendido", clase: "border border-border bg-muted text-muted-foreground" },
};

export const ICONO_ACTIVIDAD = {
  conexion: AlertTriangle,
  entregas: ClipboardCheck,
  ateneo: MessageCircle,
  consultas: MessageCircle,
} as const;

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

export function Barra({ pct, ancho = 86 }: { pct: number; ancho?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-[5px] overflow-hidden rounded-full bg-[color:var(--track)]"
        style={{ width: ancho }}
      >
        <span aria-hidden className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className={`${mono} text-[12px] font-bold`}>{pct}%</span>
    </span>
  );
}

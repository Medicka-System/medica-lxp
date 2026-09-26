"use client";

/** Estilos, marca de Eco, íconos y piezas compartidas del Inicio del súper admin. */

import {
  Award,
  BarChart3,
  CreditCard,
  Database,
  KeyRound,
  LayoutGrid,
  Mail,
  Plus,
  Scale,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { EstadoIntegracion } from "./tipos";

export function EcoMark({ size = 32, invertido = false }: { size?: number; invertido?: boolean }) {
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
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </svg>
    </span>
  );
}

export function SondaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6v8a3 3 0 0 1-6 0z" />
      <path d="M12 14v3" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0z" />
    </svg>
  );
}


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export const ICONO_KPI = {
  alumnos: Users,
  grupos: LayoutGrid,
  programas: BarChart3,
  inscripciones: Plus,
} as const;

export const ICONO_INTEGRACION = {
  zoom: Video,
  mico: SondaIcon,
  cora: Database,
  pagos: CreditCard,
  correo: Mail,
} as const;

export const ICONO_SISTEMA = { almacenamiento: Database, colas: Scale, lrs: TrendingUp } as const;
export const ICONO_DECISION = { certificados: Award, accesos: KeyRound, escaladas: Scale } as const;

/** El rojo solo por integración caída (y dinero vencido, en cartera). */
export const SEMAFORO: Record<EstadoIntegracion, { etiqueta: string; clase: string; borde: string; fondoFila: string }> = {
  ok: { etiqueta: "Operativa", clase: "bg-accent text-accent-foreground", borde: "border-border", fondoFila: "bg-card" },
  degradada: {
    etiqueta: "Degradada",
    clase: "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    borde: "border-border",
    fondoFila: "bg-card",
  },
  caida: {
    etiqueta: "Caída",
    clase: "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
    borde: "border-[color:var(--destructive-border)]",
    fondoFila: "bg-[color:var(--destructive-surface)]",
  },
};

export function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota?: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      {nota && <span className="text-[11.5px] text-muted-foreground">{nota}</span>}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

"use client";

/** Estilos, marca de Eco, íconos de rol, avatar y chips compartidos de Staff. */

import {
  ClipboardCheck,
  Clock,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  SquarePen,
  Users,
} from "lucide-react";
import type { Rol } from "./tipos";

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

export function SondaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
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

/** El nivel de poder se lee de un barrido: cada rol tiene color e ícono propios. */
export const ROL: Record<Rol, { etiqueta: string; clase: string; icono: "escudo" | "regla" | "sonda" }> = {
  super: { etiqueta: "Súper admin", clase: "bg-sidebar text-sidebar-foreground", icono: "escudo" },
  admin: {
    etiqueta: "Admin",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: "escudo",
  },
  disenador: { etiqueta: "Diseñador", clase: "bg-accent text-accent-foreground", icono: "regla" },
  docente: { etiqueta: "Docente", clase: `border border-border bg-muted ${softText}`, icono: "sonda" },
};

export const ICONO_CIFRA = { grupos: Users, casos: ScanLine, reloj: Clock, consultas: MessageCircle } as const;
export const ICONO_REGISTRO = { casos: ScanLine, cola: AlertTriangle, entregas: ClipboardCheck, consultas: MessageCircle } as const;

export function IconoRol({ tipo, className }: { tipo: "escudo" | "regla" | "sonda"; className?: string }) {
  if (tipo === "sonda") return <SondaIcon className={className} />;
  if (tipo === "regla") return <SquarePen aria-hidden className={className} strokeWidth={2} />;
  return <ShieldCheck aria-hidden className={className} strokeWidth={2} />;
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

export function ChipRol({ rol }: { rol: Rol }) {
  const r = ROL[rol];
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${r.clase}`}
    >
      <IconoRol tipo={r.icono} className="h-[11px] w-[11px]" />
      {r.etiqueta}
    </span>
  );
}

export function ChipEstado({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
        activo ? "bg-accent text-accent-foreground" : `border border-border bg-muted text-muted-foreground`
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-current" : "bg-[color:var(--track)]"}`}
      />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

/* pistas compartidas por encabezado y filas: el encabezado nunca miente */
export const TRACKS = "1.45fr 148px 1.25fr 1.5fr 118px 62px";


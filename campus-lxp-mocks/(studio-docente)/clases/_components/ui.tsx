"use client";

/** Estilos, marca de Eco, ícono de sonda y chip de tipo de sesión compartidos de Clases. */

import { Video } from "lucide-react";
import type { TipoSesion } from "./tipos";

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

/** Sonda: MiCo+ no es una videollamada, es el equipo transmitiendo. */
export function SondaIcon({ className = "", strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6v8a3 3 0 0 1-6 0z" />
      <path d="M12 14v3" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0z" />
    </svg>
  );
}

/* ───────────────────────── Estilo compartido ───────────────────────── */

export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
export const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

/** Zoom en azul, MiCo+ en teal con sonda: se distinguen sin leer. */
export function ChipTipo({ tipo, chico = false }: { tipo: TipoSesion; chico?: boolean }) {
  const base = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold ${
    chico ? "h-[21px] px-2 text-[10px]" : "h-6 px-2.5 text-[11px]"
  }`;
  if (tipo === "zoom") {
    return (
      <span className={`${base} border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]`}>
        <Video aria-hidden className={chico ? "h-[11px] w-[11px]" : "h-3 w-3"} strokeWidth={1.75} />
        Zoom
      </span>
    );
  }
  return (
    <span className={`${base} border-[#a7e0dd] bg-accent text-accent-foreground`}>
      <SondaIcon className={chico ? "h-[11px] w-[11px]" : "h-3 w-3"} />
      MiCo+{chico ? "" : " en vivo"}
    </span>
  );
}

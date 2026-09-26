"use client";

/** Estilos, marca de Eco y piezas compartidas de Grupos. */

import type { EstadoGrupo } from "./tipos";

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
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
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

export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export const ESTADO: Record<EstadoGrupo, { texto: string; atencion: boolean }> = {
  "al-dia": { texto: "Al día", atencion: false },
  "con-rezago": { texto: "Con rezago", atencion: true },
  "requiere-atencion": { texto: "Requiere atención", atencion: true },
};

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

"use client";

/**
 * Consultas (alumno) · piezas visuales
 *
 * El tipo de contacto se distingue por FORMA, no solo por color:
 *   docente → círculo navy + sello teal con palomita
 *   staff   → cuadrado redondeado gris (es un área, no una persona concreta)
 *   colega  → círculo teal claro
 * Presencia: punto verde arriba a la derecha SOLO si `enLinea`.
 */

import { Check, Clock } from "lucide-react";
import type { EstadoConsulta, TipoContacto } from "./tipos";

export const mono = "font-mono tabular-nums";
export const softText = "text-[color:var(--foreground-soft)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
export const panel = "rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";

export function AvatarContacto({
  ini,
  tipo,
  size = 42,
  enLinea = false,
}: {
  ini: string;
  tipo: TipoContacto;
  size?: number;
  enLinea?: boolean;
}) {
  const forma =
    tipo === "staff"
      ? "bg-[color:var(--track)] text-[color:var(--foreground-soft)]"
      : tipo === "colega"
        ? "rounded-full bg-accent text-accent-foreground"
        : "rounded-full bg-sidebar text-sidebar-foreground";
  return (
    <span className="relative shrink-0 self-start leading-none">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.33, borderRadius: tipo === "staff" ? size * 0.28 : undefined }}
        className={`grid place-items-center font-bold leading-none ${forma}`}
      >
        {ini}
      </span>
      {tipo === "docente" && (
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]">
          <Check className="h-2 w-2" strokeWidth={3} />
        </span>
      )}
      {enLinea && (
        <span className="absolute -right-px -top-px h-[11px] w-[11px] rounded-full border-2 border-card bg-[#22c55e]">
          <span className="sr-only">En línea</span>
        </span>
      )}
    </span>
  );
}

export function ChipTipo({ tipo, texto }: { tipo: TipoContacto; texto: string }) {
  const cls = {
    docente: "bg-sidebar text-sidebar-foreground",
    staff: `bg-[color:var(--track)] ${softText}`,
    colega: "bg-accent text-accent-foreground",
  }[tipo];
  return (
    <span className={`inline-flex h-[19px] items-center whitespace-nowrap rounded-full px-[7px] text-[9.5px] font-bold ${cls}`}>
      {texto}
    </span>
  );
}

/** Ámbar = esperando respuesta (único color de atención). Teal = respondida. Gris = cerrada. */
export function ChipEstado({ estado, grande = false }: { estado: EstadoConsulta; grande?: boolean }) {
  const cfg = {
    abierta: {
      t: "Esperando respuesta",
      cls: "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
      I: Clock,
    },
    respondida: { t: "Respondida", cls: "bg-accent text-accent-foreground", I: Check },
    cerrada: { t: "Cerrada", cls: "border border-border bg-muted text-muted-foreground", I: null },
  }[estado];
  const I = cfg.I;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-bold ${cfg.cls} ${
        grande ? "h-[26px] px-2.5 text-[11px]" : "h-[19px] px-[7px] text-[9.5px]"
      }`}
    >
      {I && <I aria-hidden className={grande ? "h-3 w-3" : "h-2.5 w-2.5"} strokeWidth={2.4} />}
      {cfg.t}
    </span>
  );
}

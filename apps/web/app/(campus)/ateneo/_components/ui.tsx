"use client";

/**
 * Ateneo · piezas visuales compartidas
 * Avatar (con sello de docente anclado), chips, modal base, marco de estudio y tokens.
 */

import type { ReactNode } from "react";
import { Check, Play, X } from "lucide-react";
import type { Persona } from "./tipos";

export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
export const trama = "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

/**
 * El envoltorio lleva self-start + leading-none: sin eso, dentro de un flex sin align-items,
 * se estira a la altura del bloque y el sello del docente flota lejos del avatar.
 */
export function Avatar({ p, size = 40 }: { p: Pick<Persona, "ini" | "rol">; size?: number }) {
  return (
    <span className="relative shrink-0 self-start leading-none">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid place-items-center rounded-full bg-sidebar font-bold leading-none text-sidebar-foreground"
      >
        {p.ini}
      </span>
      {p.rol === "docente" && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]"
        >
          <Check className="h-2 w-2" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

export function ChipDocente() {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-sidebar px-2 text-[10px] font-bold text-sidebar-foreground">
      Docente
    </span>
  );
}

export function Chip({
  children,
  tono = "neutro",
  icono,
}: {
  children: ReactNode;
  tono?: "caso" | "pregunta" | "encuesta" | "neutro" | "teal";
  icono?: ReactNode;
}) {
  const cls = {
    caso: "bg-secondary text-white",
    pregunta:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    encuesta:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    neutro: `border border-border bg-muted ${softText}`,
    teal: "bg-accent text-accent-foreground",
  }[tono];
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${cls}`}
    >
      {icono}
      {children}
    </span>
  );
}

/** Marco de estudio/imagen. El visor real es Cornerstone3D; aquí es el gancho visual. */
export function Estudio({
  ratio = "16 / 8",
  poster,
  etiqueta,
  badge,
  play = true,
  tamanoPlay = 52,
}: {
  ratio?: string;
  poster?: string;
  etiqueta?: string;
  badge?: string;
  play?: boolean;
  tamanoPlay?: number;
}) {
  return (
    <div
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ aspectRatio: ratio, background: "var(--sidebar)" }}
    >
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{ background: trama }} />
      )}
      {play && (
        <span
          aria-hidden
          style={{ width: tamanoPlay, height: tamanoPlay }}
          className="relative grid place-items-center rounded-full bg-white/[0.92] text-[color:var(--sidebar)]"
        >
          <Play style={{ width: tamanoPlay * 0.42, height: tamanoPlay * 0.42 }} strokeWidth={2} />
        </span>
      )}
      {etiqueta && (
        <span
          className={`${mono} absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.14em]`}
          style={{ color: "var(--hero-ink-muted)" }}
        >
          {etiqueta}
        </span>
      )}
      {badge && (
        <span
          className={`${mono} absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
          style={{ background: "rgba(15,45,82,.85)" }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * Modal base. El overlay se mide contra el viewport (fixed) y el diálogo se topa con max-h,
 * así el cuerpo scrollea y el pie (publicar / comentar) siempre queda visible.
 */
export function Modal({
  titulo,
  onCerrar,
  ancho = 640,
  children,
  pie,
}: {
  titulo: string;
  onCerrar: () => void;
  ancho?: number;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-6 py-9"
      style={{ background: "rgba(15,45,82,.55)" }}
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        style={{ width: ancho }}
        className="flex max-h-full max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_rgba(17,24,39,0.28)]"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-3.5">
          <p className="flex-1 text-center text-[15.5px] font-bold">{titulo}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 place-items-center rounded-full bg-muted ${softText} ${focusRing}`}
          >
            <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {pie && <div className="shrink-0 border-t border-border">{pie}</div>}
      </div>
    </div>
  );
}

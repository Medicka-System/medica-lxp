/**
 * Tokens de presentación compartidos — Campus Virtual · Médica Capacitación
 *
 * Son las clases utilitarias que se repetían en cada pantalla. Todo color sale de globals.css:
 * aquí no hay hex, solo utilidades semánticas.
 */

/** Cifras, folios, matrículas y horas: mono del sistema con numerales tabulares. */
export const mono = "font-mono tabular-nums";

/** Rótulo de sección. Tres densidades según el ancho de la columna. */
export const kickerWide = "text-[11px] font-semibold uppercase tracking-[0.16em]";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const kickerTight = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const kickerMini = "text-[10px] font-semibold uppercase tracking-[0.16em]";

/** Texto secundario de párrafo (#374151). */
export const softText = "text-[color:var(--foreground-soft)]";

/** Tarjeta en reposo: radio 12px y la sombra única del sistema. */
export const card =
  "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
/** Variante de 16px para heroes y bloques de contenido. */
export const cardLg =
  "rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";

/** Foco visible sobre superficies claras. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
/** Foco visible sobre navy (header y sidebar). */
export const focusRingDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

/** Trama diagonal de los placeholders de imagen y cine-loop. */
export const trama =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

/** Tonos semánticos: un solo color de atención por pantalla. */
export type Tono = "ok" | "warn" | "down" | "info" | "neutro" | "brand";

export const TONO: Record<Tono, string> = {
  ok: "bg-accent text-accent-foreground",
  warn:
    "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  /** ROJO: solo dinero vencido o integración caída. */
  down:
    "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
  /** Violeta: es Eco. Informa, no alarma. */
  info:
    "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  neutro: "border border-border bg-muted text-muted-foreground",
  brand: "bg-sidebar text-sidebar-foreground",
};

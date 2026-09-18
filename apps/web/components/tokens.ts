/**
 * Átomos de estilo compartidos (§5A) — clases utilitarias repetidas en el Campus.
 * Salen de tokens semánticos; sin hex. Los reutiliza todo el alumno (y el Studio).
 */

/** Mono del sistema SOLO para cifras/folios/matrícula/horas (§5A). */
export const mono = 'tabular-id';

/** Overline / kicker en mayúsculas. */
export const kicker = 'text-[11px] font-bold uppercase tracking-[0.14em]';
export const kickerMini = 'text-[10px] font-bold uppercase tracking-[0.12em]';
export const kickerWide = 'text-[10.5px] font-bold uppercase tracking-[0.18em]';

/** Texto secundario (gris 700). */
export const softText = 'text-foreground-soft';

/** Tarjeta de reposo (§5A: radio 12/16, sombra única). */
export const card = 'rounded-xl border border-border bg-card shadow-rest';
export const cardLg = 'rounded-2xl border border-border bg-card shadow-rest';

/** Anillo de foco claro (sobre superficies claras). */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

/** Trama diagonal de los heroes navy. */
export const tramaEstilo =
  'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)';

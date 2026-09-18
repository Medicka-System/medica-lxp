/**
 * Átomos de estilo del Studio (§5A/§5B). Reexporta los tokens base compartidos y
 * añade el anillo de foco para superficies navy (header del Studio) — sin tocar
 * los componentes base de `components/`. Sin hex: todo sale de tokens semánticos.
 */
export { mono, kicker, kickerMini, softText, focusRing, card, cardLg } from '@/components/tokens';

/** Anillo de foco sobre el header navy del Studio (offset sobre `--sidebar`). */
export const focusRingDark =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar)]';

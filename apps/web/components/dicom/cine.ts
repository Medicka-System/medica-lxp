/**
 * Lógica pura del cine-loop (sin React, sin timers) — el "cerebro" del
 * reproductor multi-frame. Se prueba en aislamiento; el hook `useCineLoop`
 * solo le añade el reloj.
 */

/** Milisegundos por frame para un fps dado. */
export function intervaloMs(fps: number): number {
  const f = Number.isFinite(fps) && fps > 0 ? fps : 30;
  return Math.round(1000 / f);
}

/**
 * Calcula el siguiente frame de un stack.
 * @param actual  índice actual (0-based)
 * @param total   número de frames
 * @param loop    si al llegar al final vuelve al inicio
 * @returns el índice siguiente y si la reproducción debe detenerse
 */
export function siguienteIndice(
  actual: number,
  total: number,
  loop: boolean,
): { indice: number; detener: boolean } {
  if (total <= 1) return { indice: 0, detener: true };

  const acotado = Math.min(Math.max(actual, 0), total - 1);
  const proximo = acotado + 1;

  if (proximo < total) return { indice: proximo, detener: false };

  // Estamos en el último frame.
  return loop ? { indice: 0, detener: false } : { indice: acotado, detener: true };
}

/** Envuelve un índice al rango [0, total) (para saltos manuales). */
export function acotarIndice(indice: number, total: number): number {
  if (total <= 0) return 0;
  const m = indice % total;
  return m < 0 ? m + total : m;
}

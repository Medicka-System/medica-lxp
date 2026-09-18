/**
 * Curva de olvido y repaso espaciado a nivel de concepto (§1/§8). Pura.
 */
import {
  DIA_MS,
  TAU_DIAS,
  UMBRAL_DECAIMIENTO,
  UMBRAL_RETENCION_REPASO,
  type DominioIaim,
} from './iaim';

/** Retención estimada (0..1) tras `deltaDias` sin práctica, dado τ del dominio. */
export function retencion(deltaDias: number, tau: number): number {
  return Math.exp(-Math.max(0, deltaDias) / tau);
}

/** Un dominio está "en caída" si perdió al menos `umbral` puntos de nivel. */
export function estaEnCaida(
  decaimiento: number,
  umbral: number = UMBRAL_DECAIMIENTO,
): boolean {
  return decaimiento >= umbral;
}

/**
 * Fecha del próximo repaso: cuándo la retención caería bajo el umbral desde la
 * última práctica, escalada por el nivel (más dominio ⇒ intervalo más largo).
 * Nunca devuelve una fecha en el pasado respecto a `ahora`.
 */
export function proximoRepaso(
  ultimaPractica: string,
  nivel: number,
  dominio: DominioIaim,
  ahora: Date,
): string {
  const tau = TAU_DIAS[dominio];
  const baseDias = -tau * Math.log(UMBRAL_RETENCION_REPASO); // Δt hasta el umbral
  const factorNivel = 1 + Math.max(0, Math.min(100, nivel)) / 100; // 1..2
  const intervaloDias = baseDias * factorNivel;
  const fecha = new Date(new Date(ultimaPractica).getTime() + intervaloDias * DIA_MS);
  return (fecha.getTime() < ahora.getTime() ? ahora : fecha).toISOString();
}

/**
 * Modelo I-AIM (§1) y constantes del motor de competencia. Data pura, compartida
 * entre `api` (tests/triggers) y `worker` (ejecución). Sin infra.
 *
 * La competencia DECAE con el tiempo (sobre todo Adquisición · §1): cada dominio
 * tiene su constante de olvido τ (tau, en días). τ menor ⇒ decae más rápido.
 */
export const DOMINIOS_IAIM = [
  'indicacion',
  'adquisicion',
  'interpretacion',
  'decision_medica',
] as const;

export type DominioIaim = (typeof DOMINIOS_IAIM)[number];

/** Constante de olvido por dominio (días). Adquisición es la más volátil (§1). */
export const TAU_DIAS: Record<DominioIaim, number> = {
  indicacion: 120,
  adquisicion: 30,
  interpretacion: 60,
  decision_medica: 90,
};

/** Puntos de nivel por hora de práctica (satura en 100 ≈ 25 h). */
export const NIVEL_POR_HORA = 4;

/** Retención bajo la cual se agenda un repaso (curva de olvido). */
export const UMBRAL_RETENCION_REPASO = 0.75;

/** Puntos de nivel perdidos a partir de los que un dominio se marca "en caída". */
export const UMBRAL_DECAIMIENTO = 15;

export const DIA_MS = 86_400_000;

/**
 * Hitos por horas acumuladas (§6/§8): 100 / 500 / 1000 h. Puro.
 */
export interface UmbralHito {
  tipo: string;
  horas: number;
}

export const UMBRALES_HITO: readonly UmbralHito[] = [
  { tipo: 'horas_100', horas: 100 },
  { tipo: 'horas_500', horas: 500 },
  { tipo: 'horas_1000', horas: 1000 },
];

/** El hito final dispara certificado (§8, `emision-certificado`). */
export const HITO_FINAL = 'horas_1000';

export interface HitoDetectado {
  tipo: string;
  horas_umbral: number;
}

/** Hitos recién alcanzados: umbral cruzado y aún no registrado. */
export function detectarHitos(
  horasTotales: number,
  yaAlcanzados: readonly string[],
): HitoDetectado[] {
  const alcanzados = new Set(yaAlcanzados);
  return UMBRALES_HITO.filter(
    (u) => horasTotales >= u.horas && !alcanzados.has(u.tipo),
  ).map((u) => ({ tipo: u.tipo, horas_umbral: u.horas }));
}

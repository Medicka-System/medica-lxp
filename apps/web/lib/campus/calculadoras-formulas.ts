/**
 * Fórmulas clínicas puras de las calculadoras destacadas (§ Sprint 8). Se extraen
 * del componente para poder probarlas sin navegador (son lógica verificable). Todas
 * son estándar de ultrasonido; el cálculo es orientativo (no sustituye criterio).
 */

/** Redondea a `dec` decimales devolviendo número (evita -0). */
export function redondea(n: number, dec = 1): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f + 0;
}

/** Convierte texto (coma o punto decimal) a número finito o null. */
export function aNumero(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Volumen vesical (mL) por elipsoide: 0.52 × largo × ancho × alto (cm). */
export function volumenVesical(largo: number, ancho: number, alto: number): number {
  return redondea(0.52 * largo * ancho * alto, 1);
}

/** Volumen del VI (mL) por Teichholz a partir del diámetro D (cm): 7·D³/(2.4+D). */
export function volumenTeichholz(d: number): number {
  return (7 * d ** 3) / (2.4 + d);
}

/**
 * Fracción de eyección del VI (%) por Teichholz desde los diámetros diastólico
 * y sistólico (cm). Devuelve volúmenes y FEVI redondeada, o null si es inválido.
 */
export function feviTeichholz(
  ddCm: number,
  dsCm: number,
): { fevi: number; vdf: number; vsf: number } | null {
  if (!(ddCm > 0) || !(dsCm > 0) || dsCm >= ddCm) return null;
  const vdf = volumenTeichholz(ddCm);
  const vsf = volumenTeichholz(dsCm);
  return {
    fevi: redondea(((vdf - vsf) / vdf) * 100, 0),
    vdf: redondea(vdf, 0),
    vsf: redondea(vsf, 0),
  };
}

/**
 * Edad gestacional por longitud céfalo-caudal (Robinson-Fleming, 1975):
 * días = 8.052·√LCC(mm) + 23.73. Válida ~ LCC 2–95 mm. Devuelve días totales y su
 * desglose semanas/días, o null si la LCC está fuera de rango.
 */
export function edadGestacionalLcc(
  crlMm: number,
): { dias: number; semanas: number; restoDias: number } | null {
  if (!(crlMm >= 2) || !(crlMm <= 95)) return null;
  const dias = 8.052 * Math.sqrt(crlMm) + 23.73;
  const semanas = Math.floor(dias / 7);
  const restoDias = Math.round(dias - semanas * 7);
  return { dias, semanas, restoDias };
}

/**
 * CATÁLOGO de fórmulas del motor de cálculo de reportes (§6.5 · tipo de campo `calculado`).
 *
 * FUENTE ÚNICA de las fórmulas: un catálogo PREDEFINIDO (decisión de producto) — NO hay `eval`,
 * NO hay parser de expresiones libres, NO hay fórmulas que escriba el usuario. El diseñador solo
 * ELIGE una del catálogo y MAPEA sus entradas a campos existentes de la plantilla (ver el editor de
 * config en `registro-ui-campos.tsx`).
 *
 * Cada fórmula:
 *   · declara sus `entradas` esperadas (nombre + tipo: `numero` | `fecha`),
 *   · es una función PURA `calcular(entradas, { decimales })` → string YA FORMATEADO (sin unidad;
 *     la unidad la agrega el render/PDF, como en `medida`),
 *   · devuelve `''` ante entradas FALTANTES o NO numéricas/fecha inválidas — nunca `NaN`, nunca lanza.
 *
 * Este módulo es PURO (sin React, sin `server-only`): lo usa el llenado reactivo del médico
 * (`editor-reporte.tsx`) y el editor de config del constructor. No importa `estructura.ts` (usa un
 * tipo ESTRUCTURAL mínimo) para no crear un ciclo — `estructura.ts` sí importa `etiquetaFormula`.
 *
 * FUERA DE ALCANCE (documentado · NO implementado): edad gestacional / peso por BIOMETRÍA con
 * lookup en TABLAS DE REFERENCIA por estructura (Hadlock por CC, fémur por CA, etc.). Requiere las
 * tablas percentilares, que no están disponibles; queda como pendiente de escala. Aquí solo vive la
 * edad gestacional por FUM (aritmética de fechas), no por medida.
 */

export type IdFormula =
  | 'edad_paciente'
  | 'edad_gestacional_fum'
  | 'fpp'
  | 'volumen_elipsoide'
  | 'indice_resistencia'
  | 'peso_fetal_hadlock'
  | 'ila';

/** Una entrada esperada por una fórmula: se mapea a un campo del reporte de tipo compatible. */
export type EntradaFormula = { nombre: string; etiqueta: string; tipo: 'numero' | 'fecha' };

export type DefFormula = {
  id: IdFormula;
  label: string;
  descripcion: string;
  /** Unidad sugerida de la salida (se copia al campo al elegir la fórmula). '' = adimensional. */
  unidad: string;
  /** Decimales sugeridos si el campo no fija los suyos. */
  decimalesDefecto: number;
  entradas: EntradaFormula[];
  /** Calcula a partir de las entradas YA resueltas (por `nombre`). Devuelve '' si falta/inválido. */
  calcular: (entradas: Record<string, unknown>, opts: { decimales?: number }) => string;
};

/** Forma MÍNIMA de un campo `calculado` (subconjunto estructural de `CampoPlantilla`). */
export type CampoCalculado = {
  formula?: string;
  entradas?: Record<string, string>;
  decimales?: number;
};

const MS_DIA = 86_400_000;

/** Número tolerante: acepta number o string (coma o punto decimal). null si vacío/no numérico. */
function parseNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = v.trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Fecha tolerante desde el valor de un campo `fecha` ("YYYY-MM-DD") o `fecha-hora`
 * ("YYYY-MM-DDTHH:mm"). Las fechas sin hora se anclan a medianoche UTC para que las diferencias de
 * DÍAS sean estables sin importar la zona horaria del navegador. null si vacío/inválido.
 */
function parseFecha(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t === '') return null;
  const d = new Date(t.length <= 10 ? `${t}T00:00:00Z` : t);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Días enteros entre dos fechas (b − a), truncando. */
function diffDias(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_DIA);
}

/** Formatea un número con los decimales del campo (o el default de la fórmula). */
function fmt(n: number, decimales: number | undefined, defecto: number): string {
  return n.toFixed(typeof decimales === 'number' && decimales >= 0 ? decimales : defecto);
}

export const CATALOGO_FORMULAS: Record<IdFormula, DefFormula> = {
  edad_paciente: {
    id: 'edad_paciente',
    label: 'Edad del paciente',
    descripcion: 'Años cumplidos entre la fecha de nacimiento y la fecha del estudio.',
    unidad: 'años',
    decimalesDefecto: 0,
    entradas: [
      { nombre: 'fecha_estudio', etiqueta: 'Fecha del estudio', tipo: 'fecha' },
      { nombre: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha' },
    ],
    calcular: (e) => {
      const est = parseFecha(e.fecha_estudio);
      const nac = parseFecha(e.fecha_nacimiento);
      if (!est || !nac) return '';
      const dias = diffDias(nac, est);
      if (dias < 0) return '';
      return String(Math.floor(dias / 365.25));
    },
  },

  edad_gestacional_fum: {
    id: 'edad_gestacional_fum',
    label: 'Edad gestacional (por FUM)',
    descripcion: 'Semanas.días entre la fecha de última menstruación y la fecha del estudio.',
    unidad: 'sem',
    decimalesDefecto: 0,
    entradas: [
      { nombre: 'fecha_estudio', etiqueta: 'Fecha del estudio', tipo: 'fecha' },
      { nombre: 'fum', etiqueta: 'FUM (última menstruación)', tipo: 'fecha' },
    ],
    // Formato "22.3" = 22 semanas 3 días (convención obstétrica), NO un decimal.
    calcular: (e) => {
      const est = parseFecha(e.fecha_estudio);
      const fum = parseFecha(e.fum);
      if (!est || !fum) return '';
      const dias = diffDias(fum, est);
      if (dias < 0) return '';
      const semanas = Math.floor(dias / 7);
      const resto = dias % 7;
      return `${semanas}.${resto}`;
    },
  },

  fpp: {
    id: 'fpp',
    label: 'Fecha probable de parto',
    descripcion: 'FUM + 280 días (regla de Naegele).',
    unidad: '',
    decimalesDefecto: 0,
    entradas: [{ nombre: 'fum', etiqueta: 'FUM (última menstruación)', tipo: 'fecha' }],
    calcular: (e) => {
      const fum = parseFecha(e.fum);
      if (!fum) return '';
      const fpp = new Date(fum.getTime() + 280 * MS_DIA);
      return fpp.toISOString().slice(0, 10); // YYYY-MM-DD
    },
  },

  volumen_elipsoide: {
    id: 'volumen_elipsoide',
    label: 'Volumen (elipsoide)',
    descripcion: 'largo × ancho × profundidad × 0.523. En mL si las medidas están en cm.',
    unidad: 'mL',
    decimalesDefecto: 1,
    entradas: [
      { nombre: 'largo', etiqueta: 'Largo', tipo: 'numero' },
      { nombre: 'ancho', etiqueta: 'Ancho', tipo: 'numero' },
      { nombre: 'profundidad', etiqueta: 'Profundidad', tipo: 'numero' },
    ],
    calcular: (e, { decimales }) => {
      const l = parseNum(e.largo);
      const a = parseNum(e.ancho);
      const p = parseNum(e.profundidad);
      if (l === null || a === null || p === null) return '';
      return fmt(l * a * p * 0.523, decimales, 1);
    },
  },

  indice_resistencia: {
    id: 'indice_resistencia',
    label: 'Índice de resistencia (IR)',
    descripcion: '(VPS − VTD) / VPS. Adimensional.',
    unidad: '',
    decimalesDefecto: 2,
    entradas: [
      { nombre: 'vps', etiqueta: 'VPS (velocidad pico sistólica)', tipo: 'numero' },
      { nombre: 'vtd', etiqueta: 'VTD (velocidad telediastólica)', tipo: 'numero' },
    ],
    calcular: (e, { decimales }) => {
      const vps = parseNum(e.vps);
      const vtd = parseNum(e.vtd);
      if (vps === null || vtd === null || vps === 0) return '';
      return fmt((vps - vtd) / vps, decimales, 2);
    },
  },

  peso_fetal_hadlock: {
    id: 'peso_fetal_hadlock',
    label: 'Peso fetal estimado (Hadlock)',
    descripcion: 'Hadlock 4 parámetros (DBP, CC, CA, fémur en cm) → gramos.',
    unidad: 'g',
    decimalesDefecto: 0,
    entradas: [
      { nombre: 'dbp', etiqueta: 'DBP (diámetro biparietal, cm)', tipo: 'numero' },
      { nombre: 'cc', etiqueta: 'CC (circunferencia cefálica, cm)', tipo: 'numero' },
      { nombre: 'ca', etiqueta: 'CA (circunferencia abdominal, cm)', tipo: 'numero' },
      { nombre: 'femur', etiqueta: 'Longitud femoral (cm)', tipo: 'numero' },
    ],
    // Hadlock FP, Harrist RB, Sharman RS, Deter RL, Park SK. "Estimation of fetal weight with the
    // use of head, body, and femur measurements." Am J Obstet Gynecol. 1985;151(3):333-337.
    // log10(EFW) = 1.3596 − 0.00386·CA·FL + 0.0064·CC + 0.00061·DBP·CA + 0.0424·CA + 0.174·FL
    // Medidas en cm, EFW en gramos.
    calcular: (e, { decimales }) => {
      const dbp = parseNum(e.dbp);
      const cc = parseNum(e.cc);
      const ca = parseNum(e.ca);
      const fl = parseNum(e.femur);
      if (dbp === null || cc === null || ca === null || fl === null) return '';
      const log10Efw =
        1.3596 - 0.00386 * ca * fl + 0.0064 * cc + 0.00061 * dbp * ca + 0.0424 * ca + 0.174 * fl;
      const efw = Math.pow(10, log10Efw);
      if (!Number.isFinite(efw)) return '';
      return fmt(efw, decimales, 0);
    },
  },

  ila: {
    id: 'ila',
    label: 'Índice de líquido amniótico (ILA)',
    descripcion: 'Suma de los 4 cuadrantes.',
    unidad: 'mm',
    decimalesDefecto: 0,
    entradas: [
      { nombre: 'q1', etiqueta: 'Cuadrante I', tipo: 'numero' },
      { nombre: 'q2', etiqueta: 'Cuadrante II', tipo: 'numero' },
      { nombre: 'q3', etiqueta: 'Cuadrante III', tipo: 'numero' },
      { nombre: 'q4', etiqueta: 'Cuadrante IV', tipo: 'numero' },
    ],
    calcular: (e, { decimales }) => {
      const qs = [e.q1, e.q2, e.q3, e.q4].map(parseNum);
      if (qs.some((q) => q === null)) return '';
      return fmt((qs as number[]).reduce((a, b) => a + b, 0), decimales, 0);
    },
  },
};

export const IDS_FORMULA: IdFormula[] = Object.keys(CATALOGO_FORMULAS) as IdFormula[];

export function esIdFormula(v: unknown): v is IdFormula {
  return typeof v === 'string' && v in CATALOGO_FORMULAS;
}

/** Rótulo humano de una fórmula (para el chip del constructor). '' si no existe. */
export function etiquetaFormula(id: string | undefined): string {
  return id && esIdFormula(id) ? CATALOGO_FORMULAS[id].label : '';
}

/**
 * Evalúa un campo `calculado` contra la FUENTE de valores del reporte (encabezado + hallazgos
 * mezclados: `{ ...datosPaciente, ...valores }`). Resuelve cada entrada por su `campoId` mapeado.
 * Devuelve '' si la fórmula no existe, falta una entrada, o el cálculo no es válido. Nunca lanza.
 */
export function evaluarCampoCalculado(campo: CampoCalculado, fuente: Record<string, unknown>): string {
  if (!esIdFormula(campo.formula)) return '';
  const def = CATALOGO_FORMULAS[campo.formula];
  const entradas: Record<string, unknown> = {};
  for (const ent of def.entradas) {
    const campoId = campo.entradas?.[ent.nombre];
    entradas[ent.nombre] = campoId ? fuente[campoId] : undefined;
  }
  try {
    return def.calcular(entradas, { decimales: campo.decimales });
  } catch {
    return '';
  }
}

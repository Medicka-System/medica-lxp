/**
 * Anonimización DICOM del BINARIO P10 real (§10 · Sprint 4.7 · rama dicom-upload).
 *
 * Parsea el archivo `.dcm` crudo con **dcmjs**, quita la PII del paciente (reusa el
 * catálogo y las reglas PURAS de `anonimizacion.ts` — `esPII`/`PII_KEYWORDS`), VERIFICA
 * de forma bloqueante que no sobreviva PII, y **reescribe** un `.dcm` anonimizado
 * conservando el pixel-data y los metadatos clínicos. Produce la misma TRAZA auditable.
 *
 * A diferencia del pipeline JSON (`anonimizacion.ts`, que opera sobre un dataset ya
 * parseado), este módulo SÍ toca el binario: es el paso que faltaba para que el estudio
 * educativo se vea en el visor Cornerstone3D (`wadouri:` sobre el `.dcm` anonimizado).
 *
 * INVARIANTE §10: ningún caso educativo persiste con PII. Si tras remover algo
 * sobrevive PII, se LANZA (el job de BullMQ reintenta y no se fija la referencia).
 *
 * Nota: dcmjs naturaliza el dataset a keywords (`PatientName`, `Modality`…) y las
 * etiquetas privadas a su forma contigua `ggggeeee` — ambas las cubre `esPII`. Las
 * claves de metadatos que dcmjs agrega (`_vrMap`, `_meta`) empiezan con `_` y se
 * conservan intactas (las necesita para reescribir).
 *
 * Límite honesto (§10): se anonimizan los TAGS. La PII "quemada" en los píxeles
 * (texto sobreimpreso en la imagen de ultrasonido) NO se redacta aquí — eso exige
 * redacción de pixel-data y queda fuera de este paso.
 */
import * as dcmjs from 'dcmjs';
import { esPII, MOTOR_ANON, VERSION_ANON, type TrazaAnonimizacion } from './anonimizacion';
import { redactarPixeles, type ResultadoRedaccion } from './redaccion-pixeles';

const { DicomMessage, DicomMetaDictionary, DicomDict } = dcmjs.data;

/** Serie derivada del estudio anonimizado (para `estudio_series` en la BD). */
export interface SerieAnonimizada {
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias: number;
  /**
   * Espaciado físico real de píxel `[row, col]` en mm (aspect ratio de USG · § contexto
   * clínico). `null` si la imagen no aporta calibración ni aspect ratio (píxel cuadrado).
   * El visor lo usa para no deformar estructuras redondas.
   */
  pixelSpacing: [number, number] | null;
}

/** Resultado de anonimizar el binario: el `.dcm` limpio + traza + series + redacción. */
export interface ResultadoAnonimizacionBinaria {
  buffer: Buffer;
  traza: TrazaAnonimizacion;
  series: SerieAnonimizada[];
  /** Qué se redactó de la PII QUEMADA en píxeles (§10 · banner del equipo). */
  redaccion: ResultadoRedaccion;
}

/** ¿El valor naturalizado tiene contenido real (para contar removidos)? */
function tieneValor(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Clave de metadatos que agrega dcmjs (no es un tag): se conserva, no se toca. */
function esMeta(clave: string): boolean {
  return clave.startsWith('_');
}

/** Primer valor escalar de un campo naturalizado (string/number), o null. */
function escalar(v: unknown): string | number | null {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' || typeof x === 'number' ? x : null;
}

/** Número positivo finito o null (dcmjs naturaliza a number o string numérica). */
function numPos(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Espaciado físico de píxel `[row, col]` en mm (aspect ratio real de USG · § contexto
 * clínico). Prioriza, en orden: PixelSpacing (0028,0030) → calibración de región de
 * ultrasonido (0018,6011: Physical Delta X/Y, unidades 3 = cm) → Pixel Aspect Ratio
 * (0028,0034 = vertical\horizontal, relación pura → col = 1). `null` si nada aplica o el
 * píxel es cuadrado (1:1, no hay nada que corregir). PURO y testeable.
 */
export function espaciadoDeDataset(ds: Record<string, unknown>): [number, number] | null {
  // 1) PixelSpacing = [rowSpacing, colSpacing] en mm.
  const ps = ds.PixelSpacing;
  if (Array.isArray(ps) && ps.length >= 2) {
    const row = numPos(ps[0]);
    const col = numPos(ps[1]);
    if (row && col) return [row, col];
  }

  // 2) Región de ultrasonido: Physical Delta X (col) / Y (row); unidad 3 = cm → ×10 mm.
  const regs = ds.SequenceOfUltrasoundRegions;
  const items = Array.isArray(regs) ? regs : regs ? [regs] : [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const r = it as Record<string, unknown>;
    const dx = numPos(Math.abs(Number(r.PhysicalDeltaX)));
    const dy = numPos(Math.abs(Number(r.PhysicalDeltaY)));
    if (!dx || !dy) continue;
    const col = dx * (Number(r.PhysicalUnitsXDirection) === 3 ? 10 : 1);
    const row = dy * (Number(r.PhysicalUnitsYDirection) === 3 ? 10 : 1);
    if (numPos(col) && numPos(row)) return [row, col];
  }

  // 3) Pixel Aspect Ratio = [vertical, horizontal] (relación pura → col = 1).
  const par = ds.PixelAspectRatio;
  if (Array.isArray(par) && par.length >= 2) {
    const vert = numPos(par[0]);
    const horiz = numPos(par[1]);
    if (vert && horiz && vert !== horiz) return [vert / horiz, 1];
  }

  return null;
}

/**
 * Anonimiza un estudio DICOM P10 (un archivo `.dcm`, mono- o multi-frame). Puro
 * respecto a I/O: recibe el binario crudo y devuelve el binario anonimizado; el
 * worker se encarga del fetch/put/delete contra object storage.
 */
export function anonimizarDicomBinario(entrada: ArrayBuffer): ResultadoAnonimizacionBinaria {
  let leido: { dict: Record<string, unknown>; meta: Record<string, unknown> };
  try {
    leido = DicomMessage.readFile(entrada, { ignoreErrors: true }) as typeof leido;
  } catch (e) {
    throw new Error(`No es un archivo DICOM P10 válido: ${(e as Error).message}`);
  }

  const dataset = DicomMetaDictionary.naturalizeDataset(leido.dict) as Record<string, unknown>;

  // 1) Remover PII (keywords + etiquetas privadas). Los metadatos `_*` se conservan.
  const removidos: string[] = [];
  for (const clave of Object.keys(dataset)) {
    if (esMeta(clave)) continue;
    if (esPII(clave)) {
      if (tieneValor(dataset[clave])) removidos.push(clave);
      delete dataset[clave];
    }
  }

  // 2) Verificación bloqueante (§10): nada persiste con PII.
  const restos = Object.keys(dataset).filter(
    (k) => !esMeta(k) && esPII(k) && tieneValor(dataset[k]),
  );
  if (restos.length > 0) {
    throw new Error(`Anonimización incompleta: sobrevive PII → ${restos.join(', ')}`);
  }

  // 3) Metadatos de series (nivel imagen → una serie por archivo). El cine-loop
  //    multi-frame se refleja en `frames` (NumberOfFrames).
  const modalidad = String(escalar(dataset.Modality) ?? 'US');
  const framesRaw = escalar(dataset.NumberOfFrames);
  const frames = Math.max(1, Number(framesRaw) || 1);
  const series: SerieAnonimizada[] = [
    {
      series_uid: String(escalar(dataset.SeriesInstanceUID) ?? ''),
      modalidad,
      frames,
      instancias: 1,
      pixelSpacing: espaciadoDeDataset(dataset),
    },
  ];

  // 4) Redactar la PII QUEMADA en los píxeles (§10 · banner del ecógrafo): ennegrece lo
  //    exterior a la región de ultrasonido. Muta el pixel-data en el dataset naturalizado
  //    ANTES de reescribir. Si no hay región, cae al fallback (banda + revision_manual).
  const redaccion = redactarPixeles(dataset);

  // 5) Reescribir el `.dcm` anonimizado (tags limpios + pixel-data redactado).
  const dict = new DicomDict(leido.meta);
  dict.dict = DicomMetaDictionary.denaturalizeDataset(dataset);
  const buffer = Buffer.from(dict.write());

  return {
    buffer,
    traza: {
      motor: MOTOR_ANON,
      version: VERSION_ANON,
      campos_removidos: [...new Set(removidos)].sort(),
      removidos_n: removidos.length,
      series_procesadas: series.length,
      verificado: true,
    },
    series,
    redaccion,
  };
}

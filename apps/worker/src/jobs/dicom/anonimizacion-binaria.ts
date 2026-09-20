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

const { DicomMessage, DicomMetaDictionary, DicomDict } = dcmjs.data;

/** Serie derivada del estudio anonimizado (para `estudio_series` en la BD). */
export interface SerieAnonimizada {
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias: number;
}

/** Resultado de anonimizar el binario: el `.dcm` limpio + traza + series. */
export interface ResultadoAnonimizacionBinaria {
  buffer: Buffer;
  traza: TrazaAnonimizacion;
  series: SerieAnonimizada[];
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
    },
  ];

  // 4) Reescribir el `.dcm` anonimizado (conserva meta y pixel-data).
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
  };
}

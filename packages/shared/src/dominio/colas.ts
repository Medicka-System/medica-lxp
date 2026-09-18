/**
 * Contratos de las colas de dominio (§8) — nombres y payloads compartidos entre el
 * productor (`api`) y los consumidores (`worker`), para no desincronizarse.
 */
export const QUEUE_CALCULO_COMPETENCIA = 'calculo-competencia' as const;
export const QUEUE_DETECCION_DECAIMIENTO = 'deteccion-decaimiento' as const;
export const QUEUE_PROGRAMAR_REPASO = 'programar-repaso' as const;
export const QUEUE_DETECCION_HITO = 'deteccion-hito' as const;
export const QUEUE_EMISION_CERTIFICADO = 'emision-certificado' as const;
export const QUEUE_OTORGAR_BADGES = 'otorgar-badges' as const;
export const QUEUE_PROCESAR_DICOM = 'procesar-dicom' as const;

/** Job por alumno (recalcular competencia, detectar hitos, otorgar badges…). */
export interface AlumnoJob {
  alumnoId: string;
}

/** Job de emisión de certificado a partir de un hito alcanzado. */
export interface HitoJob {
  alumnoId: string;
  tipo: string;
  horas_umbral: number;
}

/** Job de repaso: agenda el reexamen de un dominio del alumno. */
export interface RepasoJob {
  alumnoId: string;
  dominio_iaim: string;
}

/**
 * Job `procesar-dicom` (§8, job #2). El `api` lo encola tras confirmarse la subida
 * del estudio crudo a object storage; el `worker` lo parsea, ANONIMIZA (bloqueante)
 * y persiste metadatos. Solo referencias/URLs (nunca el binario ni PII en el payload).
 * El signer es el `api`: las URLs firmadas viajan aquí para que el worker no firme.
 */
export interface ProcesarDicomJob {
  /** Caso de bitácora al que pertenece el estudio. */
  casoId: string;
  /** Clave del estudio CRUDO (con PII) en object storage. */
  refCrudo: string;
  /** Clave destino del estudio ANONIMIZADO. */
  refAnonimizado: string;
  /** URL firmada de LECTURA del estudio crudo. */
  urlLecturaCrudo: string;
  /** URL firmada de ESCRITURA del estudio anonimizado. */
  urlSubidaAnonimizado: string;
  /** URL firmada de BORRADO del estudio crudo (se elimina tras anonimizar). */
  urlBorradoCrudo: string;
}

/** Reintentos/backoff de los jobs de dominio (§8). */
export const OPCIONES_REINTENTO_DOMINIO = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1500 },
  removeOnComplete: true,
  removeOnFail: false,
} as const;

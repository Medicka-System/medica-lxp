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

/** Reintentos/backoff de los jobs de dominio (§8). */
export const OPCIONES_REINTENTO_DOMINIO = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1500 },
  removeOnComplete: true,
  removeOnFail: false,
} as const;

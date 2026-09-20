/**
 * Contratos de las colas de dominio (§8) — nombres y payloads compartidos entre el
 * productor (`api`) y los consumidores (`worker`), para no desincronizarse.
 */
import type { TipoNotificacion } from './notificaciones';
export const QUEUE_CALCULO_COMPETENCIA = 'calculo-competencia' as const;
export const QUEUE_DETECCION_DECAIMIENTO = 'deteccion-decaimiento' as const;
export const QUEUE_PROGRAMAR_REPASO = 'programar-repaso' as const;
export const QUEUE_DETECCION_HITO = 'deteccion-hito' as const;
export const QUEUE_EMISION_CERTIFICADO = 'emision-certificado' as const;
export const QUEUE_OTORGAR_BADGES = 'otorgar-badges' as const;
export const QUEUE_PROCESAR_DICOM = 'procesar-dicom' as const;
export const QUEUE_INDEXAR_RAG = 'indexar-rag' as const;
export const QUEUE_ECO_EVALUACION = 'eco-evaluacion' as const;
export const QUEUE_INGESTA_GRABACION_ZOOM = 'ingesta-grabacion-zoom' as const;
export const QUEUE_RENDER_TTS = 'render-tts' as const;
export const QUEUE_NOTIFICACIONES = 'notificaciones' as const;

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
 * del binario `.dcm` crudo a object storage; el `worker` lo parsea (dcmjs), ANONIMIZA
 * (bloqueante) y reescribe un `.dcm` anonimizado + metadatos. Solo referencias/URLs
 * (nunca el binario ni PII en el payload). El signer es el `api`: las URLs firmadas
 * viajan aquí para que el worker no firme.
 */
export interface ProcesarDicomJob {
  /** Caso de bitácora al que pertenece el estudio. */
  casoId: string;
  /** Clave del binario `.dcm` CRUDO (con PII) en object storage. */
  refCrudo: string;
  /** Clave destino del binario `.dcm` ANONIMIZADO. */
  refAnonimizado: string;
  /** URL firmada de LECTURA del estudio crudo. */
  urlLecturaCrudo: string;
  /** URL firmada de ESCRITURA del estudio anonimizado. */
  urlSubidaAnonimizado: string;
  /** URL firmada de BORRADO del estudio crudo (se elimina tras anonimizar). */
  urlBorradoCrudo: string;
}

/**
 * Job `indexar-rag` (§8, job #10). El `api` lo encola al crear/curar un caso,
 * rúbrica o material; el `worker` hace chunk → embedding (servicio local) → upsert
 * en pgvector (`lxp.documentos_rag`). Asíncrono: la latencia no importa aquí.
 * Solo referencias (el worker LEE el texto fuente de la BD), nunca el binario.
 */
export interface IndexarRagJob {
  /** Origen del contenido a indexar (para trazar y re-indexar al cambiar). */
  fuenteTipo: 'caso_biblioteca' | 'rubrica' | 'material';
  fuenteId: string;
}

/**
 * Job `eco-evaluacion` (§8, job #11). Pre-análisis EN LOTE de un grupo: el pipeline
 * de Eco (tools → Haiku condicional → Sonnet) deja PROPUESTAS por confianza en la
 * bandeja (`lxp.eco_propuestas`). El docente confirma después (§7A) — nada se
 * asienta aquí. El worker dispara el lote; el juicio vive en `api/src/ai`.
 */
export interface EcoEvaluacionJob {
  grupoId: string;
  /** Acota a una actividad (entregas); si se omite, evalúa los casos del grupo. */
  actividadId?: string;
  /** Qué pre-analizar: entregas de una actividad o casos de bitácora del grupo. */
  modo: 'entregas' | 'casos';
}

/**
 * Job `ingesta-grabacion-zoom` (§8, job #3 · Sprint 6). El `api` lo encola al recibir
 * el webhook `recording.completed` de Zoom (firma ya validada). El `worker` DESCARGA
 * la grabación de Zoom (URL temporal + token) → la SUBE a object storage con la URL
 * firmada que provee el `api` (el worker no firma) → marca la fila de videoteca como
 * `listo` y emite xAPI de disponibilidad. Las grabaciones NO se quedan en Zoom Cloud (§9).
 */
export interface IngestaGrabacionZoomJob {
  /** Fila de `lxp.videoteca` creada por el webhook (estado `procesando`). */
  videotecaId: string;
  /** Clase de `lxp.clases` a la que pertenece la grabación (grupo/lección). */
  claseId: string;
  /** Clave destino de la grabación en object storage. */
  refDestino: string;
  /** URL de DESCARGA de la grabación en Zoom (temporal). */
  urlDescargaZoom: string;
  /** Token `download_token` de Zoom para autenticar la descarga (si aplica). */
  tokenDescarga?: string;
  /** URL firmada de ESCRITURA del destino en object storage (el api la firma). */
  urlSubidaDestino: string;
  /** `user_id` del docente de la clase (actor del statement de disponibilidad). */
  docenteId?: string;
  /** Nombre de la clase, para el statement xAPI. */
  titulo?: string;
}

/**
 * Job `render-tts` (course builder). El `api` lo encola tras pre-registrar el audio
 * en `lxp.tts_audios` (estado `procesando`); el `worker` aporta buffer/retry y dispara
 * el render llamando al `api` (patrón worker→servicio, igual que `eco-evaluacion`). El
 * `api` sintetiza con el proveedor configurado (§3 · adaptador intercambiable), sube el
 * binario a object storage con URL firmada y marca el audio `listo`. Solo la referencia
 * del audio viaja aquí — el binario NUNCA pasa por la cola ni por Postgres.
 */
export interface RenderTtsJob {
  /** Fila de `lxp.tts_audios` a renderizar (creada por el `api`, estado `procesando`). */
  audioId: string;
}

/**
 * Job `notificaciones` (§8, job #12 · Sprint 8.5). El productor (`api` en el flujo de
 * validación; `worker` en hitos/certificados/badges/repaso; o web-originado vía el
 * endpoint interno) encola un evento "para este usuario, de este tipo". El worker
 * `notificaciones` aporta buffer/retry y dispara el DESPACHO llamando al `api` (patrón
 * worker→servicio, igual que `eco-evaluacion`/`render-tts`): el motor lee la preferencia
 * del usuario, inserta la fila in-app y envía por los canales opt-in (correo/WhatsApp).
 *
 * `titulo`/`cuerpo` son opcionales: si se omiten, el motor los deriva de la plantilla
 * transaccional del `tipo` con `datos`. Los anuncios traen su texto ya redactado.
 */
export interface NotificacionJob {
  /** Destinatario: `user_id` del perfil LXP (§6). */
  userId: string;
  tipo: TipoNotificacion;
  /** Título corto (in-app + asunto de correo). Si falta, lo pone la plantilla. */
  titulo?: string;
  /** Cuerpo en texto plano. Si falta, lo pone la plantilla. */
  cuerpo?: string;
  /** Entidad que originó el evento, para el deep-link (ej. 'caso'/'certificado'). */
  entidadTipo?: string;
  entidadId?: string;
  /** Datos para la plantilla (folio, nota, dominio…). Sin PII de paciente (§10). */
  datos?: Record<string, unknown>;
}

/** Reintentos/backoff de los jobs de dominio (§8). */
export const OPCIONES_REINTENTO_DOMINIO = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1500 },
  removeOnComplete: true,
  removeOnFail: false,
} as const;

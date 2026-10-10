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
export const QUEUE_GENERAR_DERIVADOS_IMAGEN = 'generar-derivados-imagen' as const;

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
 * Tabla dueña de un estudio DICOM. El visor es TRANSVERSAL (§ rediseño casos
 * multi-serie): un estudio anonimizado pertenece a un caso de la bitácora del
 * alumno o a un caso del banco curado (Studio/Casos → Biblioteca).
 */
export type TablaEstudioDicom = 'bitacora_casos' | 'casos_biblioteca';

/**
 * Una FUENTE subida por el cliente para un caso: un `.dcm` suelto (una serie) o un
 * `.zip` que trae varias series de un mismo estudio. El binario va cliente → object
 * storage directo (§2); aquí solo referencias/URLs firmadas por el `api`.
 */
export interface FuenteDicom {
  /** Orden de subida (para nombrar las claves crudas de forma estable). */
  indice: number;
  /** Clave del binario CRUDO (con PII) en object storage. */
  refCrudo: string;
  /** URL firmada de LECTURA del crudo. */
  urlLecturaCrudo: string;
  /** URL firmada de BORRADO del crudo (se elimina tras anonimizar). */
  urlBorradoCrudo: string;
  /** true si el crudo es un `.zip` que el worker descomprime en N series (§10). */
  esZip: boolean;
}

/**
 * Job `procesar-dicom` (§8, job #2 · rediseño multi-serie). El `api` lo encola tras
 * confirmarse la subida de las FUENTES crudas a object storage; el `worker` las trae,
 * descomprime los `.zip` (adm-zip, server-side · §10), parsea cada `.dcm` (dcmjs),
 * ANONIMIZA (bloqueante) y reescribe un `.dcm` anonimizado por SERIE. Como el número
 * final de series de un `.zip` no se conoce hasta descomprimir, el worker pide al `api`
 * las URLs firmadas de escritura de los anonimizados (patrón worker→servicio, igual que
 * render-tts/notificaciones): el `api` sigue siendo el ÚNICO firmante (§3). Solo
 * referencias/URLs en el payload (nunca el binario ni PII).
 */
export interface ProcesarDicomJob {
  /** Caso al que pertenece el estudio. */
  casoId: string;
  /** Tabla dueña del estudio (bitácora del alumno o banco curado). */
  tabla: TablaEstudioDicom;
  /** Fuentes crudas a procesar (uno o varios `.dcm`/`.zip`). */
  fuentes: FuenteDicom[];
  /**
   * true = AÑADIR estas series a las ya existentes (editar el estudio); false/omitido
   * = reemplazar el estudio. Al anexar, el worker calcula el índice base a partir de
   * las series actuales para no pisar refs.
   */
  anexar?: boolean;
}

/**
 * Petición del worker al `api` para firmar la ESCRITURA de los `.dcm` anonimizados
 * (`POST /dicom/casos/:casoId/ingesta/firmar-anonimizados`). El worker ya conoce el
 * número final de series (tras descomprimir los zips); el `api` firma un PUT por serie.
 */
export interface FirmarAnonimizadosReq {
  tabla: TablaEstudioDicom;
  /** Número de series anonimizadas a persistir (una URL firmada por cada una). */
  cantidad: number;
  /** Índice base (para anexar sin pisar refs existentes). Default 0. */
  desde?: number;
  /**
   * Extensión del binario de CADA serie (`dcm` | `jpg` | `png`), en orden. El estudio
   * puede MEZCLAR DICOM e imágenes web (JPG/PNG extraídas del equipo · §3): el worker,
   * tras husmear el tipo de cada fuente, indica aquí la extensión para que la ref del
   * anonimizado la lleve y el visor elija el loader correcto. Si falta, se asume `dcm`.
   */
  extensiones?: string[];
}

/** Un destino firmado para persistir una serie anonimizada. */
export interface DestinoAnonimizado {
  indice: number;
  /** Clave destino del `.dcm` anonimizado en object storage. */
  ref: string;
  /** URL firmada de ESCRITURA de esa serie. */
  urlSubida: string;
}

/**
 * Destino firmado del THUMBNAIL del estudio (JPEG del primer frame YA redactado · §10).
 * Vive bajo `media/imagenes/casos/{casoId}/thumb.jpg` → lo sirve la familia B estable
 * (URL firmada cacheable). El worker sube aquí el thumb de la serie 0 al REEMPLAZAR.
 */
export interface DestinoThumb {
  /** Clave del JPEG del thumb en object storage (`media/imagenes/casos/{id}/thumb.jpg`). */
  ref: string;
  /** URL firmada de ESCRITURA del thumb. */
  urlSubida: string;
}

export interface FirmarAnonimizadosResp {
  destinos: DestinoAnonimizado[];
  /** Destino del thumb del caso (serie 0). El worker lo usa solo al reemplazar el estudio. */
  thumb?: DestinoThumb;
}

/**
 * Job `generar-derivados-imagen` (Fase 2 entrega): genera variantes webp responsivas de una
 * imagen de CONTENIDO (`media/imagenes/{id}.{ext}`) tras publicarse un post de imagen. El `api`
 * firma TODO por adelantado (los anchos se conocen · §3 único firmante): URL interna de lectura
 * del original + un PUT interno por derivado. El worker solo baja → redimensiona (sharp) → sube.
 * Best-effort: si falla, el feed cae al original (fallback). No toca el original ni PII.
 */
export interface DestinoDerivado {
  /** Ancho objetivo en px (640 | 1080 | 1600). */
  ancho: number;
  /** Clave destino del derivado (`media/imagenes/{id}/{ancho}.webp`). */
  ref: string;
  /** URL firmada de ESCRITURA del derivado. */
  urlSubida: string;
}

export interface GenerarDerivadosImagenJob {
  /** Ref del original de contenido (`media/imagenes/{id}.{ext}`). */
  ref: string;
  /** URL firmada de LECTURA del original (interna; la usa el worker). */
  urlLectura: string;
  /** Un destino por ancho a generar. */
  destinos: DestinoDerivado[];
}

/**
 * Job `indexar-rag` (§8, job #10). El `api` lo encola al crear/curar un caso,
 * rúbrica o material; el `worker` hace chunk → embedding (servicio local) → upsert
 * en pgvector (`lxp.documentos_rag`). Asíncrono: la latencia no importa aquí.
 * Solo referencias (el worker LEE el texto fuente de la BD), nunca el binario.
 */
export interface IndexarRagJob {
  /** Origen del contenido a indexar (para trazar y re-indexar al cambiar).
   *  `contenido` = teoría de una lección (fuenteId = leccion_id). */
  fuenteTipo: 'caso_biblioteca' | 'rubrica' | 'material' | 'contenido';
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
  /**
   * Acota las entregas a una LECCIÓN (modelo nuevo · mig 0023/0026). Es el anclaje
   * preferente: la lección define tipo/rúbrica/reactivos (config).
   */
  leccionId?: string;
  /**
   * Acota a una actividad (modelo viejo, aún vivo). Compat con entregas previas sin
   * `leccion_id`. Si ambos se omiten, evalúa todas las entregas del grupo.
   */
  actividadId?: string;
  /** Qué pre-analizar: entregas de una lección/actividad o casos de bitácora del grupo. */
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

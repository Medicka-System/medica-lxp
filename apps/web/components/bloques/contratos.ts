/**
 * Bloques multimedia e interactivos — CONTRATOS con el backend (§2 · Regla de Oro).
 *
 * Estos bloques son el "editor a fondo" de cada tipo de contenido (§5B): el diseñador
 * arma el bloque en el Studio; el alumno lo consume en la lección / videoteca. La
 * pieza de UI vive aquí (client), pero **todo lo que requiere object storage, un
 * servidor persistente o cómputo de fondo NO se implementa en el front** — se declara
 * como contrato y lo resuelven `apps/api` + `apps/worker`.
 *
 * Reparto (§2):
 *  - Servir/firmar media, servir H5P, descomprimir/validar paquetes SCORM/xAPI y
 *    generar TTS/transcripción → **dominio (api/worker)**. Aquí se consume por contrato.
 *  - La config del bloque (hitos, hotspots, etiquetas) es dato de `lxp.contenidos`;
 *    se persiste por CRUD web→Supabase bajo RLS. Estos componentes son **controlados**:
 *    exponen su estado por `onCambio` y el contenedor (el builder) decide cuándo guardar.
 *
 * ── Endpoints que habilitan estos bloques (PENDIENTE DE API) ──────────────────────
 *
 *  MEDIA (video/audio/imagen de base para interactivo · Sprint 6, servicio de media)
 *    GET  /media/url?ref=<recursoRef>
 *      → { url: string; expiraEn: string }                 URL firmada (Stream / object storage)
 *
 *  TRANSCRIPCIÓN Y TTS (video/audio · backend, worker)
 *    GET  /media/transcripcion?ref=<recursoRef>
 *      → { formato: 'vtt' | 'json'; cues: CueTranscripcion[] }   generada de forma asíncrona
 *    POST /media/tts        { texto, voz? } → { ref, url }        síntesis de voz (audio del bloque)
 *
 *  H5P (servidor self-host · @lumieducation/h5p-server en api)
 *    GET  /h5p/editor/:contentId?           → payload de edición (libraries, params, ajax base)
 *    POST /h5p/editor/:contentId?           → guarda el contenido, devuelve { contentId }
 *    GET  /h5p/play/:contentId              → payload de reproducción (emite xAPI al LRS)
 *    (los sub-endpoints AJAX de H5P los sirve el mismo servidor bajo /h5p/ajax)
 *
 *  PAQUETES SCORM / xAPI (Articulate · descompresión con adm-zip + fast-xml-parser en api)
 *    POST /paquetes                          sube el .zip → cola de ingesta
 *      → { paqueteId, estado: 'procesando' }
 *    GET  /paquetes/:paqueteId               estado + manifiesto parseado
 *      → { estado, tipo: 'scorm12'|'scorm2004'|'xapi', titulo, lanzador, error? }
 *    GET  /scorm/play/:paqueteId             iframe del player SCORM (postMessage de progreso)
 *    GET  /xapi/play/:paqueteId              iframe del paquete xAPI (reporta al LRS)
 *
 * Mientras un endpoint no exista, el bloque se degrada con dignidad: muestra su marco
 * real + un aviso claro del contrato que lo habilita. Nunca inventa la reproducción.
 */

/** Cue de transcripción sincronizado con el tiempo del media. */
export type CueTranscripcion = {
  /** Inicio en segundos. */
  inicio: number;
  /** Fin en segundos. */
  fin: number;
  /** Texto del segmento. */
  texto: string;
  /** Locutor opcional (clases con varias voces). */
  locutor?: string;
};

/** Hito de consulta rápida sobre la línea de tiempo de un video (marcador + salto). */
export type HitoVideo = {
  id: string;
  /** Momento del video en segundos. */
  tiempo: number;
  /** Rótulo corto que se ve en la lista y el marcador. */
  titulo: string;
  /** Nota opcional de contexto. */
  nota?: string;
};

/** Punto interactivo (hotspot) sobre una imagen o frame de video. */
export type Hotspot = {
  id: string;
  /** Posición relativa 0..1 respecto al ancho de la base. */
  x: number;
  /** Posición relativa 0..1 respecto al alto de la base. */
  y: number;
  /** Etiqueta corta que ancla el punto. */
  etiqueta: string;
  /** Descripción que se revela al activar el hotspot. */
  descripcion?: string;
};

/**
 * Resuelve una URL firmada de media (GET /media/url). PENDIENTE DE API: mientras no
 * exista el servicio, devuelve null y el bloque muestra su estado de "media pendiente".
 * El contenedor puede inyectar su propia implementación cuando el endpoint esté listo.
 */
export type ResolverMedia = (recursoRef: string) => Promise<{ url: string; expiraEn: string } | null>;

/** Implementación por defecto: contrato aún no cableado (Sprint 6 · servicio de media). */
export const resolverMediaPendiente: ResolverMedia = async () => null;

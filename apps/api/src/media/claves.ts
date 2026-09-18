/**
 * Claves de object storage para media (§3/§9 · Sprint 6). PURO y sin dependencias:
 * el binario (video/grabación/paquete) vive en object storage — nunca en Postgres ni
 * en el VPS. Estas funciones componen la ruta; el firmado lo hace `StorageService`
 * (reusa el SigV4 del Sprint 4.7, no se duplica).
 */

/** Video instruccional subido por staff (fuente original en la videoteca). */
export function claveVideo(videotecaId: string): string {
  return `media/videos/${videotecaId}/original`;
}

/** Grabación de una clase (ingesta desde Zoom → object storage). */
export function claveGrabacion(videotecaId: string): string {
  return `media/grabaciones/${videotecaId}/original`;
}

/** Paquete de contenido empaquetado (H5P/SCORM/xAPI) subido en Contenido. */
export function clavePaquete(contenidoId: string): string {
  return `media/paquetes/${contenidoId}/paquete.zip`;
}

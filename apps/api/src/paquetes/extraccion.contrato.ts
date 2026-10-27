import { z } from 'zod';

/**
 * Contrato de la EXTRACCIÓN de paquetes SCORM/xAPI (Pieza 1 · §7). El nombre de la cola
 * vive AQUÍ, no en `@campus/shared`: la Pieza 1 no toca el paquete compartido, así que el
 * `api` (productor) y el `worker` (consumidor) comparten el literal `'extraer-paquete'`
 * replicándolo en cada app con el mismo valor. Es una cola interna del propio dominio de
 * paquetes, no un verbo de negocio transversal.
 */
export const QUEUE_EXTRAER_PAQUETE = 'extraer-paquete';

/** Cola hermana para el BORRADO del paquete (zip privado + árbol extraído público). */
export const QUEUE_BORRAR_PAQUETE = 'borrar-paquete';

/** Payload del job: solo el id; el worker pide al `api` las URLs firmadas (nunca firma él). */
export interface ExtraerPaqueteJob {
  contenidoId: string;
}

/** Payload del borrado: el id del paquete (sus dos prefijos se derivan de él). */
export interface BorrarPaqueteJob {
  contenidoId: string;
}

/** Body de `POST /paquetes/:contenidoId/firmar-extraccion` (lo manda el worker). */
export const firmarExtraccionSchema = z.object({
  // Vacío → el worker solo quiere el GET del .zip (fase 1, antes de descomprimir).
  // Con nombres → quiere los PUT por entrada (fase 2, ya conoce el árbol del .zip).
  entryNames: z.array(z.string().min(1)).default([]),
});
export type FirmarExtraccion = z.infer<typeof firmarExtraccionSchema>;

/** Un PUT firmado por archivo del paquete descomprimido. */
export interface SubidaFirmada {
  entryName: string;
  url: string;
}

/** Respuesta de `firmar-extraccion`: siempre el GET del .zip + (si se pidieron) los PUT. */
export interface FirmarExtraccionResultado {
  urlLecturaZip: string;
  subidas: SubidaFirmada[];
}

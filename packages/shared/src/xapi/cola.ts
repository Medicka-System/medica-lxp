/**
 * Contrato de la cola `envio-xapi` (§8, job #1) — compartido entre el productor
 * (`api`) y el consumidor (`worker`). El nombre y la forma del job viven aquí para
 * que ambos lados no se desincronicen.
 */
import type { Statement } from './esquemas';

/** Nombre de la cola BullMQ de envío al LRS. */
export const QUEUE_ENVIO_XAPI = 'envio-xapi' as const;

/** Payload del job: un statement ya construido y validado, listo para el LRS. */
export interface EnvioXapiJob {
  statement: Statement;
}

/**
 * Opciones de reintento del job (§8: "cada uno con reintentos y backoff"). El
 * productor las aplica al encolar; el worker solo lanza en error y BullMQ
 * reprograma. Con la idempotencia por `statement.id`, reintentar es seguro.
 */
export const OPCIONES_REINTENTO_XAPI = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false, // conservar fallidos para inspección (no se pierde el job)
} as const;

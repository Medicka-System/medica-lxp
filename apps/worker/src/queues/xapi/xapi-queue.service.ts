import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import {
  QUEUE_ENVIO_XAPI,
  XAPI_VERSION,
  type EnvioXapiJob,
} from '@campus/shared';

/**
 * Consumidor de la cola `envio-xapi` (§8, job #1): envía statements al LRS con
 * **buffer + retry** (nunca síncrono al request del usuario · §7). El productor
 * (api) fija los reintentos (attempts/backoff) al encolar; aquí solo POSTeamos al
 * LRS y, si falla, LANZAMOS para que BullMQ reprograme el job — no se pierde.
 *
 * La idempotencia la garantiza `statement.id` (asignado en `emitirStatement`): un
 * reintento reenvía el mismo id y el LRS lo deduplica.
 */
@Injectable()
export class XapiQueueService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(XapiQueueService.name);
  private connection?: Redis;
  private worker?: Worker<EnvioXapiJob>;

  onModuleInit(): void {
    const redisUrl =
      process.env.REDIS_URL ??
      `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`;

    // BullMQ exige maxRetriesPerRequest: null en la conexión del worker.
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.worker = new Worker<EnvioXapiJob>(
      QUEUE_ENVIO_XAPI,
      (job) => this.enviarAlLrs(job),
      { connection: this.connection },
    );

    this.worker.on('ready', () => {
      this.logger.log(
        `Worker conectado a Redis (${redisUrl}). Consumiendo "${QUEUE_ENVIO_XAPI}".`,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`Statement ${job.data.statement.id} enviado al LRS.`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.warn(
        `Envío al LRS falló (intento ${job?.attemptsMade}/${job?.opts.attempts ?? '?'}): ${err.message}. Se reintentará.`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`Error en la cola "${QUEUE_ENVIO_XAPI}": ${err.message}`);
    });
  }

  /** POST del statement al LRS. Lanza en fallo → BullMQ reintenta con backoff. */
  private async enviarAlLrs(job: Job<EnvioXapiJob>): Promise<{ ids: unknown }> {
    const endpoint = process.env.LRS_ENDPOINT ?? 'http://localhost:8080/xapi';
    const key = process.env.LRS_KEY ?? '';
    const secret = process.env.LRS_SECRET ?? '';
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');

    const res = await fetch(`${endpoint}/statements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Experience-API-Version': XAPI_VERSION,
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(job.data.statement),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      // Lanzar hace que BullMQ reintente (el job NO se pierde · §8).
      throw new Error(`LRS respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`);
    }

    return { ids: await res.json().catch(() => null) };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    this.connection?.disconnect();
    this.logger.log('Worker de xAPI y conexión a Redis cerrados.');
  }
}

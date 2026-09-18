import { Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import { redisUrl } from '../redis';

/**
 * Base de los consumidores BullMQ (§8): monta el Worker, loggea completado/fallo,
 * y cierra en el shutdown. Cada job concreto define `nombre` y `procesar`. Si
 * `procesar` lanza, BullMQ reintenta con backoff (attempts los fija el productor).
 */
export abstract class TrabajadorBase implements OnModuleInit, OnApplicationShutdown {
  protected abstract readonly nombre: string;
  protected readonly logger = new Logger(this.constructor.name);
  private conexion?: Redis;
  private worker?: Worker;

  abstract procesar(job: Job): Promise<unknown>;

  onModuleInit(): void {
    this.conexion = new IORedis(redisUrl(), { maxRetriesPerRequest: null });
    this.worker = new Worker(this.nombre, (job) => this.procesar(job), {
      connection: this.conexion,
    });
    this.worker.on('ready', () => this.logger.log(`Consumiendo "${this.nombre}".`));
    this.worker.on('completed', (job) =>
      this.logger.log(`Job ${job.id} de "${this.nombre}" ok.`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(
        `Job de "${this.nombre}" falló (intento ${job?.attemptsMade}): ${err.message}. Se reintentará.`,
      ),
    );
    this.worker.on('error', (err) =>
      this.logger.error(`Error en "${this.nombre}": ${err.message}`),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    this.conexion?.disconnect();
  }
}

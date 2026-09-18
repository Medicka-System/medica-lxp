import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import { OPCIONES_REINTENTO_DOMINIO } from '@campus/shared';

/**
 * Productor de colas de dominio del `api` (§2/§8): los módulos de dominio ENCOLAN
 * comandos (recalcular competencia, detectar hitos…) hacia el worker. No es proxy
 * de CRUD: es orquestación (permitido en `api`). Una conexión Redis reusada.
 */
@Injectable()
export class ColasProducer implements OnModuleDestroy {
  private readonly conexion: Redis = new IORedis(
    process.env.REDIS_URL ??
      `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`,
    { maxRetriesPerRequest: null },
  );
  private readonly colas = new Map<string, Queue>();

  private cola(nombre: string): Queue {
    let q = this.colas.get(nombre);
    if (!q) {
      q = new Queue(nombre, { connection: this.conexion });
      this.colas.set(nombre, q);
    }
    return q;
  }

  async encolar(
    nombre: string,
    data: object,
    opts: JobsOptions = { ...OPCIONES_REINTENTO_DOMINIO },
  ): Promise<string> {
    const job = await this.cola(nombre).add(nombre, data, opts);
    return job.id ?? '';
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.colas.values()) await q.close();
    this.conexion.disconnect();
  }
}

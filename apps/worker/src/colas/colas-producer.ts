import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';
import { OPCIONES_REINTENTO_DOMINIO } from '@campus/shared';
import { redisUrl } from '../redis';

/**
 * Productor de colas del worker: encola jobs de la cadena de dominio (§8) y
 * statements a `envio-xapi` (capa del Sprint 2). Una sola conexión Redis reusada
 * por todas las colas.
 */
@Injectable()
export class ColasProducer implements OnApplicationShutdown {
  private readonly conexion: Redis = new IORedis(redisUrl(), {
    maxRetriesPerRequest: null,
  });
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

  async onApplicationShutdown(): Promise<void> {
    for (const q of this.colas.values()) await q.close();
    this.conexion.disconnect();
  }
}

import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_DETECCION_HITO,
  QUEUE_EMISION_CERTIFICADO,
  QUEUE_OTORGAR_BADGES,
  detectarHitos,
  type AlumnoJob,
  type HitoJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';
import { horasDeCompetencia } from './repositorio';

/**
 * `deteccion-hito` (§8, job #7): al acumular horas, detecta hitos recién cruzados
 * (100/500/1000) que aún no estén registrados, los inserta y encola certificado y
 * badges. Idempotente (unique por alumno+tipo).
 */
@Injectable()
export class DeteccionHitoWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_DETECCION_HITO;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(job: Job<AlumnoJob>): Promise<{ nuevos: number }> {
    const sql = this.db.sql;
    const { alumnoId } = job.data;

    const horas = await horasDeCompetencia(sql, alumnoId);
    const existentes = (
      await sql<{ tipo: string }[]>`select tipo from lxp.hitos where id_alumno = ${alumnoId}`
    ).map((r) => r.tipo);

    const nuevos = detectarHitos(horas, existentes);
    for (const h of nuevos) {
      await sql`
        insert into lxp.hitos (id_alumno, tipo, horas_umbral)
        values (${alumnoId}, ${h.tipo}, ${h.horas_umbral})
        on conflict (id_alumno, tipo) do nothing`;
      await this.colas.encolar(QUEUE_EMISION_CERTIFICADO, {
        alumnoId,
        tipo: h.tipo,
        horas_umbral: h.horas_umbral,
      } satisfies HitoJob);
      await this.colas.encolar(QUEUE_OTORGAR_BADGES, { alumnoId } satisfies AlumnoJob);
    }

    if (nuevos.length > 0) {
      this.logger.log(`Hitos nuevos de ${alumnoId}: ${nuevos.map((h) => h.tipo).join(', ')}.`);
    }
    return { nuevos: nuevos.length };
  }
}

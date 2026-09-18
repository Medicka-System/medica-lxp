import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_DETECCION_DECAIMIENTO,
  QUEUE_PROGRAMAR_REPASO,
  calcularCompetencia,
  estaEnCaida,
  type AlumnoJob,
  type RepasoJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';
import { casosAprobados } from './repositorio';

/**
 * `deteccion-decaimiento` (§8, job #5): recomputa la competencia "a hoy" y marca
 * los dominios cuya retención cayó (curva de olvido). Por cada dominio en caída,
 * encola `programar-repaso`. Corre como cron global (sin alumno) o dirigido.
 */
@Injectable()
export class DeteccionDecaimientoWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_DETECCION_DECAIMIENTO;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(job: Job<Partial<AlumnoJob>>): Promise<{ marcados: number }> {
    const sql = this.db.sql;
    const alumnoId = job.data?.alumnoId;

    const alumnos = alumnoId
      ? [alumnoId]
      : (
          await sql<{ id: string }[]>`
            select distinct id_alumno as id from lxp.competencia_dominios`
        ).map((r) => r.id);

    let marcados = 0;
    const ahora = new Date();
    for (const id of alumnos) {
      const proyeccion = calcularCompetencia(await casosAprobados(sql, id), ahora);
      for (const p of proyeccion) {
        await sql`
          update lxp.competencia_dominios
             set decaimiento = ${p.decaimiento}, nivel = ${p.nivel}, actualizado_en = now()
           where id_alumno = ${id} and dominio_iaim = ${p.dominio_iaim}::lxp.dominio_iaim`;
        if (estaEnCaida(p.decaimiento)) {
          marcados++;
          await this.colas.encolar(QUEUE_PROGRAMAR_REPASO, {
            alumnoId: id,
            dominio_iaim: p.dominio_iaim,
          } satisfies RepasoJob);
        }
      }
    }

    this.logger.log(`Decaimiento: ${marcados} dominio(s) en caída sobre ${alumnos.length} alumno(s).`);
    return { marcados };
  }
}

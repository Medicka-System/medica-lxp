import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_CALCULO_COMPETENCIA,
  QUEUE_DETECCION_HITO,
  QUEUE_ENVIO_XAPI,
  QUEUE_OTORGAR_BADGES,
  OPCIONES_REINTENTO_XAPI,
  actividad,
  actorDeUsuario,
  calcularCompetencia,
  emitirStatement,
  verbo,
  type AlumnoJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';
import { casosAprobados } from './repositorio';

/**
 * `calculo-competencia` (§8, job #4): al aprobarse un caso, recalcula
 * `competencia_dominios` del alumno (horas/nivel/decaimiento por dominio I-AIM) y
 * emite xAPI `experimentó` por dominio (capa Sprint 2). Encadena hitos y badges.
 */
@Injectable()
export class CalculoCompetenciaWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_CALCULO_COMPETENCIA;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(job: Job<AlumnoJob>): Promise<{ dominios: number }> {
    const { alumnoId } = job.data;
    const sql = this.db.sql;

    const casos = await casosAprobados(sql, alumnoId);
    const proyeccion = calcularCompetencia(casos, new Date());

    for (const p of proyeccion) {
      await sql`
        insert into lxp.competencia_dominios
          (id_alumno, dominio_iaim, horas, nivel, decaimiento, actualizado_en)
        values (${alumnoId}, ${p.dominio_iaim}::lxp.dominio_iaim,
                ${p.horas}, ${p.nivel}, ${p.decaimiento}, now())
        on conflict (id_alumno, dominio_iaim) do update
          set horas = excluded.horas,
              nivel = excluded.nivel,
              decaimiento = excluded.decaimiento,
              actualizado_en = now()`;

      // xAPI: el alumno "experimentó" el dominio I-AIM, con su nivel como score.
      const statement = emitirStatement(
        actorDeUsuario(alumnoId),
        verbo('experimento'),
        actividad('dominio_iaim', p.dominio_iaim),
        { score: { scaled: Math.max(0, Math.min(1, p.nivel / 100)) } },
      );
      await this.colas.encolar(QUEUE_ENVIO_XAPI, { statement }, { ...OPCIONES_REINTENTO_XAPI });
    }

    // Cadena de dominio: ¿nuevos hitos? ¿nuevos badges?
    await this.colas.encolar(QUEUE_DETECCION_HITO, { alumnoId } satisfies AlumnoJob);
    await this.colas.encolar(QUEUE_OTORGAR_BADGES, { alumnoId } satisfies AlumnoJob);

    this.logger.log(`Competencia recalculada para ${alumnoId}: ${proyeccion.length} dominio(s).`);
    return { dominios: proyeccion.length };
  }
}

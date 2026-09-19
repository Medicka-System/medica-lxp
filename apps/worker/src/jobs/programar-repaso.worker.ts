import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_NOTIFICACIONES,
  QUEUE_PROGRAMAR_REPASO,
  proximoRepaso,
  type DominioIaim,
  type NotificacionJob,
  type RepasoJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';
import { casosAprobados } from './repositorio';

/**
 * `programar-repaso` (§8, job #6): agenda el reexamen de un dominio del alumno
 * según la curva de olvido (última práctica + intervalo escalado por nivel).
 * Escribe `competencia_dominios.proximo_repaso`.
 */
@Injectable()
export class ProgramarRepasoWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_PROGRAMAR_REPASO;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(job: Job<RepasoJob>): Promise<{ proximo_repaso: string | null }> {
    const sql = this.db.sql;
    const { alumnoId, dominio_iaim } = job.data;

    const casos = (await casosAprobados(sql, alumnoId)).filter(
      (c) => c.dominio_iaim === dominio_iaim,
    );
    if (casos.length === 0) return { proximo_repaso: null };

    const ultima = casos.map((c) => c.fecha).sort().at(-1) ?? new Date().toISOString();
    const filas = await sql<{ nivel: number }[]>`
      select nivel::float8 as nivel from lxp.competencia_dominios
      where id_alumno = ${alumnoId} and dominio_iaim = ${dominio_iaim}::lxp.dominio_iaim`;
    const nivel = filas[0]?.nivel ?? 0;

    const fecha = proximoRepaso(ultima, nivel, dominio_iaim as DominioIaim, new Date());
    await sql`
      update lxp.competencia_dominios
         set proximo_repaso = ${fecha}::date, actualizado_en = now()
       where id_alumno = ${alumnoId} and dominio_iaim = ${dominio_iaim}::lxp.dominio_iaim`;

    // Notifica al alumno el repaso agendado (§8 job #12): repaso espaciado a nivel
    // de concepto — el aviso llega cuando toca refrescar el dominio.
    await this.colas.encolar(QUEUE_NOTIFICACIONES, {
      userId: alumnoId,
      tipo: 'repaso_sugerido',
      entidadTipo: 'dominio_iaim',
      datos: { dominio: dominio_iaim, fecha: fecha.slice(0, 10) },
    } satisfies NotificacionJob);

    this.logger.log(`Repaso de ${dominio_iaim} para ${alumnoId}: ${fecha.slice(0, 10)}.`);
    return { proximo_repaso: fecha };
  }
}

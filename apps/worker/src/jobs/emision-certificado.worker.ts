import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_EMISION_CERTIFICADO,
  QUEUE_NOTIFICACIONES,
  generarFolio,
  tituloCertificado,
  type HitoJob,
  type NotificacionJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';

/**
 * `emision-certificado` (§8, job #8): genera y registra el certificado de un hito.
 * Folio determinista → idempotente (unique). No sobre-emite si ya existe.
 */
@Injectable()
export class EmisionCertificadoWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_EMISION_CERTIFICADO;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(
    job: Job<HitoJob>,
  ): Promise<{ folio: string; emitido: boolean }> {
    const sql = this.db.sql;
    const { alumnoId, tipo } = job.data;

    const folio = generarFolio(alumnoId, tipo);
    const titulo = tituloCertificado(tipo);
    const hito = await sql<{ id: string }[]>`
      select id from lxp.hitos where id_alumno = ${alumnoId} and tipo = ${tipo} limit 1`;

    const insertado = await sql<{ id: string }[]>`
      insert into lxp.certificados (id_alumno, hito_id, folio, titulo)
      values (${alumnoId}, ${hito[0]?.id ?? null}, ${folio}, ${titulo})
      on conflict (folio) do nothing
      returning id`;

    const emitido = insertado.length > 0;
    if (emitido) {
      this.logger.log(`Certificado ${folio} emitido para ${alumnoId}.`);
      // Notifica al alumno que su certificado está listo (§8 job #12). Solo al emitir
      // (folio único → idempotente): no re-notifica si ya existía.
      await this.colas.encolar(QUEUE_NOTIFICACIONES, {
        userId: alumnoId,
        tipo: 'certificado_emitido',
        entidadTipo: 'certificado',
        entidadId: insertado[0]?.id,
        datos: { folio, titulo },
      } satisfies NotificacionJob);
    }
    return { folio, emitido };
  }
}

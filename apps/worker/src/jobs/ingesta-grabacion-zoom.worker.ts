import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_INGESTA_GRABACION_ZOOM,
  QUEUE_ENVIO_XAPI,
  OPCIONES_REINTENTO_XAPI,
  actividad,
  actorDeUsuario,
  emitirStatement,
  verbo,
  type IngestaGrabacionZoomJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';

/**
 * `ingesta-grabacion-zoom` (§8, job #3 · Sprint 6): al llegar el webhook
 * `recording.completed` (firma ya validada por el `api`), este worker DESCARGA la
 * grabación de Zoom y la SUBE a object storage — las grabaciones NO se quedan en Zoom
 * Cloud (caro/limitado a 800 alumnos · §9). Luego marca la fila de videoteca `listo` y
 * emite xAPI de disponibilidad de la clase.
 *
 * El `api` es el signer: la URL firmada de subida viaja en el job (el worker no firma).
 * El binario nunca pasa por el `api` (Regla de Oro §2): Zoom → worker → object storage.
 */
@Injectable()
export class IngestaGrabacionZoomWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_INGESTA_GRABACION_ZOOM;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(
    job: Job<IngestaGrabacionZoomJob>,
  ): Promise<{ videotecaId: string; bytes: number }> {
    const {
      videotecaId,
      claseId,
      refDestino,
      urlDescargaZoom,
      tokenDescarga,
      urlSubidaDestino,
      docenteId,
      titulo,
    } = job.data;
    const sql = this.db.sql;

    try {
      // 1) Descargar la grabación de Zoom (URL temporal + token si aplica).
      const binario = await this.descargar(urlDescargaZoom, tokenDescarga);

      // 2) Subir a object storage con la URL firmada que dio el `api`.
      await this.subir(urlSubidaDestino, binario);

      // 3) Marcar la videoteca `listo` con la referencia del binario ya subido.
      await sql`
        update lxp.videoteca
        set estado = 'listo', recurso_ref = ${refDestino}
        where id = ${videotecaId}`;

      // 4) Emitir xAPI de disponibilidad de la grabación de la clase.
      await this.emitirDisponibilidad(claseId, docenteId, titulo);

      this.logger.log(
        `Grabación ${videotecaId} de la clase ${claseId} ingerida (${binario.length} bytes).`,
      );
      return { videotecaId, bytes: binario.length };
    } catch (err) {
      await sql`update lxp.videoteca set estado = 'error' where id = ${videotecaId}`;
      throw err; // BullMQ reintenta con backoff.
    }
  }

  private async descargar(url: string, token?: string): Promise<Buffer> {
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!resp.ok) {
      throw new Error(`No se pudo descargar la grabación de Zoom (${resp.status}).`);
    }
    return Buffer.from(await resp.arrayBuffer());
  }

  private async subir(url: string, binario: Buffer): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'video/mp4' },
      body: binario,
    });
    if (!resp.ok) {
      throw new Error(`No se pudo subir la grabación a object storage (${resp.status}).`);
    }
  }

  /** Encola un statement `completó` sobre la actividad `clase` (grabación disponible). */
  private async emitirDisponibilidad(
    claseId: string,
    docenteId?: string,
    titulo?: string,
  ): Promise<void> {
    // El actor es el docente de la clase; si no consta, se usa el propio claseId como
    // agente de sistema (identidad estable) para no perder la traza de disponibilidad.
    const stmt = emitirStatement(
      actorDeUsuario(docenteId ?? claseId),
      verbo('completo'),
      actividad('clase', claseId, titulo),
      { completion: true },
    );
    await this.colas.encolar(QUEUE_ENVIO_XAPI, { statement: stmt }, { ...OPCIONES_REINTENTO_XAPI });
  }
}

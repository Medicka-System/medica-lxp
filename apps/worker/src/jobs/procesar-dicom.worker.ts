import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_PROCESAR_DICOM, type ProcesarDicomJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import { anonimizarDicomBinario } from './dicom/anonimizacion-binaria';

/**
 * `procesar-dicom` (§8, job #2 · Sprint 4.7 · rama dicom-upload): al confirmarse la
 * subida de un estudio, trae el binario `.dcm` CRUDO de object storage, lo parsea con
 * dcmjs, lo ANONIMIZA de forma BLOQUEANTE (quita PII del paciente, §10) y reescribe un
 * `.dcm` anonimizado que persiste + su traza. NINGÚN caso educativo se guarda con PII:
 * si algo sobrevive a la verificación, el job falla (reintenta) y no se fija la
 * referencia del estudio.
 *
 * El binario vive en object storage; el `api` (signer) provee URLs firmadas en el
 * job — este worker solo hace fetch/put/delete, no firma. El `.dcm` anonimizado es el
 * que carga el visor Cornerstone3D vía `wadouri:` (URL firmada de lectura).
 */
@Injectable()
export class ProcesarDicomWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_PROCESAR_DICOM;

  constructor(private readonly db: DbService) {
    super();
  }

  async procesar(job: Job<ProcesarDicomJob>): Promise<{ casoId: string; series: number }> {
    const { casoId, refAnonimizado, urlLecturaCrudo, urlSubidaAnonimizado, urlBorradoCrudo } =
      job.data;
    const sql = this.db.sql;

    try {
      await sql`
        update lxp.bitacora_casos set estudio_estado = 'procesando'
        where id = ${casoId}`;

      // 1) Traer el binario `.dcm` crudo (con PII) desde object storage.
      const crudo = await this.leerBinario(urlLecturaCrudo);

      // 2) Parsear + anonimizar + 3) VERIFICAR bloqueante (§10): nada persiste con PII.
      //    `anonimizarDicomBinario` lanza si sobrevive PII.
      const { buffer, traza, series: seriesAnon } = anonimizarDicomBinario(crudo);

      // 4) Guardar el `.dcm` ANONIMIZADO y 5) borrar el crudo (PII fuera del storage).
      await this.subirBinario(urlSubidaAnonimizado, buffer);
      await this.borrarCrudo(urlBorradoCrudo);

      // 6) Persistir metadatos + traza. La referencia del estudio educativo se fija
      //    SOLO ahora, junto con anonimizado_en (lo exige el CHECK de 0014).
      const series = seriesAnon.map((s) => ({
        series_uid: s.series_uid,
        modalidad: s.modalidad,
        frames: s.frames,
        instancias: s.instancias,
        ref: refAnonimizado,
      }));
      await sql`
        update lxp.bitacora_casos
        set estudio_estado   = 'anonimizado',
            estudio_dicom_ref = ${refAnonimizado},
            estudio_series    = ${sql.json(series)},
            anonimizacion     = ${sql.json({ ...traza })},
            anonimizado_en    = now()
        where id = ${casoId}`;

      this.logger.log(
        `Caso ${casoId} anonimizado: ${traza.removidos_n} campo(s) PII, ${series.length} serie(s).`,
      );
      return { casoId, series: series.length };
    } catch (err) {
      // Marca el error (sin PII) y relanza para que BullMQ reintente.
      await sql`
        update lxp.bitacora_casos set estudio_estado = 'error' where id = ${casoId}`;
      throw err;
    }
  }

  /** Descarga el binario del estudio (crudo o anonimizado) como ArrayBuffer. */
  private async leerBinario(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`No se pudo leer el estudio crudo (${resp.status}).`);
    }
    const buf = await resp.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new Error('El estudio crudo está vacío.');
    }
    return buf;
  }

  private async subirBinario(url: string, buffer: Buffer): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/dicom' },
      // Vista tipada del Buffer (evita enviar el pool subyacente completo).
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) {
      throw new Error(`No se pudo guardar el estudio anonimizado (${resp.status}).`);
    }
  }

  private async borrarCrudo(url: string): Promise<void> {
    const resp = await fetch(url, { method: 'DELETE' });
    // 204/200 ok; 404 = ya no está (idempotente). Otros → error para reintentar.
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`No se pudo borrar el estudio crudo (${resp.status}).`);
    }
  }
}

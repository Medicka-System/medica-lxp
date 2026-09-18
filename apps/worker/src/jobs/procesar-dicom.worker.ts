import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_PROCESAR_DICOM, type ProcesarDicomJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import {
  anonimizarEstudio,
  verificarSinPII,
  type EstudioDicom,
} from './dicom/anonimizacion';

/**
 * `procesar-dicom` (§8, job #2 · Sprint 4.7): al confirmarse la subida de un
 * estudio, lo parsea, lo ANONIMIZA de forma BLOQUEANTE (quita PII del paciente,
 * §10) y persiste metadatos (series/multi-frame) + traza. NINGÚN caso educativo se
 * guarda con PII: si algo sobrevive a la verificación, el job falla (reintenta) y
 * no se fija la referencia del estudio.
 *
 * El binario vive en object storage; el `api` (signer) provee URLs firmadas en el
 * job — este worker solo hace fetch, no firma. El parseo P10 real (dcmjs) se cablea
 * en integración (dependencia a acordar); aquí el crudo es el dataset ya parseado.
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

      // 1) Traer el estudio crudo (con PII) desde object storage.
      const estudioCrudo = await this.leerEstudio(urlLecturaCrudo);

      // 2) Anonimizar (puro) + 3) VERIFICAR bloqueante (§10): nada persiste con PII.
      const { estudio, traza } = anonimizarEstudio(estudioCrudo);
      const restos = verificarSinPII(estudio);
      if (restos.length > 0) {
        throw new Error(
          `Anonimización incompleta del caso ${casoId}: sobrevive PII → ${restos.join(', ')}`,
        );
      }

      // 4) Guardar el estudio ANONIMIZADO y 5) borrar el crudo (PII fuera del storage).
      await this.subirEstudio(urlSubidaAnonimizado, estudio);
      await this.borrarCrudo(urlBorradoCrudo);

      // 6) Persistir metadatos + traza. La referencia del estudio educativo se fija
      //    SOLO ahora, junto con anonimizado_en (lo exige el CHECK de 0014).
      const series = estudio.series.map((s) => ({
        series_uid: s.series_uid,
        modalidad: s.modalidad,
        frames: s.frames,
        instancias: s.instancias ?? null,
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

  /** Lee y valida el estudio crudo (JSON del dataset parseado). */
  private async leerEstudio(url: string): Promise<EstudioDicom> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`No se pudo leer el estudio crudo (${resp.status}).`);
    }
    const data = (await resp.json()) as Partial<EstudioDicom>;
    if (!data || typeof data.dataset !== 'object' || !Array.isArray(data.series)) {
      throw new Error('El estudio crudo no tiene la forma esperada {dataset, series}.');
    }
    return {
      study_uid: data.study_uid ?? '',
      dataset: data.dataset,
      series: data.series,
    };
  }

  private async subirEstudio(url: string, estudio: EstudioDicom): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(estudio),
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

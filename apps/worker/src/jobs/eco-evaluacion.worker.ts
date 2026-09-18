import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_ECO_EVALUACION, type EcoEvaluacionJob } from '@campus/shared';
import { TrabajadorBase } from './trabajador-base';

/**
 * `eco-evaluacion` (§8, job #11): pre-análisis EN LOTE de un grupo. El JUICIO (tools
 * → Haiku condicional → Sonnet) vive en `api/src/ai` (§4); este worker aporta el
 * buffer/retry y dispara el lote llamando al `api` (patrón worker→servicio, igual que
 * worker→LRS). El `api` deja las propuestas en `lxp.eco_propuestas` por confianza.
 *
 * Nada se asienta aquí (§7A): la bandeja son borradores; el docente confirma después.
 * Si el `api` no responde, LANZA y BullMQ reintenta con backoff — el lote no se pierde.
 */
@Injectable()
export class EcoEvaluacionWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_ECO_EVALUACION;

  async procesar(job: Job<EcoEvaluacionJob>): Promise<unknown> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const res = await fetch(`${base}/ai/lote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(job.data),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      // Lanzar → BullMQ reintenta (el lote NO se pierde · §8).
      throw new Error(`api /ai/lote respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`);
    }
    const resumen = (await res.json()) as {
      total: number;
      listos: number;
      requierenCriterio: number;
    };
    this.logger.log(
      `eco-evaluacion: grupo ${job.data.grupoId} (${job.data.modo}) → ` +
        `${resumen.total} propuesta(s): ${resumen.listos} listos, ${resumen.requierenCriterio} requieren criterio.`,
    );
    return resumen;
  }
}

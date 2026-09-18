import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_RENDER_TTS, type RenderTtsJob } from '@campus/shared';
import { TrabajadorBase } from './trabajador-base';

/**
 * `render-tts` (course builder): el render (síntesis + subida a object storage) vive
 * en `api/src/tts` porque ahí está el adaptador intercambiable y la key del proveedor
 * (§3/§5). Este worker aporta el buffer/retry y dispara el render llamando al `api`
 * (patrón worker→servicio, igual que `eco-evaluacion`). Si el `api` o el proveedor
 * fallan, LANZA y BullMQ reintenta con backoff — el audio no se pierde.
 */
@Injectable()
export class RenderTtsWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_RENDER_TTS;

  async procesar(job: Job<RenderTtsJob>): Promise<unknown> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const res = await fetch(`${base}/tts/${job.data.audioId}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      // Lanzar → BullMQ reintenta (el render NO se pierde · §8).
      throw new Error(
        `api /tts/${job.data.audioId}/render respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`,
      );
    }
    const r = (await res.json()) as { audioId: string; estado: string };
    this.logger.log(`render-tts: audio ${r.audioId} → ${r.estado}.`);
    return r;
  }
}

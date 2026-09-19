import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NOTIFICACIONES, type NotificacionJob } from '@campus/shared';
import { TrabajadorBase } from './trabajador-base';

/**
 * `notificaciones` (§8, job #12 · Sprint 8.5): buffer/retry del despacho multicanal.
 * El MOTOR (leer preferencia → in-app + correo/WhatsApp por adaptadores) vive en
 * `api/src/notificaciones` (§4, testable · §5); este worker aporta el buffer/retry y
 * dispara el despacho llamando al `api` (patrón worker→servicio, igual que
 * `eco-evaluacion`/`render-tts`).
 *
 * Si el `api` no responde, LANZA → BullMQ reintenta con backoff: la notificación no se
 * pierde. Nunca se envía correo de forma síncrona en el request del usuario (§7 análogo).
 */
@Injectable()
export class NotificacionesWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_NOTIFICACIONES;

  async procesar(job: Job<NotificacionJob>): Promise<unknown> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const res = await fetch(`${base}/notificaciones/despachar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(job.data),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      // Lanzar → BullMQ reintenta (la notificación NO se pierde · §8).
      throw new Error(
        `api /notificaciones/despachar respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`,
      );
    }
    const resultado = (await res.json()) as {
      notificacionId?: string;
      canales: string[];
    };
    this.logger.log(
      `notificaciones: "${job.data.tipo}" → ${job.data.userId} por [${resultado.canales.join(', ') || 'ninguno'}].`,
    );
    return resultado;
  }
}

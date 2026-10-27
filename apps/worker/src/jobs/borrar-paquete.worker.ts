import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { TrabajadorBase } from './trabajador-base';

/**
 * `borrar-paquete` (Pieza 1 · §7): purga de object storage AMBOS prefijos de un paquete
 * SCORM/xAPI cuando su recurso se elimina (usos===0) o se reemplaza —el `.zip` privado
 * (`media/paquetes/{id}/`) y el árbol extraído público (`media/paquetes-extraidos/{id}/`)—
 * para no dejar binario huérfano. Corre en el worker (async + reintento) en vez de bloquear
 * la eliminación del recurso en el web.
 *
 * El `api` es la autoridad de storage (§3): el worker solo DISPARA la purga (`POST
 * /paquetes/:id/purgar`), que lista + borra server-side. Idempotente (prefijo vacío → 0),
 * así que un reintento tras éxito parcial no hace daño.
 */

/** Cola LOCAL replicada del contrato del `api` (Pieza 1 no toca `@campus/shared`). */
const QUEUE_BORRAR_PAQUETE = 'borrar-paquete';

interface BorrarPaqueteJob {
  contenidoId: string;
}

@Injectable()
export class BorrarPaqueteWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_BORRAR_PAQUETE;

  async procesar(
    job: Job<BorrarPaqueteJob>,
  ): Promise<{ contenidoId: string; zip: number; extraido: number }> {
    const { contenidoId } = job.data;
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const resp = await fetch(`${base}/paquetes/${encodeURIComponent(contenidoId)}/purgar`, {
      method: 'POST',
    });
    if (!resp.ok) {
      throw new Error(`El api no pudo purgar el paquete ${contenidoId} (${resp.status}).`);
    }
    const { zip, extraido } = (await resp.json()) as { zip: number; extraido: number };
    this.logger.log(`Paquete ${contenidoId} borrado: ${zip} del .zip + ${extraido} del extraído.`);
    return { contenidoId, zip, extraido };
  }
}

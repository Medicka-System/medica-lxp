import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import sharp from 'sharp';
import {
  CALIDAD_DERIVADO_IMAGEN,
  QUEUE_GENERAR_DERIVADOS_IMAGEN,
  type GenerarDerivadosImagenJob,
} from '@campus/shared';
import { TrabajadorBase } from './trabajador-base';

/**
 * `generar-derivados-imagen` (Fase 2 entrega): genera variantes webp responsivas de una imagen
 * de CONTENIDO del Ateneo para que el feed baje decenas de KB en vez del original (1–2 MB). El
 * `api` firmó TODO por adelantado (lectura interna del original + un PUT interno por ancho · §3);
 * aquí solo se baja → redimensiona (sharp, webp q75, SIN agrandar) → sube. El ORIGINAL queda
 * intacto (zoom/detalle + fallback). NO toca PII: los `.dcm` del visor nunca pasan por aquí.
 *
 * Best-effort por derivado: si uno falla, se registra y se sigue — el feed cae al original para
 * ese ancho (srcset con fallback). Solo si NO se puede leer el original lanza → BullMQ reintenta.
 */
@Injectable()
export class GenerarDerivadosImagenWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_GENERAR_DERIVADOS_IMAGEN;

  async procesar(
    job: Job<GenerarDerivadosImagenJob>,
  ): Promise<{ ref: string; generados: number; total: number }> {
    const { ref, urlLectura, destinos } = job.data;
    const original = await this.leerBinario(urlLectura);

    let generados = 0;
    for (const d of destinos) {
      try {
        const webp = await sharp(original)
          .rotate() // respeta la orientación EXIF antes de redimensionar
          .resize({ width: d.ancho, withoutEnlargement: true }) // NO agranda si el original es menor
          .webp({ quality: CALIDAD_DERIVADO_IMAGEN })
          .toBuffer();
        await this.subirBinario(d.urlSubida, webp, 'image/webp');
        generados++;
      } catch (e) {
        this.logger.warn(
          `Derivado ${d.ancho}px de ${ref} falló (el feed usará el original): ${String(e)}`,
        );
      }
    }
    this.logger.log(`Derivados de ${ref}: ${generados}/${destinos.length} generados.`);
    return { ref, generados, total: destinos.length };
  }

  /** Descarga el binario del original como Buffer. */
  private async leerBinario(url: string): Promise<Buffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`No se pudo leer el original (${resp.status}).`);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.byteLength === 0) throw new Error('El original está vacío.');
    return buf;
  }

  /** Sube un derivado a su URL firmada (content-type webp; la firma solo cubre el host · §3). */
  private async subirBinario(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) throw new Error(`No se pudo subir el derivado (${resp.status}).`);
  }
}

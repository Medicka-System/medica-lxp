import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import sharp from 'sharp';
import { QUEUE_PROCESAR_IMAGEN_REPORTE, type ProcesarImagenReporteJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import { generarDerivadoWebp } from './derivados-sharp';

type EstadoImagen = 'procesando' | 'listo' | 'error';

/** Borde largo del thumb de la card (px) y calidad JPEG. */
const THUMB_BORDE = 480;
const THUMB_CALIDAD = 72;

/**
 * `procesar-imagen-reporte` (§6.5 · galería del reporte clínico). Un REPORTE es el entregable
 * del PACIENTE: conserva su PII — aquí NO se anonimiza (la §10 vive solo en el camino educativo
 * Bitácora/Ateneo, en el handoff reporte→caso con `procesar-dicom`). El original ya está en
 * storage (el navegador lo subió a su clave final); este job SOLO genera, con `sharp` y DEL
 * ORIGINAL, el THUMB (JPEG ~480) y los DERIVADOS webp responsivos. Solo JPG/PNG llegan aquí (el
 * `.dcm` se guarda tal cual y su miniatura la rasteriza el cliente).
 *
 * Actualiza `lxp.reporte_imagenes` (idempotente por `imagenId`): recibido → procesando → listo |
 * error. Sin redactor, sin cuarentena, sin borrar nada (el original es el entregable y se queda).
 */
@Injectable()
export class ProcesarImagenReporteWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_PROCESAR_IMAGEN_REPORTE;

  constructor(private readonly db: DbService) {
    super();
  }

  async procesar(job: Job<ProcesarImagenReporteJob>): Promise<{ imagenId: string; estado: EstadoImagen }> {
    const d = job.data;
    try {
      await this.marcar(d.imagenId, 'procesando');

      // El ORIGINAL (con PII — es el entregable clínico) ya vive en su clave final; se lee para
      // derivar thumb/derivados. NUNCA se modifica ni se reescribe.
      const original = Buffer.from(await this.leerBinario(d.urlLecturaOriginal));

      // Thumb JPEG (~480px) del ORIGINAL con sharp. Best-effort: si falla, sin thumb (placeholder).
      let thumbRef: string | null = null;
      try {
        const thumb = await sharp(original)
          .rotate()
          .resize(THUMB_BORDE, THUMB_BORDE, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: THUMB_CALIDAD })
          .toBuffer();
        await this.subirBinario(d.urlSubidaThumb, thumb, 'image/jpeg');
        thumbRef = d.refThumb;
      } catch (e) {
        this.logger.warn(`Imagen de reporte ${d.imagenId}: thumb no generado (placeholder): ${String(e)}`);
      }

      // Derivados webp responsivos del ORIGINAL (best-effort por ancho → srcset con fallback).
      const derivados: Record<string, string> = {};
      for (const dd of d.derivados) {
        try {
          const webp = await generarDerivadoWebp(original, dd.ancho);
          await this.subirBinario(dd.urlSubida, webp, 'image/webp');
          derivados[String(dd.ancho)] = dd.ref;
        } catch (e) {
          this.logger.warn(`Imagen de reporte ${d.imagenId}: derivado ${dd.ancho}px falló (cae al original): ${String(e)}`);
        }
      }

      await this.marcar(d.imagenId, 'listo', thumbRef, Object.keys(derivados).length ? derivados : null);
      this.logger.log(
        `Imagen de reporte ${d.imagenId} LISTA (${d.ext})${thumbRef ? ' +thumb' : ''}` +
          `${Object.keys(derivados).length ? ` +${Object.keys(derivados).length} derivado(s)` : ''}.`,
      );
      return { imagenId: d.imagenId, estado: 'listo' };
    } catch (err) {
      await this.marcar(d.imagenId, 'error');
      throw err; // BullMQ reintenta; la fila queda 'error' hasta que un reintento la complete.
    }
  }

  /** Actualiza la fila `lxp.reporte_imagenes` (estado + thumb_ref + derivados). Idempotente. */
  private async marcar(
    imagenId: string,
    estado: EstadoImagen,
    thumbRef: string | null = null,
    derivados: Record<string, string> | null = null,
  ): Promise<void> {
    const sql = this.db.sql;
    if (estado === 'listo') {
      await sql`
        update lxp.reporte_imagenes
        set estado = 'listo', thumb_ref = ${thumbRef}, derivados = ${derivados ? sql.json(derivados) : null}
        where id = ${imagenId}`;
    } else {
      await sql`update lxp.reporte_imagenes set estado = ${estado}::lxp.estado_imagen_reporte where id = ${imagenId}`;
    }
  }

  private async leerBinario(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`No se pudo leer el original de la imagen de reporte (${resp.status}).`);
    const buf = await resp.arrayBuffer();
    if (buf.byteLength === 0) throw new Error('El original de la imagen de reporte está vacío.');
    return buf;
  }

  private async subirBinario(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) throw new Error(`No se pudo subir el derivado de la imagen de reporte (${resp.status}).`);
  }
}

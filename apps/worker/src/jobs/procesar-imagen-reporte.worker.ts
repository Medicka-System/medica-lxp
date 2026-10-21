import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  parsearRespuestaRedactor,
  QUEUE_PROCESAR_IMAGEN_REPORTE,
  type ProcesarImagenReporteJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import { anonimizarDicomBinario } from './dicom/anonimizacion-binaria';
import { contentTypeDe } from './dicom/detectar-formato';
import { generarDerivadoWebp } from './derivados-sharp';

type EstadoImagen = 'procesando' | 'listo' | 'cuarentena' | 'error';

/**
 * `procesar-imagen-reporte` (§6.5/§10 · unificación del uploader de Reportes). Job THIN que
 * mueve al WORKER el trabajo pesado que antes corría SÍNCRONO en el `api` (redacción Presidio).
 * Orquesta building blocks EXISTENTES, sin reimplementar nada:
 *   · redactor (parser compartido `parsearRespuestaRedactor` · §10): tapa la PII quemada.
 *   · `anonimizarDicomBinario` (dcmjs): quita TAGS PII del `.dcm` antes del redactor.
 *   · `generarDerivadoWebp` (sharp): derivados webp responsivos (640/1080/1600) de JPG/PNG.
 *
 * Actualiza la fila `lxp.reporte_imagenes` (idempotente por `imagenId`):
 *   recibido → procesando → listo | cuarentena | error.
 *
 * FAIL-CLOSED §10: el thumb/derivados salen SOLO del frame YA REDACTADO (el redactor los emite /
 * se generan del binario redactado). Si el redactor marca revisión manual o no devuelve `bin` →
 * `cuarentena`: NO se publica la imagen y se descarta el crudo (nunca se guarda PII).
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

      // 1) Traer el crudo (con PII) de storage.
      const crudo = await this.leerBinario(d.urlLecturaCrudo);

      // 2) DICOM: quita TAGS PII (dcmjs) ANTES del redactor; el redactor normaliza TS + tapa
      //    la PII quemada. Imagen (JPG/PNG): sin tags → redactor directo. Un solo parser (§10).
      const esDicom = d.ext === 'dcm';
      const entrada = esDicom ? Buffer.from(anonimizarDicomBinario(crudo).buffer) : Buffer.from(crudo);
      const contentType = esDicom ? 'application/dicom' : contentTypeDe(d.ext);
      const red = await this.redactar(entrada, contentType);

      // 3) CUARENTENA (§10 · fail-closed): el redactor no garantizó la redacción → NO publicar.
      //    Se descarta el crudo (PII fuera del storage) y la fila queda a revisión humana.
      if (red.revisionManual) {
        await this.borrarCrudo(d.urlBorradoCrudo);
        await this.marcar(d.imagenId, 'cuarentena');
        this.logger.warn(`Imagen de reporte ${d.imagenId} EN CUARENTENA (§10): redacción no garantizada.`);
        return { imagenId: d.imagenId, estado: 'cuarentena' };
      }

      // 4) Subir el binario REDACTADO a su clave final.
      const binFinal = Buffer.from(red.bin);
      await this.subirBinario(d.urlSubidaFinal, binFinal, contentType);

      // 5) Thumb del frame YA REDACTADO (§10): lo emite el redactor (parte `thumb`). Best-effort.
      let thumbRef: string | null = null;
      if (red.thumb) {
        try {
          await this.subirBinario(d.urlSubidaThumb, Buffer.from(red.thumb), 'image/jpeg');
          thumbRef = d.refThumb;
        } catch (e) {
          this.logger.warn(`Imagen ${d.imagenId}: thumb no subido (placeholder): ${String(e)}`);
        }
      }

      // 6) Derivados webp (solo JPG/PNG) DEL BINARIO REDACTADO (§10 · nunca del crudo). Best-effort
      //    por ancho; se registran los que logren subirse → srcset con fallback al original.
      const derivados: Record<string, string> = {};
      if (!esDicom && d.derivados.length) {
        for (const dd of d.derivados) {
          try {
            const webp = await generarDerivadoWebp(binFinal, dd.ancho);
            await this.subirBinario(dd.urlSubida, webp, 'image/webp');
            derivados[String(dd.ancho)] = dd.ref;
          } catch (e) {
            this.logger.warn(`Imagen ${d.imagenId}: derivado ${dd.ancho}px falló (cae al original): ${String(e)}`);
          }
        }
      }

      // 7) Persistir listo + thumb + derivados (idempotente por id). Luego borrar el crudo.
      await this.marcar(d.imagenId, 'listo', thumbRef, Object.keys(derivados).length ? derivados : null);
      await this.borrarCrudo(d.urlBorradoCrudo);

      this.logger.log(
        `Imagen de reporte ${d.imagenId} LISTA: ${d.ext}${thumbRef ? ' +thumb' : ''}` +
          `${Object.keys(derivados).length ? ` +${Object.keys(derivados).length} derivado(s)` : ''}.`,
      );
      return { imagenId: d.imagenId, estado: 'listo' };
    } catch (err) {
      await this.marcar(d.imagenId, 'error');
      throw err; // BullMQ reintenta; la fila queda 'error' hasta que un reintento la complete.
    }
  }

  /** Redacta la PII quemada vía el redactor (contrato ÚNICO · parser compartido §10). */
  private async redactar(buffer: Buffer, contentType: string) {
    const base = process.env.REDACTOR_URL ?? 'http://localhost:8002';
    const resp = await fetch(`${base}/redact`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    return parsearRespuestaRedactor(resp);
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
    if (!resp.ok) throw new Error(`No se pudo leer el crudo de la imagen de reporte (${resp.status}).`);
    const buf = await resp.arrayBuffer();
    if (buf.byteLength === 0) throw new Error('El crudo de la imagen de reporte está vacío.');
    return buf;
  }

  private async subirBinario(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) throw new Error(`No se pudo subir la imagen de reporte (${resp.status}).`);
  }

  private async borrarCrudo(url: string): Promise<void> {
    const resp = await fetch(url, { method: 'DELETE' }).catch(() => null);
    if (resp && !resp.ok && resp.status !== 404) {
      throw new Error(`No se pudo borrar el crudo de la imagen de reporte (${resp.status}).`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import AdmZip from 'adm-zip';
import { TrabajadorBase } from './trabajador-base';

/**
 * `extraer-paquete` (Pieza 1 · §7): descomprime un paquete SCORM/xAPI y sube cada archivo
 * al prefijo PÚBLICO `media/paquetes-extraidos/{contenidoId}/…`, PRESERVANDO su ruta
 * relativa interna, para que el iframe del lector sirva `index.html` + sus assets sin
 * firma (los relativos resuelven a URLs hermanas públicas · §10 aislamiento).
 *
 * El `api` es el único firmante (§3): el worker le pide el GET del .zip y, ya conocido el
 * árbol, un PUT por archivo (patrón worker→servicio, como `firmar-anonimizados` del DICOM).
 * El binario nunca pasa por el `api` ni por Postgres: aquí solo fluye storage↔storage.
 *
 * Idempotente: re-ejecutar sobrescribe las mismas claves (BullMQ reintenta ante fallos).
 */

/** Cola LOCAL replicada del contrato del `api` (`extraccion.contrato.ts`): la Pieza 1 no
 *  toca `@campus/shared`, así que productor y consumidor comparten el literal. */
const QUEUE_EXTRAER_PAQUETE = 'extraer-paquete';

interface ExtraerPaqueteJob {
  contenidoId: string;
}
interface FirmarExtraccionResp {
  urlLecturaZip: string;
  subidas: Array<{ entryName: string; url: string }>;
}

@Injectable()
export class ExtraerPaqueteWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_EXTRAER_PAQUETE;

  async procesar(
    job: Job<ExtraerPaqueteJob>,
  ): Promise<{ contenidoId: string; subidos: number; total: number }> {
    const { contenidoId } = job.data;

    // Fase 1: GET firmado del .zip (aún no conocemos el árbol).
    const { urlLecturaZip } = await this.firmarExtraccion(contenidoId, []);
    const zipBuf = await this.leerBinario(urlLecturaZip);
    const zip = new AdmZip(zipBuf);
    const entradas = zip.getEntries().filter((e) => !e.isDirectory);
    if (entradas.length === 0) {
      this.logger.warn(`Paquete ${contenidoId} sin archivos (zip vacío) — nada que extraer.`);
      return { contenidoId, subidos: 0, total: 0 };
    }

    // Fase 2: PUT firmado por archivo, bajo el prefijo público.
    const { subidas } = await this.firmarExtraccion(
      contenidoId,
      entradas.map((e) => e.entryName),
    );
    const porNombre = new Map(subidas.map((s) => [s.entryName, s.url]));

    let subidos = 0;
    for (const e of entradas) {
      const url = porNombre.get(e.entryName);
      if (!url) {
        this.logger.warn(`El api no firmó "${e.entryName}" de ${contenidoId}; se omite.`);
        continue;
      }
      await this.subirBinario(url, e.getData(), contentTypePorExtension(e.entryName));
      subidos++;
    }

    this.logger.log(
      `Paquete ${contenidoId} extraído: ${subidos}/${entradas.length} archivos → prefijo público.`,
    );
    return { contenidoId, subidos, total: entradas.length };
  }

  /** Pide al `api` las URLs firmadas de la extracción (el worker nunca firma · §3). */
  private async firmarExtraccion(
    contenidoId: string,
    entryNames: string[],
  ): Promise<FirmarExtraccionResp> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const resp = await fetch(
      `${base}/paquetes/${encodeURIComponent(contenidoId)}/firmar-extraccion`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entryNames }),
      },
    );
    if (!resp.ok) {
      throw new Error(`El api no firmó la extracción del paquete (${resp.status}).`);
    }
    return (await resp.json()) as FirmarExtraccionResp;
  }

  /** Descarga el .zip como Buffer. */
  private async leerBinario(url: string): Promise<Buffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`No se pudo leer el .zip del paquete (${resp.status}).`);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.byteLength === 0) throw new Error('El .zip del paquete está vacío.');
    return buf;
  }

  /** Sube un archivo del paquete a su URL firmada (la firma solo cubre el host · §3). */
  private async subirBinario(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) throw new Error(`No se pudo subir un archivo del paquete (${resp.status}).`);
  }
}

/** Content-type por extensión para servir el paquete estático al navegador (no adivina;
 *  lo desconocido cae a octet-stream, que el iframe no ejecuta como script). */
function contentTypePorExtension(nombre: string): string {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  return TIPOS[ext] ?? 'application/octet-stream';
}

const TIPOS: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf',
  wasm: 'application/wasm',
  map: 'application/json; charset=utf-8',
};

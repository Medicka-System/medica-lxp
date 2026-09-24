import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../dicom/storage.service';

/**
 * Imágenes de la GALERÍA de un reporte clínico (§6.5). El médico sube VARIAS imágenes
 * (JPG/PNG, .dcm si aplica) directo a object storage; este servicio orquesta el flujo de
 * dominio (§2 — NO es proxy de CRUD): firma la subida del crudo, TAPA la PII quemada con
 * el redactor Presidio (§10, igual que el visor) y deja la imagen redactada en su clave
 * final. El binario del crudo entra un instante al `api` solo para redactarlo (como el
 * worker de DICOM); la imagen final vive en storage y se lee con URL firmada.
 */

const EXT_OK = new Set(['jpg', 'jpeg', 'png', 'dcm']);

function contentTypeDe(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'dcm') return 'application/dicom';
  return 'image/jpeg';
}

function normalizarId(v: string): string {
  return (v || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
}

@Injectable()
export class ReportesImagenesService {
  constructor(private readonly storage: StorageService) {}

  /** Paso 1: firma la subida del CRUDO. El navegador sube el original directo a storage. */
  firmarSubida(reporteId: string, ext: string): { id: string; ext: string; refCrudo: string; urlSubida: string } {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    const e = EXT_OK.has(ext) ? ext : 'jpg';
    const id = randomUUID();
    const refCrudo = this.storage.claveReporteCrudo(rid, id, e);
    return { id, ext: e, refCrudo, urlSubida: this.storage.firmarSubida(refCrudo) };
  }

  /**
   * Paso 2: trae el crudo, TAPA la PII quemada (Presidio · OCR+NER, on-prem · §10), sube la
   * imagen redactada a su clave final y borra el crudo. Si el redactor falla, LANZA → nada
   * se persiste sin redactar. Devuelve la ref final + si el estudio exige revisión manual.
   */
  async procesar(
    reporteId: string,
    id: string,
    ext: string,
  ): Promise<{ ref: string; ext: string; revisionManual: boolean; urlLectura: string }> {
    const rid = normalizarId(reporteId);
    const iid = normalizarId(id);
    if (!rid || !iid) throw new BadRequestException('reporteId/id inválido.');
    const e = EXT_OK.has(ext) ? ext : 'jpg';
    const refCrudo = this.storage.claveReporteCrudo(rid, iid, e);
    const refFinal = this.storage.claveReporteImagen(rid, iid, e);

    const crudo = await this.leerBinario(this.storage.firmarLectura(refCrudo));
    const { buffer, revisionManual } = await this.redactar(Buffer.from(crudo), contentTypeDe(e));
    await this.subirBinario(this.storage.firmarSubida(refFinal), buffer, contentTypeDe(e));
    await this.borrar(this.storage.firmarBorrado(refCrudo));
    return { ref: refFinal, ext: e, revisionManual, urlLectura: this.storage.firmarLectura(refFinal) };
  }

  /** Firma la lectura de varias imágenes de la galería (solo claves de imagen de reporte). */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    const urls: Record<string, string> = {};
    for (const ref of refs ?? []) {
      if (typeof ref === 'string' && ref.startsWith('reportes/imagenes/')) {
        urls[ref] = this.storage.firmarLectura(ref);
      }
    }
    return { urls };
  }

  /** POST al servicio Presidio: tapa SOLO la caja del nombre; ramifica por content-type (§10). */
  private async redactar(buffer: Buffer, contentType: string): Promise<{ buffer: Buffer; revisionManual: boolean }> {
    const base = process.env.REDACTOR_URL ?? 'http://localhost:8002';
    const resp = await fetch(`${base}/redact`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: buffer,
    });
    if (!resp.ok) throw new BadRequestException(`El servicio redactor respondió ${resp.status}.`);
    const red = Buffer.from(await resp.arrayBuffer());
    return { buffer: red, revisionManual: resp.headers.get('x-revision-manual') === '1' };
  }

  private async leerBinario(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new BadRequestException(`No se pudo leer el crudo (${resp.status}).`);
    return resp.arrayBuffer();
  }

  private async subirBinario(url: string, buffer: Buffer, contentType: string): Promise<void> {
    const resp = await fetch(url, { method: 'PUT', headers: { 'content-type': contentType }, body: buffer });
    if (!resp.ok) throw new BadRequestException(`No se pudo subir la imagen (${resp.status}).`);
  }

  private async borrar(url: string): Promise<void> {
    await fetch(url, { method: 'DELETE' }).catch(() => undefined);
  }
}

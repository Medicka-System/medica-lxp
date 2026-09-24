import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../dicom/storage.service';

/**
 * Imágenes de CONTENIDO del course builder (§5C · §10) — las que el diseñador sube en un
 * bloque de IMAGEN de una lección de teoría. Es el gemelo genérico de `reportes/imagenes`
 * pero SIN atarse a un reporte de médico: la propiedad la gatea el web (`requireAutoria`,
 * staff), no un RLS por fila. Orquesta el flujo de dominio (§2 — NO proxy de CRUD): firma
 * la subida del crudo, TAPA la PII quemada con el redactor Presidio (§10, igual que el
 * visor/reportes) y deja la imagen redactada en su clave final.
 *
 * Decisión (Manny): TODA imagen subida pasa por Presidio — en un diagrama no estorba
 * (no encuentra nombre) y protege si el diseñador sube una captura clínica con PII.
 */

const EXT_OK = new Set(['jpg', 'jpeg', 'png']);

function contentTypeDe(ext: string): string {
  if (ext === 'png') return 'image/png';
  return 'image/jpeg';
}

function normalizarId(v: string): string {
  return (v || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
}

@Injectable()
export class MediaImagenesService {
  constructor(private readonly storage: StorageService) {}

  /** Paso 1: firma la subida del CRUDO. El navegador sube el original directo a storage. */
  firmarSubida(ext: string): { id: string; ext: string; refCrudo: string; urlSubida: string } {
    const e = EXT_OK.has(ext) ? ext : 'jpg';
    const id = randomUUID();
    const refCrudo = this.storage.claveImagenContenidoCrudo(id, e);
    return { id, ext: e, refCrudo, urlSubida: this.storage.firmarSubida(refCrudo) };
  }

  /**
   * Paso 2: trae el crudo, TAPA la PII quemada (Presidio · OCR+NER, on-prem · §10), sube la
   * imagen redactada a su clave final y borra el crudo. Si el redactor falla, LANZA → nada
   * se persiste sin redactar. Devuelve la ref final + si exige revisión manual.
   */
  async procesar(
    id: string,
    ext: string,
  ): Promise<{ ref: string; ext: string; revisionManual: boolean; urlLectura: string }> {
    const iid = normalizarId(id);
    if (!iid) throw new BadRequestException('id inválido.');
    const e = EXT_OK.has(ext) ? ext : 'jpg';
    const refCrudo = this.storage.claveImagenContenidoCrudo(iid, e);
    const refFinal = this.storage.claveImagenContenido(iid, e);

    const crudo = await this.leerBinario(this.storage.firmarLectura(refCrudo));
    const { buffer, revisionManual } = await this.redactar(Buffer.from(crudo), contentTypeDe(e));
    await this.subirBinario(this.storage.firmarSubida(refFinal), buffer, contentTypeDe(e));
    await this.borrar(this.storage.firmarBorrado(refCrudo));
    return { ref: refFinal, ext: e, revisionManual, urlLectura: this.storage.firmarLectura(refFinal) };
  }

  /** Firma la lectura de imágenes de contenido (solo claves `media/imagenes/`). */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    const urls: Record<string, string> = {};
    for (const ref of refs ?? []) {
      if (typeof ref === 'string' && ref.startsWith('media/imagenes/')) {
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

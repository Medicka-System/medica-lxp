import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../dicom/storage.service';

/**
 * Imágenes de CONTENIDO del course builder (§5C) — las que el diseñador sube en un bloque
 * de IMAGEN de una lección de teoría (diagramas, esquemas, ilustraciones). NO son imágenes
 * de pacientes: no tienen PII, así que NO pasan por el redactor Presidio (eso solo aplica a
 * los flujos de paciente: bitácora, biblioteca de casos y reportes · §10). Subida DIRECTA:
 * se firma un PUT a la clave FINAL y el navegador sube el archivo tal cual a object storage
 * (§2 — el binario nunca pasa por el `api`). La propiedad la gatea el web (`requireAutoria`).
 */

const EXT_OK = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

@Injectable()
export class MediaImagenesService {
  constructor(private readonly storage: StorageService) {}

  /** Firma la subida DIRECTA a la clave final. El navegador sube el archivo tal cual. */
  firmarSubida(ext: string): { id: string; ext: string; ref: string; urlSubida: string; urlLectura: string } {
    const e = EXT_OK.has(ext) ? ext : 'jpg';
    const id = randomUUID();
    const ref = this.storage.claveImagenContenido(id, e);
    // PÚBLICAS: el navegador (diseñador) sube y lee la imagen directo a storage.
    return {
      id,
      ext: e,
      ref,
      urlSubida: this.storage.firmarSubida(ref, undefined, true),
      urlLectura: this.storage.firmarLectura(ref, undefined, true),
    };
  }

  /** Firma la lectura de imágenes de contenido (solo claves `media/imagenes/`). */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    if (!Array.isArray(refs)) throw new BadRequestException('refs inválido.');
    const urls: Record<string, string> = {};
    for (const ref of refs) {
      if (typeof ref === 'string' && ref.startsWith('media/imagenes/')) {
        urls[ref] = this.storage.firmarLectura(ref, undefined, true); // PÚBLICA (navegador)
      }
    }
    return { urls };
  }
}

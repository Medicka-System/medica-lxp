import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../dicom/storage.service';

/**
 * DOCUMENTOS de la Biblioteca de Contenido (§5B/§5C): PDF, Word (.docx) y PowerPoint
 * (.pptx) que el diseñador sube UNA vez para referenciar desde cualquier lección. Son
 * CONTENIDO educativo, no de paciente → NO pasan por el redactor Presidio (eso solo
 * aplica a los flujos de paciente: bitácora, biblioteca de casos y reportes · §10).
 * Subida DIRECTA (§2 — el binario nunca pasa por el `api`): se firma un PUT a la clave
 * FINAL y el navegador sube el archivo tal cual a object storage. La propiedad la gatea
 * el web (`requireAutoria`, staff). Mismo patrón que MediaImagenesService.
 */

const EXT_OK = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx']);

@Injectable()
export class MediaArchivosService {
  constructor(private readonly storage: StorageService) {}

  /** Firma la subida DIRECTA a la clave final. El navegador sube el archivo tal cual. */
  firmarSubida(ext: string): { id: string; ext: string; ref: string; urlSubida: string; urlLectura: string } {
    const e = EXT_OK.has(ext) ? ext : 'pdf';
    const id = randomUUID();
    const ref = this.storage.claveArchivo(id, e);
    // PÚBLICAS: el navegador (diseñador) sube y lee el documento directo a storage.
    return {
      id,
      ext: e,
      ref,
      urlSubida: this.storage.firmarSubida(ref, undefined, true),
      urlLectura: this.storage.firmarLectura(ref, undefined, true),
    };
  }

  /** Firma la lectura de documentos de contenido (solo claves `media/archivos/`). */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    if (!Array.isArray(refs)) throw new BadRequestException('refs inválido.');
    const urls: Record<string, string> = {};
    for (const ref of refs) {
      if (typeof ref === 'string' && ref.startsWith('media/archivos/')) {
        urls[ref] = this.storage.firmarLectura(ref, undefined, true); // PÚBLICA (navegador)
      }
    }
    return { urls };
  }
}

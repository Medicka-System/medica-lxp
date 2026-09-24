/**
 * Detección del FORMATO de una fuente cruda por sus bytes mágicos (§3 · soporte JPG/PNG
 * además de DICOM). El estudio de un caso puede MEZCLAR `.dcm` (equipo) e imágenes web
 * (JPG/PNG extraídas del ecógrafo). No confiamos en la extensión que manda el cliente:
 * husmeamos el binario server-side (el worker), que es la fuente de verdad.
 *
 *   - DICOM P10:  marca «DICM» en el offset 128 (tras el preámbulo).
 *   - ZIP:        «PK\x03\x04» (o variantes PK) al inicio — estudio comprimido de `.dcm`.
 *   - JPEG:       «\xFF\xD8\xFF» al inicio.
 *   - PNG:        «\x89PNG\r\n\x1a\n» al inicio.
 *
 * PURO y testeable. Cualquier binario que no sea zip/jpeg/png se trata como DICOM y lo
 * valida el parser (dcmjs); si no es DICOM válido, la anonimización lanza y el job falla
 * (§10: no se sube nada que no sepamos anonimizar/redactar).
 */

/** Formato de una fuente/serie. `dicom` va por el pipeline dcmjs; `imagen` por el web loader. */
export type FormatoFuente =
  | { tipo: 'dicom'; ext: 'dcm' }
  | { tipo: 'zip'; ext: 'zip' }
  | { tipo: 'imagen'; ext: 'jpg' }
  | { tipo: 'imagen'; ext: 'png' };

/** Detecta el formato de un binario crudo por sus bytes mágicos (fallback a DICOM). */
export function detectarFormato(bin: ArrayBuffer): FormatoFuente {
  const u = new Uint8Array(bin);

  // DICOM P10: «DICM» (0x44 0x49 0x43 0x4D) en el offset 128.
  if (
    u.length >= 132 &&
    u[128] === 0x44 &&
    u[129] === 0x49 &&
    u[130] === 0x43 &&
    u[131] === 0x4d
  ) {
    return { tipo: 'dicom', ext: 'dcm' };
  }

  // ZIP: «PK» (0x50 0x4B) al inicio (local file header 03 04, empty 05 06, spanned 07 08).
  if (u.length >= 4 && u[0] === 0x50 && u[1] === 0x4b) {
    return { tipo: 'zip', ext: 'zip' };
  }

  // JPEG: «\xFF\xD8\xFF».
  if (u.length >= 3 && u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) {
    return { tipo: 'imagen', ext: 'jpg' };
  }

  // PNG: «\x89 P N G \r \n \x1a \n».
  if (
    u.length >= 8 &&
    u[0] === 0x89 &&
    u[1] === 0x50 &&
    u[2] === 0x4e &&
    u[3] === 0x47 &&
    u[4] === 0x0d &&
    u[5] === 0x0a &&
    u[6] === 0x1a &&
    u[7] === 0x0a
  ) {
    return { tipo: 'imagen', ext: 'png' };
  }

  // Algunos `.dcm` "crudos" de export no traen preámbulo/DICM (implicit VR sin meta). Como
  // heurística de último recurso: si NO es zip/jpeg/png, lo tratamos como DICOM y que el
  // parser (dcmjs) decida — si no es válido, `anonimizarDicomBinario` lanza y el job falla.
  return { tipo: 'dicom', ext: 'dcm' };
}

/** Content-type S3 para subir el anonimizado según su extensión. */
export function contentTypeDe(ext: string): string {
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return 'application/dicom';
}

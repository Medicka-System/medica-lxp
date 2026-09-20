import { Injectable } from '@nestjs/common';
import { presignS3, type MetodoS3 } from './sigv4';

/** Vida por defecto de una URL firmada (holgada para cubrir reintentos del worker). */
const EXPIRA_SEG = 3600;

/**
 * Acceso a object storage (S3-compatible: MinIO/Supabase → R2 · §3). El `api` es el
 * único FIRMANTE: emite URLs firmadas de vida corta para que el cliente suba y el
 * worker lea/escriba/borre — el binario nunca pasa por el `api` ni por Postgres.
 * Config por env (STORAGE_*); en integración se apunta a MinIO/R2 real.
 */
@Injectable()
export class StorageService {
  private readonly endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
  private readonly region = process.env.STORAGE_REGION ?? 'auto';
  private readonly bucket = process.env.STORAGE_BUCKET ?? 'campus-lxp-media';
  private readonly accessKey = process.env.STORAGE_ACCESS_KEY_ID ?? '';
  private readonly secretKey = process.env.STORAGE_SECRET_ACCESS_KEY ?? '';

  /**
   * Clave del binario CRUDO (con PII) mientras se procesa. Una por FUENTE subida
   * (un `.dcm` suelto o un `.zip`); `indice` la hace estable por caso. El worker
   * descomprime los zips server-side (§10) antes de anonimizar.
   */
  claveCrudo(casoId: string, indice: number): string {
    return `dicom/crudo/${casoId}/${indice}`;
  }

  /**
   * Clave del binario `.dcm` ANONIMIZADO de una SERIE (educativo, sin PII; lo lee el
   * visor). Un estudio tiene N series → N claves `0.dcm`, `1.dcm`, …
   */
  claveAnonimizado(casoId: string, indice: number): string {
    return `dicom/casos/${casoId}/${indice}.dcm`;
  }

  private firmar(metodo: MetodoS3, key: string, ahora: Date): string {
    return presignS3({
      metodo,
      endpoint: this.endpoint,
      region: this.region,
      bucket: this.bucket,
      key,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      expiraSeg: EXPIRA_SEG,
      ahora,
    });
  }

  firmarSubida(key: string, ahora = new Date()): string {
    return this.firmar('PUT', key, ahora);
  }

  firmarLectura(key: string, ahora = new Date()): string {
    return this.firmar('GET', key, ahora);
  }

  firmarBorrado(key: string, ahora = new Date()): string {
    return this.firmar('DELETE', key, ahora);
  }
}

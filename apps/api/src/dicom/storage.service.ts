import { Injectable } from '@nestjs/common';
import { presignS3, type MetodoS3 } from './sigv4';

/** Vida por defecto de una URL firmada (holgada para cubrir reintentos del worker). */
const EXPIRA_SEG = 3600;

/**
 * Firma ESTABLE (cacheable) para lecturas de contenido no-PII (`media/imagenes/*` · Fase 1
 * entrega). La URL se ancla al inicio de una VENTANA → es BYTE-IDÉNTICA dentro de la ventana,
 * así el navegador la cachea por URL (deja de re-descargar en cada render/scroll/regreso). La
 * expiración es HOLGADA (≥ 2× ventana) para que una URL emitida al final de la ventana no
 * caduque a mitad de sesión. NO es public-read: sigue requiriendo firma (gating de visibilidad
 * intacto — el feed solo firma lo que el usuario puede ver).
 */
const VENTANA_ESTABLE_SEG = 3600; // 1 h: la URL no cambia dentro de la hora
const EXPIRA_ESTABLE_SEG = 7200; // 2 h: holgura cómoda > ventana

/**
 * Acceso a object storage (S3-compatible: MinIO/Supabase → R2 · §3). El `api` es el
 * único FIRMANTE: emite URLs firmadas de vida corta para que el cliente suba y el
 * worker lea/escriba/borre — el binario nunca pasa por el `api` ni por Postgres.
 * Config por env (STORAGE_*); en integración se apunta a MinIO/R2 real.
 */
@Injectable()
export class StorageService {
  private readonly endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
  // Endpoint PÚBLICO: host que verá el NAVEGADOR en las URLs firmadas que se le entregan
  // (upload/lectura directos). En local, el web corre en el host → `localhost:9000`, mientras
  // que el `endpoint` interno (`minio:9000`) lo usan el worker y el `api` (/procesar) dentro
  // de Docker. Si no se define, cae al interno (producción: mismo host real, sin split · §3).
  // La firma SigV4 va contra el host que se use aquí → cada URL se firma para SU destino.
  private readonly endpointPublico = process.env.STORAGE_ENDPOINT_PUBLICO ?? this.endpoint;
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
   * Clave del binario ANONIMIZADO de una SERIE (educativo, sin PII; lo lee el visor). Un
   * estudio tiene N series → N claves `0.dcm`, `1.dcm`, … La extensión distingue el
   * formato: `dcm` (DICOM · loader wadouri) o `jpg`/`png` (imagen web · web loader · §3).
   */
  claveAnonimizado(casoId: string, indice: number, ext = 'dcm'): string {
    const limpio = /^[a-z0-9]+$/.test(ext) ? ext : 'dcm';
    return `dicom/casos/${casoId}/${indice}.${limpio}`;
  }

  /** Clave del binario CRUDO (con PII posible) de una imagen de reporte mientras se redacta. */
  claveReporteCrudo(reporteId: string, id: string, ext: string): string {
    const e = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
    return `reportes/crudo/${reporteId}/${id}.${e}`;
  }

  /** Clave de la imagen REDACTADA (§10) de la galería del reporte (la que ve/imprime el médico). */
  claveReporteImagen(reporteId: string, id: string, ext: string): string {
    const e = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
    return `reportes/imagenes/${reporteId}/${id}.${e}`;
  }

  /** Clave de una imagen de CONTENIDO de teoría (educativa, sin PII); se lee con URL firmada. */
  claveImagenContenido(id: string, ext: string): string {
    const e = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
    return `media/imagenes/${id}.${e}`;
  }

  /**
   * Clave del THUMBNAIL de un caso/estudio (JPEG del primer frame YA redactado · §10).
   * Vive bajo `media/imagenes/*` A PROPÓSITO: así lo sirve la familia B estable
   * (`media/imagenes/firmar-lectura`) sin tocar su filtro. Determinista por `casoId`.
   */
  claveThumbCaso(casoId: string): string {
    return `media/imagenes/casos/${casoId}/thumb.jpg`;
  }

  /**
   * Clave de un DOCUMENTO de contenido de la Biblioteca (PDF/Word/PowerPoint · §5C).
   * Educativo, sin PII → NO pasa por el redactor Presidio (§10). Se lee con URL firmada.
   */
  claveArchivo(id: string, ext: string): string {
    const e = /^[a-z0-9]+$/.test(ext) ? ext : 'pdf';
    return `media/archivos/${id}.${e}`;
  }

  /**
   * `publico=true` firma con el endpoint que verá el NAVEGADOR (host); `false` (default)
   * con el interno de Docker (worker / `api` server-side). Ver `endpointPublico`.
   */
  private firmar(
    metodo: MetodoS3,
    key: string,
    ahora: Date,
    publico: boolean,
    expiraSeg: number = EXPIRA_SEG,
  ): string {
    return presignS3({
      metodo,
      endpoint: publico ? this.endpointPublico : this.endpoint,
      region: this.region,
      bucket: this.bucket,
      key,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      expiraSeg,
      ahora,
    });
  }

  firmarSubida(key: string, ahora = new Date(), publico = false): string {
    return this.firmar('PUT', key, ahora, publico);
  }

  firmarLectura(key: string, ahora = new Date(), publico = false): string {
    return this.firmar('GET', key, ahora, publico);
  }

  /**
   * Firma GET ESTABLE/cacheable para contenido no-PII (`media/imagenes/*`): ancla el timestamp
   * al inicio de la ventana (`VENTANA_ESTABLE_SEG`) → la URL es byte-idéntica dentro de la
   * ventana (el navegador cachea por URL). Expiry holgado (`EXPIRA_ESTABLE_SEG` ≥ 2× ventana)
   * para que una URL emitida al final de la ventana no caduque a media sesión. Sigue firmada
   * (NO public-read): el gating de visibilidad lo hace el feed (solo firma lo visible).
   */
  firmarLecturaEstable(key: string, ahora = new Date(), publico = false): string {
    const ventanaMs = VENTANA_ESTABLE_SEG * 1000;
    const anclado = new Date(Math.floor(ahora.getTime() / ventanaMs) * ventanaMs);
    return this.firmar('GET', key, anclado, publico, EXPIRA_ESTABLE_SEG);
  }

  firmarBorrado(key: string, ahora = new Date(), publico = false): string {
    return this.firmar('DELETE', key, ahora, publico);
  }
}

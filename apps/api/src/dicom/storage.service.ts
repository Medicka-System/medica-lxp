import { Injectable } from '@nestjs/common';
import { presignS3, presignListV2, type MetodoS3 } from './sigv4';

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

  /** Clave del THUMB (JPEG del frame YA redactado · §10) de una imagen de galería de reporte. */
  claveReporteThumb(reporteId: string, id: string): string {
    return `reportes/imagenes/${reporteId}/${id}/thumb.jpg`;
  }

  /** Clave de un DERIVADO webp `{ancho}` de una imagen de galería de reporte (JPG/PNG). */
  claveReporteDerivado(reporteId: string, id: string, ancho: number): string {
    return `reportes/imagenes/${reporteId}/${id}/${ancho}.webp`;
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

  // ── Paquetes SCORM/xAPI descomprimidos (§7 · Pieza 1) ─────────────────────────────
  /**
   * Clave de UN archivo del paquete DESCOMPRIMIDO, preservando su ruta relativa interna
   * (`entryName`) para que `index.html` encuentre sus assets. Vive bajo el prefijo PÚBLICO
   * `media/paquetes-extraidos/{id}/…` (policy anonymous-download · servible estático al
   * navegador sin firma, para que los relativos resuelvan). El `.zip` sigue en el prefijo
   * PRIVADO `media/paquetes/{id}/` (firmado). `id` = contenidoId del paquete.
   */
  clavePaqueteExtraido(contenidoId: string, entryName: string): string {
    const limpio = entryName.replace(/^\/+/, '').replace(/\.\.(\/|$)/g, ''); // sin path traversal
    return `media/paquetes-extraidos/${contenidoId}/${limpio}`;
  }

  /** Prefijo del paquete extraído (para listar/borrar todo el árbol). Con `/` final. */
  basePaqueteExtraido(contenidoId: string): string {
    return `media/paquetes-extraidos/${contenidoId}/`;
  }

  /**
   * URL PÚBLICA (sin firma) del `entryPoint` del paquete extraído, para el iframe del lector.
   * Usa el endpoint que ve el NAVEGADOR; el prefijo es anonymous-download (los assets
   * relativos del paquete resuelven a URLs hermanas públicas). Aislamiento: origen de storage
   * ≠ origen de la app (§10) + sandbox del iframe; sin credenciales en la URL del contenido.
   *
   * PROD (R2, documentado · no se construye ahora): endurecer el prefijo con CDN +
   * signed-cookie a nivel de prefijo (gating por sesión sin firmar cada asset), en vez de
   * anonymous-download. La clave `uuid` inadivinable es el único gate en local.
   */
  urlPublicaEntryPoint(contenidoId: string, entryPoint: string): string {
    const rel = entryPoint.replace(/^\/+/, '');
    const key = this.clavePaqueteExtraido(contenidoId, rel);
    // Clave ya codificada por segmentos igual que en presignS3 (misma política RFC 3986).
    const path = key.split('/').map((s) => encodeURIComponent(s)).join('/');
    return `${this.endpointPublico}/${this.bucket}/${path}`;
  }

  /**
   * Lista TODAS las claves bajo un prefijo (ListObjectsV2 paginado · SigV4). Server-side en
   * el `api` (es el firmante · §3); no mueve binario, solo claves. Sigue el `continuation-token`
   * hasta agotar. Vacío si el prefijo no existe.
   */
  async listarPrefijo(prefix: string, publico = false): Promise<string[]> {
    const endpoint = publico ? this.endpointPublico : this.endpoint;
    const claves: string[] = [];
    let token: string | undefined;
    do {
      const url = presignListV2({
        endpoint,
        region: this.region,
        bucket: this.bucket,
        prefix,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
        expiraSeg: EXPIRA_SEG,
        ahora: new Date(),
        continuationToken: token,
      });
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        const cuerpo = await res.text().catch(() => '');
        throw new Error(`ListObjectsV2 falló ${res.status}: ${cuerpo.slice(0, 200)}`);
      }
      const xml = await res.text();
      for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
        claves.push(decodeXml(m[1] as string));
      }
      const trunc = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = trunc ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] : undefined;
    } while (token);
    return claves;
  }

  /**
   * Borra TODO el árbol bajo un prefijo (lista + DELETE por clave · SigV4). Idempotente
   * (prefijo vacío → 0). Server-side en el `api`. Devuelve cuántas claves borró.
   */
  async borrarPrefijo(prefix: string, publico = false): Promise<number> {
    const claves = await this.listarPrefijo(prefix, publico);
    for (const key of claves) {
      const url = this.firmarBorrado(key, new Date(), publico);
      const res = await fetch(url, { method: 'DELETE' });
      // 204/200 = borrado; 404 = ya no estaba (idempotente).
      if (!res.ok && res.status !== 404) {
        const cuerpo = await res.text().catch(() => '');
        throw new Error(`DELETE ${key} falló ${res.status}: ${cuerpo.slice(0, 160)}`);
      }
    }
    return claves.length;
  }
}

/** Decodifica entidades XML básicas de las claves de ListObjectsV2. */
function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

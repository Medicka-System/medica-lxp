/**
 * Presign de URLs para object storage compatible con S3 (MinIO/R2 · §3), con AWS
 * Signature V4 por query params. PURO y sin dependencias (node:crypto): el binario
 * DICOM se sube/lee directo contra el storage con una URL firmada de vida corta —
 * nunca pasa por el `api` ni por Postgres (§3/§9).
 *
 * Path-style (`{endpoint}/{bucket}/{key}`), como usa MinIO por defecto.
 */
import { createHash, createHmac } from 'node:crypto';

export type MetodoS3 = 'GET' | 'PUT' | 'DELETE';

export interface PresignOpts {
  metodo: MetodoS3;
  endpoint: string; // p. ej. http://localhost:9000
  region: string;
  bucket: string;
  key: string;
  accessKey: string;
  secretKey: string;
  expiraSeg: number;
  ahora: Date;
}

/** Codificación RFC 3986 (AWS): deja A-Za-z0-9-_.~ y %-codifica el resto. */
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Codifica la ruta del objeto conservando los separadores '/'. */
function encodeKeyPath(key: string): string {
  return key
    .split('/')
    .map((seg) => rfc3986(seg))
    .join('/');
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/** Marca de tiempo amz: `YYYYMMDDTHHMMSSZ` y su fecha `YYYYMMDD`. */
function marcas(ahora: Date): { amzDate: string; dateStamp: string } {
  const amzDate = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

/** Devuelve una URL firmada (SigV4) para operar sobre `key` con `metodo`. */
export function presignS3(o: PresignOpts): string {
  if (!o.accessKey || !o.secretKey) {
    throw new Error('Object storage sin credenciales: configura STORAGE_* (§3).');
  }
  const url = new URL(o.endpoint);
  const host = url.host;
  const { amzDate, dateStamp } = marcas(o.ahora);
  const scope = `${dateStamp}/${o.region}/s3/aws4_request`;
  const canonicalUri = `/${o.bucket}/${encodeKeyPath(o.key)}`;

  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${o.accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(o.expiraSeg),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k] as string)}`)
    .join('&');

  const canonicalRequest = [
    o.metodo,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${o.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, o.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `${o.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

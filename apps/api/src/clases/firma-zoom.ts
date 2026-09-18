/**
 * Validación de firma de webhooks de Zoom (§9/§10 · Sprint 6). PURO y sin dependencias
 * (node:crypto): Zoom firma cada webhook con HMAC-SHA256 sobre `v0:{timestamp}:{cuerpo}`
 * usando el `ZOOM_WEBHOOK_SECRET_TOKEN`. Ningún webhook se procesa sin firma válida.
 *
 * Ref: header `x-zm-signature` = `v0={hmac_hex}`, header `x-zm-request-timestamp`.
 * El evento `endpoint.url_validation` se responde con HMAC del `plainToken` (challenge).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Ventana máxima (segundos) para aceptar un webhook (anti-replay). */
export const VENTANA_FIRMA_SEG = 300;

/** Mensaje canónico que Zoom firma: `v0:{timestamp}:{cuerpoCrudo}`. */
export function mensajeZoom(timestamp: string, cuerpoCrudo: string): string {
  return `v0:${timestamp}:${cuerpoCrudo}`;
}

/** Firma esperada (`v0={hmac_hex}`) de un webhook de Zoom. */
export function firmaZoom(
  secret: string,
  timestamp: string,
  cuerpoCrudo: string,
): string {
  const hmac = createHmac('sha256', secret)
    .update(mensajeZoom(timestamp, cuerpoCrudo), 'utf8')
    .digest('hex');
  return `v0=${hmac}`;
}

export interface ValidarFirmaOpts {
  secret: string;
  timestamp: string;
  cuerpoCrudo: string;
  firma: string;
  /** Momento actual (inyectable para tests). */
  ahora?: Date;
}

/**
 * Valida la firma (y la ventana anti-replay) de un webhook de Zoom. Comparación en
 * tiempo constante. Devuelve `false` ante cualquier discrepancia — nunca lanza.
 */
export function validarFirmaZoom(o: ValidarFirmaOpts): boolean {
  if (!o.secret || !o.timestamp || !o.firma) return false;

  const ts = Number(o.timestamp);
  if (!Number.isFinite(ts)) return false;
  const ahora = (o.ahora ?? new Date()).getTime() / 1000;
  if (Math.abs(ahora - ts) > VENTANA_FIRMA_SEG) return false;

  const esperada = firmaZoom(o.secret, o.timestamp, o.cuerpoCrudo);
  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(o.firma, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Respuesta al challenge `endpoint.url_validation`: `encryptedToken` = HMAC-SHA256 del
 * `plainToken` con el secreto. Zoom lo usa para verificar que controlas el endpoint.
 */
export function tokenValidacionUrl(secret: string, plainToken: string): string {
  return createHmac('sha256', secret).update(plainToken, 'utf8').digest('hex');
}

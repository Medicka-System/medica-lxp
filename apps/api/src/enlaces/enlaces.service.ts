import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Unfurl de ENLACES del Ateneo (tarjeta OpenGraph al pegar un link · §1).
 *
 * El fetch de la página es SERVER-SIDE (el cliente nunca sale a la red del stack),
 * lo que abre la puerta a SSRF: un usuario podría pedir el unfurl de una URL que
 * apunta a un servicio interno (metadata cloud, minio, redis, la BD…). Por eso el
 * NÚCLEO de este módulo es el guard `validarDestino` (abajo), no el parseo OG.
 *
 * Defensa (completa):
 *   - Solo http/https. Todo lo demás se rechaza.
 *   - Denylist de hostnames internos del stack (localhost, minio, redis, la BD,
 *     *.internal…) — además del chequeo de IP.
 *   - Resolución DNS de TODAS las IPs del host y bloqueo de rangos internos
 *     (loopback, privadas, link-local/metadata 169.254, ULA IPv6, 0.0.0.0…).
 *   - Redirects NO se siguen a ciegas: se re-valida host+IP en CADA salto (un
 *     redirect a IP interna es el bypass clásico).
 *   - Timeout (~5s), límite de tamaño (~1.5MB), solo text/html, User-Agent propio.
 *   - FALLA SUAVE: ante cualquier incumplimiento devuelve null (el composer no
 *     muestra tarjeta; nunca rompe la publicación).
 */

export type Enlace = {
  url: string;
  titulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  sitio: string | null;
};

type Destino = { ok: true } | { ok: false; motivo: string };

// Hostnames internos del stack (denylist explícito, además del chequeo por IP).
const HOSTS_INTERNOS = new Set([
  'localhost', 'ip6-localhost', 'ip6-loopback',
  'minio', 'redis', 'db', 'postgres', 'kong', 'supabase-db', 'lrs', 'embeddings',
]);

/** Suma a la denylist los hostnames que salgan de los propios env del stack (BD, storage, redis…). */
function denylistHosts(): Set<string> {
  const s = new Set(HOSTS_INTERNOS);
  for (const raw of [
    process.env.DATABASE_URL, process.env.SUPABASE_URL,
    process.env.STORAGE_ENDPOINT, process.env.STORAGE_ENDPOINT_PUBLICO,
    process.env.REDIS_URL, process.env.REDACTOR_URL,
  ]) {
    if (!raw) continue;
    try { s.add(new URL(raw).hostname.toLowerCase()); } catch { /* env no-URL: ignora */ }
  }
  return s;
}

/** ¿La IP (v4 o v6) cae en un rango interno/no-enrutable? Ante duda, true (bloquea). */
export function ipEsInterna(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) {
    const o = ip.split('.').map(Number);
    if (o.length !== 4 || o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = o;
    if (a === 0) return true;                          // 0.0.0.0/8 ("this host")
    if (a === 127) return true;                        // 127.0.0.0/8 loopback
    if (a === 10) return true;                         // 10.0.0.0/8 privada
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12 privada
    if (a === 192 && b === 168) return true;           // 192.168.0.0/16 privada
    if (a === 169 && b === 254) return true;           // 169.254.0.0/16 link-local (metadata cloud)
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true;                         // multicast/reservado
    return false;
  }
  if (fam === 6) {
    const x = ip.toLowerCase();
    const mapeada = x.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4 mapeada
    if (mapeada) return ipEsInterna(mapeada[1]);
    if (x === '::1' || x === '::') return true;         // loopback / unspecified
    if (x.startsWith('fc') || x.startsWith('fd')) return true; // fc00::/7 ULA
    if (x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb')) return true; // fe80::/10 link-local
    if (x.startsWith('ff')) return true;                // ff00::/8 multicast
    return false;
  }
  return true; // no es IP válida → bloquea
}

/** Valida un hostname: denylist + literal IP interna + resolución DNS a IP interna. */
async function validarHost(hostCrudo: string): Promise<Destino> {
  const h = hostCrudo.toLowerCase().replace(/^\[|\]$/g, ''); // quita corchetes de IPv6 literal
  if (!h) return { ok: false, motivo: 'host vacío' };
  if (denylistHosts().has(h)) return { ok: false, motivo: `host interno del stack (${h})` };
  if (h === 'internal' || h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.localhost')) {
    return { ok: false, motivo: `dominio interno (${h})` };
  }
  if (isIP(h)) {
    return ipEsInterna(h) ? { ok: false, motivo: `IP interna (${h})` } : { ok: true };
  }
  let dirs: { address: string }[];
  try {
    dirs = await lookup(h, { all: true });
  } catch {
    return { ok: false, motivo: 'el host no resuelve por DNS' };
  }
  if (dirs.length === 0) return { ok: false, motivo: 'sin IPs' };
  for (const d of dirs) {
    if (ipEsInterna(d.address)) return { ok: false, motivo: `resuelve a IP interna (${d.address})` };
  }
  return { ok: true };
}

/** Guard de destino: parsea la URL, exige http/https y valida el host. Puro y testeable. */
export async function validarDestino(urlCruda: string): Promise<Destino> {
  let u: URL;
  try {
    u = new URL(urlCruda);
  } catch {
    return { ok: false, motivo: 'URL inválida' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, motivo: `esquema no permitido (${u.protocol})` };
  }
  return validarHost(u.hostname);
}

@Injectable()
export class EnlacesService {
  private readonly log = new Logger(EnlacesService.name);
  private readonly UA = 'MedicaLXP-LinkPreview/1.0 (+https://campus.medica)';
  private readonly TIMEOUT_MS = 5000;
  private readonly MAX_BYTES = 1_500_000; // ~1.5 MB
  private readonly MAX_SALTOS = 3;

  /** Unfurl con guard SSRF. Devuelve el snapshot OG o null (falla suave). */
  async unfurl(urlCruda: string): Promise<Enlace | null> {
    if (typeof urlCruda !== 'string' || urlCruda.length > 2048) return null;
    let u: URL;
    try {
      u = new URL(urlCruda);
    } catch {
      return null;
    }
    try {
      return await this.seguir(u, 0);
    } catch (e) {
      this.log.debug(`unfurl falló (${urlCruda}): ${(e as Error).message}`);
      return null;
    }
  }

  /** Un salto: valida destino, hace GET acotado; re-valida en cada redirect. */
  private async seguir(url: URL, saltos: number): Promise<Enlace | null> {
    if (saltos > this.MAX_SALTOS) return null;
    const v = await validarDestino(url.href);
    if (!v.ok) {
      this.log.warn(`SSRF bloqueado: ${url.href} — ${v.motivo}`);
      return null;
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), this.TIMEOUT_MS);
    try {
      const resp = await fetch(url.href, {
        method: 'GET',
        redirect: 'manual', // NO seguir a ciegas: cada salto se re-valida abajo
        signal: ac.signal,
        headers: { 'user-agent': this.UA, accept: 'text/html,application/xhtml+xml' },
      });

      // Redirect: re-validar host+IP del destino en CADA salto (bypass clásico a IP interna).
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        if (!loc) return null;
        let sig: URL;
        try {
          sig = new URL(loc, url);
        } catch {
          return null;
        }
        return this.seguir(sig, saltos + 1);
      }
      if (!resp.ok) return null;

      const ct = (resp.headers.get('content-type') ?? '').toLowerCase();
      if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

      const html = await this.leerAcotado(resp);
      if (!html) return null;
      return this.parsearOG(html, url);
    } finally {
      clearTimeout(t);
    }
  }

  /** Lee el body en streaming y corta al superar MAX_BYTES (no confía en Content-Length). */
  private async leerAcotado(resp: Response): Promise<string | null> {
    const reader = resp.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > this.MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  /** Parseo OG por regex: og:* con fallback a <title>/<meta name=description>. */
  private parsearOG(html: string, url: URL): Enlace | null {
    const meta = (prop: string): string | null => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
      const tag = html.match(re)?.[0];
      const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
      return c ? decodeHtml(c.trim()) : null;
    };
    const tituloTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const titulo = meta('og:title') ?? (tituloTag ? decodeHtml(tituloTag.trim()) : null);
    const descripcion = meta('og:description') ?? meta('description');
    const sitio = meta('og:site_name') ?? url.hostname.replace(/^www\./, '');

    let imagen: string | null = meta('og:image') ?? meta('og:image:url');
    if (imagen) {
      try {
        const abs = new URL(imagen, url); // og:image relativa → absoluta
        imagen = abs.protocol === 'http:' || abs.protocol === 'https:' ? abs.href : null;
      } catch {
        imagen = null;
      }
    }

    // Sin nada mostrable → sin tarjeta.
    if (!titulo && !imagen && !descripcion) return null;
    return {
      url: url.href,
      titulo: titulo ? titulo.slice(0, 200) : null,
      descripcion: descripcion ? descripcion.slice(0, 300) : null,
      imagen,
      sitio: sitio ? sitio.slice(0, 100) : null,
    };
  }
}

/** Decodifica las entidades HTML mínimas que aparecen en título/descripción. */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;|&#x0*27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

/** uuid del `sub` del JWT que el BFF reenvía en `X-Usuario-Id` (solo-interno · ver abajo). */
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/**
 * Rate-limit por USUARIO (§10/§11) — SIN dependencias nuevas (no se añade `@nestjs/throttler`:
 * §3/§13). Ventana fija por SUJETO y CLASE de endpoint. Al exceder → 429.
 *
 * SUJETO = quién consume el presupuesto:
 *   · El `api` es SOLO-INTERNO (compose: sin labels Traefik ni puertos) → el navegador nunca
 *     lo alcanza; el ÚNICO cliente es el `web` (BFF) por la red del stack. El web ya verificó
 *     la sesión Supabase y reenvía el `sub` del usuario en el header interno `X-Usuario-Id`.
 *     Como el borde no es alcanzable desde el navegador, ese header NO es spoofeable por un
 *     cliente externo → es de confianza para keyear el límite POR USUARIO.
 *   · Fallback a IP cuando el header falta (llamadas internas sin usuario, o rutas viejas):
 *     preserva la protección de antes sin bajar la seguridad.
 *   Antes se keyeaba SIEMPRE por IP; como el web llama server-to-server desde UNA IP interna,
 *   el tope era GLOBAL para toda la escuela (un alumno agotaba el presupuesto de todos).
 *
 * CLASE = qué tan sensible es el endpoint:
 *   · escritura (w · POST/PUT/PATCH/DELETE que MUTA datos): 60 / min / sujeto  (lo estricto)
 *   · lectura   (r · GET/HEAD):                             300 / min / sujeto
 *   · firma     (f · cualquier `/firmar*`: firma de lectura/subida, NO muta):
 *                                                           300 / min / sujeto
 *     La firma (URLs de object storage) no muta estado; sacarla del bucket de writes evita que
 *     la firma del FEED agote el presupuesto y que la SUBIDA real (`firmar-subida`) compita con
 *     ella. `derivar` (encola un job) NO es `/firmar*` → sigue como escritura (baja frecuencia).
 *
 * ALCANCE: in-memory POR PROCESO. Con una sola instancia del `api` (compose actual) es
 * suficiente. Para escalar horizontalmente, respaldar el contador con Redis (ioredis ya
 * es dependencia) — misma interfaz de guard. Incluye poda de memoria como backstop.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly ventanaMs = 60_000;
  private readonly limiteEscritura = 60;
  private readonly limiteLectura = 300;
  private readonly limiteFirma = 300;
  private readonly maxEntradas = 20_000; // backstop de memoria
  private readonly hits = new Map<string, { n: number; reset: number }>();
  private readonly logger = new Logger(RateLimitGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ruta = req.path || req.url || '';
    if (ruta.startsWith('/health')) return true; // healthchecks exentos

    // Clase del endpoint: firma (no muta) < lectura < escritura (muta). `/firmar*` cubre
    // firmar-lectura / firmar-subida (imágenes, video, archivos, reportes); `derivar` NO entra.
    const esFirma = ruta.includes('/firmar');
    const esEscritura = !esFirma && !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const clase = esFirma ? 'f' : esEscritura ? 'w' : 'r';
    const limite = esFirma ? this.limiteFirma : esEscritura ? this.limiteEscritura : this.limiteLectura;

    // Sujeto: usuario del header interno de confianza (api solo-interno); si falta, IP.
    const hdr = req.headers['x-usuario-id'];
    const uid = (Array.isArray(hdr) ? hdr[0] : hdr)?.trim();
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    const sujeto = uid && UUID_RE.test(uid) ? `u:${uid}` : `ip:${ip}`;
    const clave = `${sujeto}:${clase}`;
    const ahora = Date.now();

    let entrada = this.hits.get(clave);
    if (!entrada || entrada.reset <= ahora) {
      entrada = { n: 0, reset: ahora + this.ventanaMs };
      this.hits.set(clave, entrada);
    }
    entrada.n += 1;

    if (this.hits.size > this.maxEntradas) this.podar(ahora);

    if (entrada.n > limite) {
      const segundos = Math.max(1, Math.ceil((entrada.reset - ahora) / 1000));
      this.logger.warn(`Rate-limit excedido (${clave}, ${entrada.n}/${limite})`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
          retryAfter: segundos,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private podar(ahora: number): void {
    for (const [clave, entrada] of this.hits) {
      if (entrada.reset <= ahora) this.hits.delete(clave);
    }
  }
}

import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Rate-limit por IP (§10/§11) — SIN dependencias nuevas (no se añade `@nestjs/throttler`:
 * §3/§13). Ventana fija por IP y clase de método: las ESCRITURAS (no-GET) son el objetivo
 * sensible (auth/writes) y van más estrictas que las lecturas. `/health` queda exento
 * (healthchecks). Al exceder → 429.
 *
 * LÍMITES (documentados, razonables para ~800 alumnos):
 *   · escrituras (POST/PUT/PATCH/DELETE): 60 / minuto / IP
 *   · lecturas   (GET/HEAD):             300 / minuto / IP
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
  private readonly maxEntradas = 20_000; // backstop de memoria
  private readonly hits = new Map<string, { n: number; reset: number }>();
  private readonly logger = new Logger(RateLimitGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ruta = req.path || req.url || '';
    if (ruta.startsWith('/health')) return true; // healthchecks exentos

    const esEscritura = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    const clave = `${ip}:${esEscritura ? 'w' : 'r'}`;
    const limite = esEscritura ? this.limiteEscritura : this.limiteLectura;
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

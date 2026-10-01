import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import type { Request } from 'express';
import { verificarJwt } from './jwt.verificar';

/**
 * Guard de autenticación del `api` (§10): verifica la firma ES256 del JWT contra el
 * JWKS de Supabase (`SUPABASE_JWT_JWKS_URL`), extrae el `sub` y lo deja en `req.user`.
 * NO confía en headers sin verificar. Rutas de dominio que actúan a nombre de un
 * usuario optan con `@UseGuards(SupabaseJwtGuard)` + `@UsuarioSub()`.
 * `api`/`worker` siguen usando service-role para lo suyo (jobs/proyecciones).
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      const url = process.env.SUPABASE_JWT_JWKS_URL;
      if (!url) {
        throw new UnauthorizedException('SUPABASE_JWT_JWKS_URL no configurado');
      }
      this.jwks = createRemoteJWKSet(new URL(url));
    }
    return this.jwks;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: { sub: string } }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token Bearer');
    }
    try {
      const { sub } = await verificarJwt(token, this.getJwks());
      req.user = { sub };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Inyecta el `sub` (user_id) verificado por `SupabaseJwtGuard` en un handler:
 *   @UseGuards(SupabaseJwtGuard) ... metodo(@UsuarioSub() userId: string) { ... }
 */
export const UsuarioSub = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: { sub: string } }>();
    return req.user?.sub;
  },
);

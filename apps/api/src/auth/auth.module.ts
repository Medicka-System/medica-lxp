import { Module } from '@nestjs/common';
import { SupabaseJwtGuard } from './jwt.guard';

/**
 * Módulo de autenticación: expone `SupabaseJwtGuard` para que cualquier módulo de
 * dominio pueda protegerse (`@UseGuards(SupabaseJwtGuard)`). No aplica guard global
 * (webhooks/health y los flujos service-role no llevan JWT de usuario · §10).
 */
@Module({
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class AuthModule {}

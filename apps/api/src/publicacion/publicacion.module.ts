import { Module } from '@nestjs/common';
import { PublicacionController } from './publicacion.controller';
import { PublicacionService } from './publicacion.service';

/** Publicación con versionado del programa (§5B/§6 · Sprint 4.5). Usa DbModule. */
@Module({
  controllers: [PublicacionController],
  providers: [PublicacionService],
})
export class PublicacionModule {}

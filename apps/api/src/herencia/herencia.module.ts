import { Module } from '@nestjs/common';
import { HerenciaController } from './herencia.controller';
import { HerenciaService } from './herencia.service';

/** Herencia programa→grupo con overrides (§6 · Sprint 4.5). Usa DbModule (global). */
@Module({
  controllers: [HerenciaController],
  providers: [HerenciaService],
})
export class HerenciaModule {}

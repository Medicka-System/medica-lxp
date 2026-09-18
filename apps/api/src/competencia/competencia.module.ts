import { Module } from '@nestjs/common';
import { CompetenciaController } from './competencia.controller';
import { CompetenciaService } from './competencia.service';

@Module({
  controllers: [CompetenciaController],
  providers: [CompetenciaService],
  exports: [CompetenciaService],
})
export class CompetenciaModule {}

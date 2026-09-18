import { Module } from '@nestjs/common';
import { RubricasController } from './rubricas.controller';
import { RubricasService } from './rubricas.service';

/**
 * Catálogo de rúbricas (§5B). `DbService` y `ColasProducer` son globales; aquí solo
 * el servicio/controller de las escrituras con lógica (validación + RAG).
 */
@Module({
  controllers: [RubricasController],
  providers: [RubricasService],
})
export class RubricasModule {}

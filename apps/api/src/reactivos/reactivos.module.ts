import { Module } from '@nestjs/common';
import { ReactivosController } from './reactivos.controller';
import { ReactivosService } from './reactivos.service';

/**
 * Import de reactivos de autoevaluación (§7A · course builder). `DbService` es global.
 * La propuesta de examen con Eco vive en `AiController` (reusa la infra de `ai`).
 */
@Module({
  controllers: [ReactivosController],
  providers: [ReactivosService],
})
export class ReactivosModule {}

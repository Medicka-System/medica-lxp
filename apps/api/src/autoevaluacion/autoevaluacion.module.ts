import { Module } from '@nestjs/common';
import { XapiModule } from '../xapi/xapi.module';
import { AutoevaluacionController } from './autoevaluacion.controller';
import { AutoevaluacionService } from './autoevaluacion.service';

/**
 * Módulo de autoevaluación (§7A). Usa DbModule (global) y reusa la capa xAPI
 * (XapiModule); no reimplementa nada. La competencia se aporta vía LRS (§7), no por
 * recálculo (ver AutoevaluacionService).
 */
@Module({
  imports: [XapiModule],
  controllers: [AutoevaluacionController],
  providers: [AutoevaluacionService],
})
export class AutoevaluacionModule {}

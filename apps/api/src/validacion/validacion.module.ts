import { Module } from '@nestjs/common';
import { CompetenciaModule } from '../competencia/competencia.module';
import { XapiModule } from '../xapi/xapi.module';
import { ValidacionController } from './validacion.controller';
import { ValidacionService } from './validacion.service';

/**
 * Flujo de validación del docente (§5B/§7A · Sprint 5). Reusa el motor de
 * competencia (Sprint 3, vía `CompetenciaService`) y la capa xAPI (Sprint 2, vía
 * `XapiService`). Usa DbModule (global). No reconstruye nada de esos dominios.
 */
@Module({
  imports: [CompetenciaModule, XapiModule],
  controllers: [ValidacionController],
  providers: [ValidacionService],
})
export class ValidacionModule {}

import { Module } from '@nestjs/common';
import { CompetenciaModule } from '../competencia/competencia.module';
import { XapiModule } from '../xapi/xapi.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ValidacionController } from './validacion.controller';
import { ValidacionService } from './validacion.service';

/**
 * Flujo de validación del docente (§5B/§7A · Sprint 5). Reusa el motor de
 * competencia (Sprint 3, vía `CompetenciaService`), la capa xAPI (Sprint 2, vía
 * `XapiService`) y el motor de notificaciones (Sprint 8.5, para avisar al alumno).
 * Usa DbModule (global). No reconstruye nada de esos dominios.
 */
@Module({
  imports: [CompetenciaModule, XapiModule, NotificacionesModule],
  controllers: [ValidacionController],
  providers: [ValidacionService],
})
export class ValidacionModule {}

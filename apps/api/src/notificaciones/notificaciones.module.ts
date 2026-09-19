import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { CorreoFactory } from './correo/correo.factory';
import { MockCorreoAdaptador } from './correo/mock.adaptador';
import { ResendAdaptador } from './correo/resend.adaptador';
import { WhatsAppStubAdaptador } from './whatsapp/whatsapp.adaptador';

/**
 * Motor de notificaciones multicanal (§8 job #12 · Sprint 8.5). Un solo servicio recibe
 * "evento → usuario" y despacha por canal (in-app/correo/WhatsApp) según preferencia.
 * Adaptadores INTERCAMBIABLES por config (correo Resend↔Mock; WhatsApp stub). Usa
 * DbModule y ColasModule (globales). Exporta el servicio para engancharlo desde otros
 * módulos de dominio (ej. validación).
 */
@Module({
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    CorreoFactory,
    MockCorreoAdaptador,
    ResendAdaptador,
    WhatsAppStubAdaptador,
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}

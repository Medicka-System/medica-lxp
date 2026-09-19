import { Injectable, Logger } from '@nestjs/common';
import type { WhatsAppAdaptador } from '../notificaciones.interface';

/**
 * Adaptador de WhatsApp — STUB (§8 "avisos clave por la infra existente"). Hoy no hay
 * infra de WhatsApp confirmada en el LXP; este stub loggea y no envía, para que el
 * motor no rompa cuando la preferencia del usuario incluye WhatsApp. El teléfono del
 * destinatario NO vive en `lxp.perfiles`; vendrá de CORA (`public.usuarios`, solo
 * lectura · §10) cuando se cablee el proveedor real (Twilio/WABA/infra del CRM).
 *
 * Intercambiable igual que el correo: implementar otro `WhatsAppAdaptador` y proveerlo.
 */
@Injectable()
export class WhatsAppStubAdaptador implements WhatsAppAdaptador {
  readonly nombre = 'whatsapp-stub';
  private readonly logger = new Logger(WhatsAppStubAdaptador.name);

  async enviar(destinatario: string, texto: string): Promise<{ id: string }> {
    this.logger.log(
      `[STUB WhatsApp] a ${destinatario}: "${texto.slice(0, 80)}" (no se envió: infra pendiente · §9).`,
    );
    return { id: `whatsapp-stub:${destinatario}` };
  }
}

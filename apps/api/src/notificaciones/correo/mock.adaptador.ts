import { Injectable, Logger } from '@nestjs/common';
import type { CorreoAdaptador, CorreoMensaje } from '../notificaciones.interface';

/**
 * Adaptador de correo MOCK (default sin `RESEND_API_KEY` · mismo patrón que el MOCK de
 * Eco). No envía nada: loggea el correo y devuelve un id determinista, para que el
 * motor funcione end-to-end en local/CI sin proveedor real ni secretos.
 */
@Injectable()
export class MockCorreoAdaptador implements CorreoAdaptador {
  readonly nombre = 'mock';
  private readonly logger = new Logger(MockCorreoAdaptador.name);

  async enviar(mensaje: CorreoMensaje): Promise<{ id: string }> {
    this.logger.log(
      `[MOCK correo] a ${mensaje.to} · asunto: "${mensaje.asunto}" (no se envió: falta RESEND_API_KEY o NOTIFICACIONES_PROVIDER=mock).`,
    );
    return { id: `mock:${mensaje.to}` };
  }
}

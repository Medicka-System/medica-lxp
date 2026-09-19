import { Injectable, Logger } from '@nestjs/common';
import type { CorreoAdaptador } from '../notificaciones.interface';
import { MockCorreoAdaptador } from './mock.adaptador';
import { ResendAdaptador } from './resend.adaptador';

/**
 * Elige el adaptador de correo activo por CONFIG (§3 · intercambiable). Misma lógica
 * que la factory de proveedores de Eco:
 *   · `NOTIFICACIONES_PROVIDER=mock` fuerza el MOCK (interruptor global).
 *   · `resend` real solo si hay `RESEND_API_KEY`; si falta, cae al MOCK con aviso.
 *   · default (sin PROVIDER): resend si hay key, MOCK si no → arranca sin secretos.
 */
@Injectable()
export class CorreoFactory {
  private readonly logger = new Logger(CorreoFactory.name);

  constructor(
    private readonly mock: MockCorreoAdaptador,
    private readonly resend: ResendAdaptador,
  ) {}

  obtener(): CorreoAdaptador {
    const proveedor = (process.env.NOTIFICACIONES_PROVIDER ?? '').toLowerCase();
    if (proveedor === 'mock') return this.mock;

    if (proveedor === 'resend' || (!proveedor && process.env.RESEND_API_KEY)) {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn('Falta RESEND_API_KEY; usando MOCK de correo.');
        return this.mock;
      }
      return this.resend;
    }
    return this.mock;
  }
}

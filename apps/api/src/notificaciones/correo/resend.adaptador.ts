import { Injectable, Logger } from '@nestjs/common';
import type { CorreoAdaptador, CorreoMensaje } from '../notificaciones.interface';

/**
 * Adaptador de correo Resend (§3 · Sprint 8.5). Habla con la API REST de Resend por
 * `fetch` (SIN SDK, para no sumar dependencia fuera de la §3 — mismo criterio que el
 * adaptador Anthropic de Eco). NO se usa hasta que haya `RESEND_API_KEY`: la factory
 * elige el MOCK mientras no exista. Enchufarlo = poner la key en el `.env`.
 *
 * Intercambiable: cambiar de proveedor de correo es escribir otro `CorreoAdaptador`
 * y elegirlo en la factory por config — no se toca el motor.
 */
@Injectable()
export class ResendAdaptador implements CorreoAdaptador {
  readonly nombre = 'resend';
  private readonly logger = new Logger(ResendAdaptador.name);
  private static readonly ENDPOINT = 'https://api.resend.com/emails';

  async enviar(mensaje: CorreoMensaje): Promise<{ id: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Defensa en profundidad: la factory ya evita llegar aquí sin key.
      throw new Error('RESEND_API_KEY ausente: no se puede usar el adaptador Resend.');
    }
    const from =
      process.env.NOTIFICACIONES_FROM_EMAIL ?? 'campus@medicacapacitacion.com';

    const res = await fetch(ResendAdaptador.ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: mensaje.to,
        subject: mensaje.asunto,
        text: mensaje.texto,
        ...(mensaje.html ? { html: mensaje.html } : {}),
      }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(
        `Resend respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`,
      );
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: data.id ?? '' };
  }
}

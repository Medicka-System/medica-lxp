import { Injectable, Logger } from '@nestjs/common';
import {
  QUEUE_NOTIFICACIONES,
  type CanalNotificacion,
  type NotificacionJob,
} from '@campus/shared';
import { ColasProducer } from '../colas/colas-producer';
import { DbService } from '../db/db.service';
import { CorreoFactory } from './correo/correo.factory';
import { WhatsAppStubAdaptador } from './whatsapp/whatsapp.adaptador';
import type { ResultadoDespacho } from './notificaciones.interface';
import { canalesParaTipo } from './preferencias';
import { correoHtml, resolverContenido } from './plantillas';
import {
  datosDestinatario,
  insertarInApp,
  leerPreferencias,
} from './notificaciones.repositorio';

/**
 * MOTOR DE NOTIFICACIONES (§8 job #12 · Sprint 8.5). Recibe "evento → usuario" y
 * despacha por canal según el TIPO y la PREFERENCIA del usuario. No es proxy de CRUD
 * (§2): la selección de canal + el envío por adaptadores intercambiables es dominio,
 * y la ESCRITURA in-app la hace el motor (service_role), no el cliente.
 *
 * Dos entradas:
 *   · `encolar()` — productores (validación, hitos, consultas web…) dejan el evento en
 *     la cola; el worker aporta buffer/retry y llama a `despachar()`.
 *   · `despachar()` — el trabajo real, invocado por el worker (patrón worker→servicio,
 *     igual que `eco-evaluacion`/`render-tts`). También corre en tests sin worker.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
    private readonly correoFactory: CorreoFactory,
    private readonly whatsapp: WhatsAppStubAdaptador,
  ) {}

  /** Encola un evento de notificación hacia el worker (buffer/retry). */
  encolar(job: NotificacionJob): Promise<string> {
    return this.colas.encolar(QUEUE_NOTIFICACIONES, job);
  }

  /** Encola la misma notificación para varios destinatarios (fan-out de anuncios). */
  async encolarVarios(
    userIds: string[],
    base: Omit<NotificacionJob, 'userId'>,
  ): Promise<string[]> {
    const ids = await Promise.all(
      userIds.map((userId) => this.encolar({ ...base, userId })),
    );
    return ids;
  }

  /**
   * Despacha una notificación: resuelve contenido, lee preferencia, y entrega por los
   * canales activos. In-app se PERSISTE (la campana); correo/WhatsApp se envían por sus
   * adaptadores. Registra en `canales_enviados` por qué canales salió realmente.
   */
  async despachar(job: NotificacionJob): Promise<ResultadoDespacho> {
    const { titulo, cuerpo } = resolverContenido(job);
    const prefs = await leerPreferencias(this.db.sql, job.userId);
    const canales = canalesParaTipo(prefs, job.tipo);
    const enviados: CanalNotificacion[] = [];

    // Correo (opt-in): requiere que el perfil tenga email.
    if (canales.includes('correo')) {
      const dest = await datosDestinatario(this.db.sql, job.userId);
      if (dest?.email) {
        const adaptador = this.correoFactory.obtener();
        await adaptador.enviar({
          to: dest.email,
          asunto: titulo,
          texto: cuerpo,
          html: correoHtml({ titulo, cuerpo }),
        });
        enviados.push('correo');
      } else {
        this.logger.warn(
          `Usuario ${job.userId} sin email; se omite el canal correo.`,
        );
      }
    }

    // WhatsApp (opt-in): avisos clave. Hoy stub (§9).
    if (canales.includes('whatsapp')) {
      await this.whatsapp.enviar(job.userId, `${titulo} — ${cuerpo}`);
      enviados.push('whatsapp');
    }

    // In-app (la campana): se persiste al final con el registro de canales usados.
    let notificacionId: string | undefined;
    if (canales.includes('in_app')) {
      notificacionId = await insertarInApp(this.db.sql, job, titulo, cuerpo, [
        'in_app',
        ...enviados,
      ]);
      enviados.unshift('in_app');
    }

    this.logger.log(
      `Notificación "${job.tipo}" → ${job.userId}: canales [${enviados.join(', ') || 'ninguno'}].`,
    );
    return { notificacionId, canales: enviados };
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import type { NotificacionJob } from '@campus/shared';
import { NotificacionesService } from './notificaciones.service';
import type { ResultadoDespacho } from './notificaciones.interface';
import { anuncioNotifSchema, notificacionJobSchema } from './dto';

/**
 * API del motor de notificaciones (§8 job #12). Es dominio/orquestación (permitido en
 * `api` · §2), no proxy de CRUD: la LECTURA de la campana y la edición de preferencias
 * van directas `web → Supabase` con RLS (0019). Aquí solo se DISPARA/DESPACHA.
 */
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notif: NotificacionesService) {}

  /**
   * Despacha una notificación SÍNCRONO. Lo llama el worker `notificaciones` (que aporta
   * el buffer/retry); útil también para probar el motor de punta a punta sin worker.
   */
  @Post('despachar')
  @HttpCode(200)
  despachar(@Body() body: unknown): Promise<ResultadoDespacho> {
    const parsed = notificacionJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.notif.despachar(parsed.data as NotificacionJob);
  }

  /**
   * Encola un evento de notificación (buffer/retry vía worker). Lo llaman los flujos
   * web-originados que no viven en `api` (ej. una consulta 1:1 nueva): el CRUD ya fue
   * directo a Supabase; esto solo dispara el side-effect de fondo (no es proxy · §2).
   */
  @Post('evento')
  @HttpCode(202)
  async evento(@Body() body: unknown): Promise<{ jobId: string }> {
    const parsed = notificacionJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const jobId = await this.notif.encolar(parsed.data as NotificacionJob);
    return { jobId };
  }

  /** Fan-out de un anuncio a varios destinatarios (lo llama el Studio admin/docente). */
  @Post('anuncio')
  @HttpCode(202)
  async anuncio(@Body() body: unknown): Promise<{ encolados: number }> {
    const parsed = anuncioNotifSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const { userIds, titulo, cuerpo, entidadId } = parsed.data;
    const ids = await this.notif.encolarVarios(userIds, {
      tipo: 'anuncio',
      titulo,
      cuerpo,
      entidadTipo: 'anuncio',
      entidadId,
    });
    return { encolados: ids.length };
  }
}

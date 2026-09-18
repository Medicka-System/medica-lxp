import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  tokenValidacionUrl,
  validarFirmaZoom,
} from './firma-zoom';
import { ClasesService, type ZoomRecordingCompleted } from './clases.service';

/**
 * Webhook de Zoom (§9/§10 · Sprint 6). Valida la FIRMA antes de procesar (ningún
 * webhook se atiende sin firma válida). Atiende el challenge `endpoint.url_validation`
 * y, en `recording.completed`, encola la ingesta de la grabación a object storage.
 *
 * En local NO hay Zoom real: el webhook se SIMULA firmando con `ZOOM_WEBHOOK_SECRET_TOKEN`
 * (mismo algoritmo). El binario nunca pasa por el `api` — lo mueve el worker.
 */
@Controller('zoom')
export class ZoomWebhookController {
  private readonly logger = new Logger(ZoomWebhookController.name);
  private readonly secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? '';

  constructor(private readonly clases: ClasesService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-zm-signature') firma: string | undefined,
    @Headers('x-zm-request-timestamp') timestamp: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    const cuerpoCrudo = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    const evento = String(body?.event ?? '');

    // El challenge de validación de URL también debe verificar la firma.
    const firmaOk = validarFirmaZoom({
      secret: this.secret,
      timestamp: timestamp ?? '',
      cuerpoCrudo,
      firma: firma ?? '',
    });
    if (!firmaOk) {
      throw new UnauthorizedException('Firma de webhook de Zoom inválida.');
    }

    // Challenge de suscripción: responder con el encryptedToken (§9).
    if (evento === 'endpoint.url_validation') {
      const plainToken = String(
        (body?.payload as { plainToken?: string })?.plainToken ?? '',
      );
      return {
        plainToken,
        encryptedToken: tokenValidacionUrl(this.secret, plainToken),
      };
    }

    if (evento === 'recording.completed') {
      const ev = this.normalizarGrabacion(body);
      const r = await this.clases.ingestarGrabacion(ev);
      this.logger.log(
        `recording.completed reunión ${ev.meetingId}: ${
          r.encolado ? `encolado ${r.jobId}` : `ignorado (${r.motivo})`
        }.`,
      );
      return { recibido: true, ...r };
    }

    // Otros eventos: aceptados pero no procesados.
    return { recibido: true, evento };
  }

  /** Extrae de un payload de Zoom la forma mínima que consume el dominio. */
  private normalizarGrabacion(body: Record<string, unknown>): ZoomRecordingCompleted {
    const payload = (body?.payload ?? {}) as Record<string, unknown>;
    const objeto = (payload?.object ?? {}) as Record<string, unknown>;
    const files = (objeto?.recording_files ?? []) as Array<Record<string, unknown>>;
    return {
      meetingId: String(objeto?.id ?? objeto?.uuid ?? ''),
      tokenDescarga: payload?.download_token
        ? String(payload.download_token)
        : undefined,
      archivos: files.map((f) => ({
        id: f?.id ? String(f.id) : undefined,
        tipo: f?.file_type ? String(f.file_type) : undefined,
        urlDescarga: String(f?.download_url ?? ''),
      })),
      cruda: {
        meeting_id: objeto?.id,
        topic: objeto?.topic,
        recording_count: objeto?.recording_count,
      },
    };
  }
}

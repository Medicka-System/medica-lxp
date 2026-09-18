import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** Datos para agendar una reunión en vivo. */
export interface CrearReunionOpts {
  titulo: string;
  inicioProgramado?: string; // ISO 8601
  duracionMin?: number;
}

/** Resultado de crear/agendar una reunión (Zoom real o stub local). */
export interface ReunionCreada {
  reunionExternaId: string;
  enlaceUnion: string;
  enlaceInicio: string;
  simulada: boolean;
  cruda: Record<string, unknown>;
}

/**
 * Integración con Zoom (§9 · Sprint 6). El docente **lanza** la clase (no se embebe el
 * SDK); aquí solo se CREA/AGENDA la reunión vía la REST API (Server-to-Server OAuth).
 * Si no hay credenciales `ZOOM_*` (local/dev), devuelve una reunión **simulada**
 * determinista — así el flujo end-to-end corre sin Zoom real (Sprint 6 = local primero).
 */
@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);
  private readonly accountId = process.env.ZOOM_ACCOUNT_ID ?? '';
  private readonly clientId = process.env.ZOOM_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.ZOOM_CLIENT_SECRET ?? '';

  /** ¿Hay credenciales para hablar con la API real de Zoom? */
  disponible(): boolean {
    return Boolean(this.accountId && this.clientId && this.clientSecret);
  }

  /** Crea/agenda una reunión: API real si hay credenciales, si no una stub local. */
  async crearReunion(opts: CrearReunionOpts): Promise<ReunionCreada> {
    if (!this.disponible()) return this.reunionSimulada(opts);

    const token = await this.obtenerToken();
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: opts.titulo,
        type: opts.inicioProgramado ? 2 : 1, // 2 = programada, 1 = instantánea
        ...(opts.inicioProgramado ? { start_time: opts.inicioProgramado } : {}),
        ...(opts.duracionMin ? { duration: opts.duracionMin } : {}),
        settings: { auto_recording: 'cloud' },
      }),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Zoom respondió ${res.status}: ${cuerpo.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    return {
      reunionExternaId: String(data.id ?? ''),
      enlaceUnion: String(data.join_url ?? ''),
      enlaceInicio: String(data.start_url ?? ''),
      simulada: false,
      cruda: data,
    };
  }

  /** Token OAuth Server-to-Server (account_credentials). */
  private async obtenerToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`Zoom OAuth respondió ${res.status}.`);
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new ServiceUnavailableException('Zoom OAuth sin access_token.');
    }
    return data.access_token;
  }

  /**
   * Reunión simulada determinista (sin Zoom real). El id se deriva de título + inicio
   * para que sea estable y trazable en local; los enlaces imitan la forma de Zoom.
   */
  private reunionSimulada(opts: CrearReunionOpts): ReunionCreada {
    const semilla = `${opts.titulo}|${opts.inicioProgramado ?? ''}`;
    const hash = createHash('sha256').update(semilla).digest('hex');
    const reunionExternaId = BigInt(`0x${hash.slice(0, 15)}`).toString().slice(0, 11);
    this.logger.warn(
      `Zoom sin credenciales: reunión SIMULADA ${reunionExternaId} para "${opts.titulo}".`,
    );
    return {
      reunionExternaId,
      enlaceUnion: `https://zoom.us/j/${reunionExternaId}`,
      enlaceInicio: `https://zoom.us/s/${reunionExternaId}?zak=simulado`,
      simulada: true,
      cruda: { simulada: true, topic: opts.titulo },
    };
  }
}

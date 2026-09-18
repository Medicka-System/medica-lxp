import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { cargarTtsConfigActiva } from './tts-config.repositorio';
import type { TtsConfig } from './tts-config.tipos';

/**
 * Lee la config de TTS activa de la BD y la cachea con TTL corto (igual que
 * `EcoConfigService` · §7A). No adivina defaults: si no hay config activa, lanza —
 * el súper admin debe configurarla. `invalidar()` refresca tras editar la config.
 */
@Injectable()
export class TtsConfigService {
  private readonly logger = new Logger(TtsConfigService.name);
  private cache?: { config: TtsConfig; expira: number };
  private static readonly TTL_MS = 30_000;

  constructor(private readonly db: DbService) {}

  async activa(): Promise<TtsConfig> {
    const ahora = Date.now();
    if (this.cache && this.cache.expira > ahora) return this.cache.config;

    const config = await cargarTtsConfigActiva(this.db.sql);
    if (!config) {
      throw new ServiceUnavailableException(
        'TTS no tiene una configuración activa en lxp.tts_config. Configúrala antes de sintetizar.',
      );
    }
    this.cache = { config, expira: ahora + TtsConfigService.TTL_MS };
    return config;
  }

  invalidar(): void {
    this.cache = undefined;
    this.logger.log('Cache de config de TTS invalidado.');
  }
}

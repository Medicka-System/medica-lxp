import { Injectable, Logger } from '@nestjs/common';
import type { TTSProvider } from './tts-proveedor.interface';
import { MockTtsProvider } from './mock.proveedor';
import { OpenAiTtsProvider } from './openai.proveedor';

/**
 * Elige el adaptador de TTS según la config (proveedor de `lxp.tts_config`), con
 * fallback seguro al mock. Copia el patrón de `ProveedorFactory` de Eco (§7A):
 *  - `TTS_PROVIDER=mock` (default) = interruptor global de dev: SIEMPRE mock.
 *  - proveedor real cableado + key presente = usa el proveedor real.
 *  - proveedor pedido sin key / desconocido = cae al mock (nunca revienta el flujo).
 * Model-agnostic: sumar ElevenLabs es un `case` más aquí, sin tocar el servicio.
 */
@Injectable()
export class TtsProveedorFactory {
  private readonly logger = new Logger(TtsProveedorFactory.name);

  constructor(
    private readonly mock: MockTtsProvider,
    private readonly openai: OpenAiTtsProvider,
  ) {}

  obtener(proveedor: string): TTSProvider {
    const forzarMock = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase() === 'mock';
    if (forzarMock) return this.mock;

    switch (proveedor.toLowerCase()) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          this.logger.warn('Config pide OpenAI pero falta OPENAI_API_KEY; usando MOCK.');
          return this.mock;
        }
        return this.openai;
      case 'mock':
        return this.mock;
      // case 'elevenlabs': return this.elevenlabs;  // (pendiente · agregar sin tocar lo demás)
      default:
        this.logger.warn(`Proveedor TTS "${proveedor}" no reconocido; usando MOCK.`);
        return this.mock;
    }
  }
}

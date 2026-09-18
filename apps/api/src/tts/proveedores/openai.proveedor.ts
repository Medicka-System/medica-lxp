import { Injectable, Logger } from '@nestjs/common';
import {
  mimeDeFormato,
  type RespuestaTTS,
  type SolicitudTTS,
  type TTSProvider,
} from './tts-proveedor.interface';

/**
 * Proveedor TTS de OpenAI (`/v1/audio/speech`). Traduce la solicitud normalizada al
 * cuerpo del endpoint y devuelve el binario del audio. La key vive SOLO en el `api`
 * (§5/§10); si falta, el factory ni siquiera llega aquí (cae al mock). Es una pieza
 * intercambiable: agregar ElevenLabs = otro archivo como este, sin tocar el resto.
 */
@Injectable()
export class OpenAiTtsProvider implements TTSProvider {
  readonly nombre = 'openai';
  private readonly logger = new Logger(OpenAiTtsProvider.name);
  private static readonly ENDPOINT = 'https://api.openai.com/v1/audio/speech';

  async sintetizar(solicitud: SolicitudTTS): Promise<RespuestaTTS> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY ausente: no se puede sintetizar con OpenAI (§3).');
    }

    const res = await fetch(OpenAiTtsProvider.ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: solicitud.modelo,
        voice: solicitud.voz,
        input: solicitud.texto,
        response_format: solicitud.formato,
        speed: solicitud.velocidad,
      }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(
        `OpenAI TTS respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`,
      );
    }

    const audio = Buffer.from(await res.arrayBuffer());
    this.logger.log(`TTS OpenAI: ${audio.length} bytes (${solicitud.formato}, voz ${solicitud.voz}).`);
    return {
      audio,
      mime: mimeDeFormato(solicitud.formato),
      proveedor: this.nombre,
      formato: solicitud.formato,
    };
  }
}

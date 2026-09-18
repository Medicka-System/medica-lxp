import { Injectable, Logger } from '@nestjs/common';
import type { LLMProvider, RespuestaLLM, SolicitudLLM } from './proveedor.interface';

/**
 * Adaptador de Anthropic (Claude) — el proveedor real por default (§3). Habla con
 * la Messages API por `fetch` (sin SDK, para no sumar dependencia fuera de la §3).
 * NO se usa hasta que haya `ANTHROPIC_API_KEY`: el factory elige el MOCK mientras
 * no exista. Enchufarlo = poner la key y `ECO_PROVIDER=anthropic` en el `.env`.
 *
 * El modelo concreto (haiku/sonnet/opus) viene en `solicitud.modelo`, resuelto desde
 * la config del paso (`lxp.eco_config.modelos`) — este adaptador no fija modelos.
 */
@Injectable()
export class AnthropicProvider implements LLMProvider {
  readonly nombre = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private static readonly ENDPOINT = 'https://api.anthropic.com/v1/messages';
  private static readonly API_VERSION = '2023-06-01';

  async generar(solicitud: SolicitudLLM): Promise<RespuestaLLM> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Defensa en profundidad: el factory ya evita llegar aquí sin key.
      throw new Error('ANTHROPIC_API_KEY ausente: no se puede usar el proveedor Anthropic.');
    }

    const res = await fetch(AnthropicProvider.ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': AnthropicProvider.API_VERSION,
      },
      body: JSON.stringify({
        model: solicitud.modelo,
        max_tokens: solicitud.maxTokens,
        temperature: solicitud.temperatura,
        system: solicitud.system,
        messages: [{ role: 'user', content: solicitud.prompt }],
      }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(
        `Anthropic respondió ${res.status} ${res.statusText}: ${cuerpo.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as AnthropicRespuesta;
    const texto = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();

    return {
      texto,
      proveedor: this.nombre,
      modelo: data.model ?? solicitud.modelo,
      tokens: data.usage
        ? { entrada: data.usage.input_tokens, salida: data.usage.output_tokens }
        : undefined,
    };
  }
}

interface AnthropicRespuesta {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

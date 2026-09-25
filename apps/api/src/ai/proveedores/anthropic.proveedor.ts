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

    // ── Prompt caching (§7A) ──────────────────────────────────────────────
    // Se cachea el PREFIJO estable con cache_control ephemeral (TTL default 5m):
    //   1) system (rol/reglas/esquema JSON) — idéntico en cada ítem del lote.
    //   2) prefijoCacheable (verdad + rúbrica + encabezados) — estable por caso/rúbrica.
    // La respuesta del alumno (variable) va DESPUÉS, en un bloque SIN cache_control, así
    // el prefijo pega en caché entre ítems y re-corridas dentro de la ventana.
    const cache = { type: 'ephemeral' as const };
    const system = [{ type: 'text', text: solicitud.system, cache_control: cache }];

    const contenidoUsuario = solicitud.prefijoCacheable
      ? [
          { type: 'text', text: solicitud.prefijoCacheable, cache_control: cache },
          { type: 'text', text: solicitud.prompt },
        ]
      : [{ type: 'text', text: solicitud.prompt }];

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
        system,
        messages: [{ role: 'user', content: contenidoUsuario }],
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
        ? {
            entrada: data.usage.input_tokens,
            salida: data.usage.output_tokens,
            cacheWrite: data.usage.cache_creation_input_tokens ?? 0,
            cacheRead: data.usage.cache_read_input_tokens ?? 0,
          }
        : undefined,
    };
  }
}

interface AnthropicRespuesta {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    /** Tokens escritos al caché (1ª vez que se ve el prefijo). */
    cache_creation_input_tokens?: number;
    /** Tokens leídos del caché (re-uso del prefijo dentro de la ventana). */
    cache_read_input_tokens?: number;
  };
}

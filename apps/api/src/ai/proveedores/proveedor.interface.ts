/**
 * Contrato model-agnóstico de Eco (§3/§7A). "El modelo que resume" y "el que juzga"
 * son piezas intercambiables: agregar Gemini u open-source self-hosted = escribir
 * OTRO adaptador que implemente `LLMProvider`, SIN tocar el pipeline. Qué modelo usa
 * cada paso sale de la config (`lxp.eco_config.modelos`), no de aquí.
 */

/** Petición normalizada a un LLM (misma forma para todo proveedor). */
export interface SolicitudLLM {
  /** Instrucción de sistema (rol/reglas). Es parte del PREFIJO estable → se cachea. */
  system: string;
  /**
   * PREFIJO estable del mensaje de usuario que conviene CACHEAR (§7A · prompt caching):
   * verdad estructurada + rúbrica + encabezados. Va ANTES de la respuesta del alumno.
   * Opcional: si no se pasa, el mensaje de usuario es solo `prompt` (sin caché de prefijo).
   */
  prefijoCacheable?: string;
  /** Prompt de usuario VARIABLE (la respuesta del alumno). Va DESPUÉS del prefijo, sin cachear. */
  prompt: string;
  /** Id del modelo concreto del proveedor (viene de la config del paso). */
  modelo: string;
  temperatura: number;
  maxTokens: number;
}

/** Respuesta normalizada de un LLM. */
export interface RespuestaLLM {
  /** Texto crudo del modelo (el pipeline lo parsea a JSON de juicio). */
  texto: string;
  proveedor: string;
  modelo: string;
  /**
   * Consumo de tokens si el proveedor lo reporta (para costos/telemetría). `cacheWrite`
   * = tokens escritos al caché (1ª vez, más caros); `cacheRead` = leídos del caché (baratos).
   */
  tokens?: { entrada: number; salida: number; cacheWrite?: number; cacheRead?: number };
}

// ── Tool-use nativo (Eco conversacional · §7A) ──────────────────────────────
// El chat de Eco NO es un one-shot: el modelo pide herramientas (datos/RAG), el
// engine las ejecuta y le devuelve el resultado, y así hasta la respuesta final
// (loop tool-use). Estos tipos normalizan ese ida y vuelta para cualquier proveedor.

/** Bloque de contenido de un mensaje (forma Anthropic, reusable por otros adaptadores). */
export type BloqueContenido =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

/** Un turno de la conversación (usuario o asistente) con sus bloques. */
export interface MensajeChat {
  role: 'user' | 'assistant';
  content: BloqueContenido[];
}

/** Definición de una herramienta ofrecida al modelo (JSON Schema del input). */
export interface HerramientaLLM {
  nombre: string;
  descripcion: string;
  /** JSON Schema del input (Anthropic `input_schema`). */
  schema: Record<string, unknown>;
}

/** Petición de UNA vuelta del loop de chat con tools. */
export interface SolicitudChatLLM {
  /** System prompt del chat (rol analista + reglas de tool-use). Prefijo CACHEABLE. */
  system: string;
  /** Definiciones de tools ofrecidas (prefijo CACHEABLE junto con el system). */
  tools: HerramientaLLM[];
  /** Turnos de la conversación (incluye tool_use/tool_result de vueltas previas). NO se cachean. */
  mensajes: MensajeChat[];
  modelo: string;
  temperatura: number;
  maxTokens: number;
}

/** Respuesta de UNA vuelta del loop. */
export interface RespuestaChatLLM {
  /** `tool_use` = el modelo pide herramientas; `end` (u otro) = respuesta final. */
  stop: 'tool_use' | 'end' | string;
  /** Texto final concatenado (relevante cuando `stop` != 'tool_use'). */
  texto: string;
  /** Herramientas que el modelo pide ejecutar en esta vuelta. */
  toolUses: Array<{ id: string; nombre: string; input: unknown }>;
  /** Contenido CRUDO del turno del asistente, para re-anexarlo tal cual al historial. */
  contenido: BloqueContenido[];
  proveedor: string;
  modelo: string;
  tokens?: { entrada: number; salida: number; cacheWrite?: number; cacheRead?: number };
}

/**
 * Adaptador de un proveedor de LLM. Implementaciones: `MockProvider` (default en
 * dev/tests, sin costo ni red) y `AnthropicProvider` (Claude, real). El factory
 * elige cuál según config/env — enchufar el real = cambiar un valor, no el código.
 */
export interface LLMProvider {
  /** Identificador estable del proveedor (`mock`, `anthropic`, …). */
  readonly nombre: string;
  generar(solicitud: SolicitudLLM): Promise<RespuestaLLM>;
  /**
   * Una vuelta del loop de chat con tool-use nativo (§7A · Eco conversacional).
   * Opcional: un proveedor que no lo implemente no puede servir el chat (el engine
   * lo detecta y responde claro). El MOCK lo implementa sin tools (respuesta demo).
   */
  generarChat?(solicitud: SolicitudChatLLM): Promise<RespuestaChatLLM>;
}

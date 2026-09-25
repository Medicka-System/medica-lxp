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

/**
 * Adaptador de un proveedor de LLM. Implementaciones: `MockProvider` (default en
 * dev/tests, sin costo ni red) y `AnthropicProvider` (Claude, real). El factory
 * elige cuál según config/env — enchufar el real = cambiar un valor, no el código.
 */
export interface LLMProvider {
  /** Identificador estable del proveedor (`mock`, `anthropic`, …). */
  readonly nombre: string;
  generar(solicitud: SolicitudLLM): Promise<RespuestaLLM>;
}

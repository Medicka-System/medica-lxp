/**
 * Adaptador de un proveedor de TTS (texto→voz) — course builder. MISMA idea
 * model-agnostic que los proveedores de Eco (§7A): el servicio nunca sabe qué
 * proveedor sintetiza; llama `sintetizar()` y recibe audio normalizado. Hoy
 * `mock` y `openai`; mañana `elevenlabs` se agrega SIN tocar el resto (factory).
 */

/** Petición normalizada de síntesis (misma forma para todo proveedor). */
export interface SolicitudTTS {
  texto: string;
  modelo: string;
  voz: string;
  velocidad: number; // 0.25..4.0
  formato: string; // 'mp3' | 'wav' | 'opus'
}

/** Respuesta normalizada: el binario del audio + su tipo. */
export interface RespuestaTTS {
  audio: Buffer;
  mime: string;
  proveedor: string;
  formato: string;
}

/** Contrato del adaptador. Implementaciones: MockTtsProvider, OpenAiTtsProvider. */
export interface TTSProvider {
  readonly nombre: string; // 'mock', 'openai', …
  sintetizar(solicitud: SolicitudTTS): Promise<RespuestaTTS>;
}

/** MIME por formato de audio (para subir con el content-type correcto). */
export function mimeDeFormato(formato: string): string {
  switch (formato) {
    case 'wav':
      return 'audio/wav';
    case 'opus':
      return 'audio/ogg';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}

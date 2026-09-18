import { z } from 'zod';

/**
 * Config editable de TTS (§3): proveedor/voz NO hardcodeados, viven en
 * `lxp.tts_config` y se leen en runtime (patrón `eco_config` · §7A). Cambiar de
 * OpenAI a ElevenLabs o de voz es editar una fila, no el código.
 */
export const FORMATOS_TTS = ['mp3', 'wav', 'opus'] as const;

export const ttsConfigSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  activo: z.boolean(),
  proveedor: z.string().min(1),
  modelo: z.string().min(1),
  voz: z.string().min(1),
  velocidad: z.number().min(0.25).max(4),
  formato: z.enum(FORMATOS_TTS),
});

export type TtsConfig = z.infer<typeof ttsConfigSchema>;

import { z } from 'zod';
import { FORMATOS_TTS } from './config/tts-config.tipos';

/**
 * Solicitud de síntesis (course builder). El texto es obligatorio; proveedor/voz/
 * modelo salen de `lxp.tts_config` salvo que se sobreescriban aquí puntualmente.
 */
export const solicitarTtsSchema = z.object({
  texto: z.string().min(1).max(20_000),
  contenidoId: z.string().uuid().optional(),
  // Overrides opcionales sobre la config activa (voz/modelo/velocidad/formato).
  voz: z.string().min(1).optional(),
  modelo: z.string().min(1).optional(),
  velocidad: z.number().min(0.25).max(4).optional(),
  formato: z.enum(FORMATOS_TTS).optional(),
  creadoPor: z.string().uuid().optional(),
});

export type SolicitarTts = z.infer<typeof solicitarTtsSchema>;

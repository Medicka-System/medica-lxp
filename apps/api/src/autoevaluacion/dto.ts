import { z } from 'zod';

/**
 * Contrato (zod) del calificador de autoevaluación. El alumno responde en `web`; la
 * server action lo reenvía aquí con su `alumnoId` (identidad ya autenticada en `web`,
 * mismo patrón que /competencia y /notificaciones · guard JWT del `api` pendiente).
 * `respuestas` es un mapa reactivoId → clave | claves | texto libre (abierta) | null.
 */
export const calificarAutoevalSchema = z.object({
  leccionId: z.string().uuid(),
  alumnoId: z.string().uuid(),
  respuestas: z.record(
    z.union([z.string(), z.array(z.string()), z.null()]),
  ),
});

export type CalificarAutoeval = z.infer<typeof calificarAutoevalSchema>;

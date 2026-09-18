import { z } from 'zod';

/**
 * Metadatos que acompañan la subida del .zip (los campos llegan como texto en el
 * multipart, por eso `orden` se coacciona a número).
 */
export const ingestarPaqueteSchema = z.object({
  leccionId: z.string().uuid(),
  titulo: z.string().min(1).max(300).optional(),
  orden: z.coerce.number().int().min(0).optional(),
});

export type IngestarPaquete = z.infer<typeof ingestarPaqueteSchema>;

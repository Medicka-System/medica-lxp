import { z } from 'zod';

/**
 * Metadatos que acompañan la subida del .zip (los campos llegan como texto en el
 * multipart, por eso `orden` se coacciona a número).
 */
export const ingestarPaqueteSchema = z.object({
  // Opcional: si viene, el paquete se registra en la lección (course builder, modelo
  // nuevo + compat). Si NO viene (modo Biblioteca · §5C), solo se valida + guarda el
  // .zip en object storage y se devuelve la ref para que el web cree el lxp.recursos.
  leccionId: z.string().uuid().optional(),
  titulo: z.string().min(1).max(300).optional(),
  orden: z.coerce.number().int().min(0).optional(),
});

export type IngestarPaquete = z.infer<typeof ingestarPaqueteSchema>;

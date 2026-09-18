import { z } from 'zod';

/** Metadatos del import de reactivos (el archivo llega como multipart `archivo`). */
export const importarReactivosSchema = z.object({
  actividadId: z.string().uuid(),
});

export type ImportarReactivos = z.infer<typeof importarReactivosSchema>;

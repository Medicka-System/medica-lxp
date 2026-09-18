import { z } from 'zod';

/**
 * Guardado de contenido H5P que produce el editor del web. `params`/`metadata` son
 * la forma que emite el cliente H5P; se validan de forma laxa (el H5P server valida
 * a fondo contra la librería). `leccionId` opcional enlaza el contenido a una lección.
 */
export const guardarH5pSchema = z.object({
  contentId: z.string().optional(),
  library: z.string().min(1), // ubername, p.ej. "H5P.InteractiveVideo 1.27"
  params: z.any(),
  metadata: z.record(z.unknown()).default({}),
  leccionId: z.string().uuid().optional(),
  titulo: z.string().min(1).max(300).optional(),
  orden: z.coerce.number().int().min(0).optional(),
});

export type GuardarH5p = z.infer<typeof guardarH5pSchema>;

import { z } from 'zod';

const criterioSchema = z.object({
  criterio: z.string().min(1),
  descripcion: z.string().optional(),
  peso: z.number().min(0).max(100),
});

export const crearRubricaSchema = z.object({
  nombre: z.string().min(1).max(200),
  tipo: z.enum(['estudios_reportes', 'tareas']),
  descripcion: z.string().max(2000).optional(),
  criterios: z.array(criterioSchema).min(1),
  publicado: z.boolean().optional(),
  creadoPor: z.string().uuid().optional(),
});

export const actualizarRubricaSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  tipo: z.enum(['estudios_reportes', 'tareas']).optional(),
  descripcion: z.string().max(2000).optional(),
  criterios: z.array(criterioSchema).min(1).optional(),
  publicado: z.boolean().optional(),
});

export const asignarRubricaSchema = z.object({
  actividadId: z.string().uuid(),
  rubricaId: z.string().uuid().nullable(),
});

export type CrearRubrica = z.infer<typeof crearRubricaSchema>;
export type ActualizarRubrica = z.infer<typeof actualizarRubricaSchema>;
export type AsignarRubrica = z.infer<typeof asignarRubricaSchema>;

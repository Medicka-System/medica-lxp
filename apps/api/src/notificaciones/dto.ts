import { z } from 'zod';
import { TIPOS_NOTIFICACION } from '@campus/shared';

/**
 * DTO del evento de notificación (borde · §5): validado con zod, con el enum de tipos
 * derivado del contrato de `@campus/shared` (no se reescribe la forma dos veces). Sin
 * PII de paciente (§10).
 */
export const notificacionJobSchema = z.object({
  userId: z.string().uuid(),
  tipo: z.enum(TIPOS_NOTIFICACION as unknown as [string, ...string[]]),
  titulo: z.string().max(200).optional(),
  cuerpo: z.string().max(2000).optional(),
  entidadTipo: z.string().max(60).optional(),
  entidadId: z.string().uuid().optional(),
  datos: z.record(z.unknown()).optional(),
});

/** Fan-out de un anuncio a varios destinatarios (lo llama el Studio de admin/docente). */
export const anuncioNotifSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  titulo: z.string().min(1).max(200),
  cuerpo: z.string().min(1).max(2000),
  entidadId: z.string().uuid().optional(),
});

export type AnuncioNotifDto = z.infer<typeof anuncioNotifSchema>;

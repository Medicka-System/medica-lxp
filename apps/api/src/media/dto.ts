/**
 * Contratos (zod) del servicio de media (§5 · borde validado). Locales al `api`:
 * son la forma de las peticiones de firmado/registro de videoteca. El listado de la
 * videoteca es CRUD simple → va `web → Supabase` directo (Regla de Oro §2), no aquí.
 */
import { z } from 'zod';

/** Solicitud de subida de un video: se firma un PUT y se pre-registra la fila. */
export const solicitarVideoSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  grupoId: z.string().uuid().optional(),
  leccionId: z.string().uuid().optional(),
  contenidoId: z.string().uuid().optional(),
  creadoPor: z.string().uuid().optional(),
});
export type SolicitarVideo = z.infer<typeof solicitarVideoSchema>;

/** Confirmación de que el binario ya está en storage: marca la fila `listo`. */
export const confirmarVideoSchema = z.object({
  duracionSeg: z.number().int().nonnegative().optional(),
});
export type ConfirmarVideo = z.infer<typeof confirmarVideoSchema>;

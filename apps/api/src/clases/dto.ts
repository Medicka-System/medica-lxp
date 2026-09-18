/**
 * Contratos (zod) de clases en vivo (§9 · Sprint 6). Locales al `api`: crear/agendar
 * una clase es dominio (habla con Zoom + registra la reunión), no CRUD simple. El
 * listado de clases va web→Supabase (§2).
 */
import { z } from 'zod';

/** Crear/agendar una clase en vivo (Zoom o MiCo+). */
export const crearClaseSchema = z.object({
  grupoId: z.string().uuid(),
  leccionId: z.string().uuid().optional(),
  docenteId: z.string().uuid().optional(),
  plataforma: z.enum(['zoom', 'mico_plus']).default('zoom'),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  inicioProgramado: z.string().datetime({ offset: true }).optional(),
  duracionMin: z.number().int().positive().optional(),
  /** Enlace externo cuando la plataforma es MiCo+ (solo se enlaza/agenda · §9). */
  enlaceExterno: z.string().url().optional(),
});
export type CrearClase = z.infer<typeof crearClaseSchema>;

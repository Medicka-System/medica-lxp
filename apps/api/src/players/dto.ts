/**
 * Contratos (zod) de los players (§7 · Sprint 6). El progreso de reproducción se
 * registra en el `api` porque además REPORTA al LRS (xAPI) — eso no puede vivir en el
 * cliente ni en una policy (§2/§7). El `alumnoId` provendrá del JWT (guard · Sprint 9);
 * por ahora viaja en el cuerpo para el flujo local.
 */
import { z } from 'zod';

/** Progreso genérico de un contenido reproducible (video / H5P / xAPI). */
export const progresoSchema = z.object({
  alumnoId: z.string().uuid(),
  contenidoId: z.string().uuid(),
  posicionSeg: z.number().int().nonnegative().default(0),
  duracionSeg: z.number().int().positive().optional(),
  completado: z.boolean().default(false),
  /** Nombre para el statement xAPI (opcional). */
  titulo: z.string().optional(),
});
export type Progreso = z.infer<typeof progresoSchema>;

/** Commit del runtime SCORM: el CMI aplanado que el player captura. */
export const scormCommitSchema = z.object({
  alumnoId: z.string().uuid(),
  contenidoId: z.string().uuid(),
  cmi: z.record(z.unknown()),
  titulo: z.string().optional(),
});
export type ScormCommit = z.infer<typeof scormCommitSchema>;

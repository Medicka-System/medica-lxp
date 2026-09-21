/**
 * Contratos (zod) de los players (§7 · Sprint 6). El progreso de reproducción se
 * registra en el `api` porque además REPORTA al LRS (xAPI) — eso no puede vivir en el
 * cliente ni en una policy (§2/§7). El `alumnoId` provendrá del JWT (guard · Sprint 9);
 * por ahora viaja en el cuerpo para el flujo local.
 */
import { z } from 'zod';

/**
 * Progreso genérico de un contenido reproducible (video / H5P / xAPI). `contenidoId`
 * es el ancla del modelo VIEJO (una fila de `lxp.contenidos`, aún vivo); `leccionId`
 * es el ancla del modelo NUEVO (la lección reproducible directamente · mig 0023/0026).
 * El player del modelo nuevo manda `leccionId`; el viejo, `contenidoId`.
 */
export const progresoSchema = z.object({
  alumnoId: z.string().uuid(),
  contenidoId: z.string().uuid(),
  /** Ancla por lección (modelo nuevo · mig 0026); se persiste junto al contenidoId. */
  leccionId: z.string().uuid().optional(),
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
  /** Ancla por lección (modelo nuevo · mig 0026). */
  leccionId: z.string().uuid().optional(),
  cmi: z.record(z.unknown()),
  titulo: z.string().optional(),
});
export type ScormCommit = z.infer<typeof scormCommitSchema>;

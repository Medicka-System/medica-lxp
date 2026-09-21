/**
 * Repositorio de progreso de reproducción (§6 · esquema `lxp`). Upsert por
 * (alumno, contenido). Funciones puras sobre `sql` (postgres.js).
 */
import type { Sql } from '@campus/db';

export interface UpsertProgresoDatos {
  alumnoId: string;
  contenidoId: string;
  /** Ancla por lección (modelo nuevo · mig 0026); se persiste sin borrar contenidoId. */
  leccionId?: string;
  posicionSeg: number;
  duracionSeg?: number;
  porcentaje: number;
  completado: boolean;
  estadoScorm?: unknown;
}

export interface ProgresoFila {
  alumno_id: string;
  contenido_id: string;
  porcentaje: string;
  completado: boolean;
}

/** Inserta o actualiza el progreso del alumno en un contenido. */
export async function upsertProgreso(
  sql: Sql,
  d: UpsertProgresoDatos,
): Promise<ProgresoFila> {
  const rows = await sql<ProgresoFila[]>`
    insert into lxp.reproduccion_progreso
      (alumno_id, contenido_id, leccion_id, posicion_seg, duracion_seg, porcentaje, completado,
       estado_scorm, actualizado_en)
    values (
      ${d.alumnoId}, ${d.contenidoId}, ${d.leccionId ?? null},
      ${d.posicionSeg}, ${d.duracionSeg ?? null},
      ${d.porcentaje}, ${d.completado},
      ${d.estadoScorm ? sql.json(d.estadoScorm as Parameters<typeof sql.json>[0]) : null}, now()
    )
    on conflict (alumno_id, contenido_id) do update set
      leccion_id   = coalesce(excluded.leccion_id, lxp.reproduccion_progreso.leccion_id),
      posicion_seg = excluded.posicion_seg,
      duracion_seg = coalesce(excluded.duracion_seg, lxp.reproduccion_progreso.duracion_seg),
      porcentaje   = greatest(excluded.porcentaje, lxp.reproduccion_progreso.porcentaje),
      completado   = lxp.reproduccion_progreso.completado or excluded.completado,
      estado_scorm = coalesce(excluded.estado_scorm, lxp.reproduccion_progreso.estado_scorm),
      actualizado_en = now()
    returning alumno_id, contenido_id, porcentaje::text as porcentaje, completado`;
  return rows[0] as ProgresoFila;
}

'use server';

import { getSesionStaff } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';

/**
 * Resultados AGREGADOS de una encuesta para el staff (§5C · B4). Lectura directa bajo RLS
 * (`comoStaff` → policy `encuesta_respuestas_select` con `es_staff()`). Devuelve SOLO los
 * mapas de respuesta (pregunta→valor), sin identidad del alumno: la vista los tabula
 * contra sus propias preguntas (no se expone quién respondió qué). Sin calificación.
 */
export type ResultadosEncuesta = {
  total: number;
  /** Mapas { preguntaId: valor } de cada respuesta (anónimos para el agregado). */
  mapas: Record<string, unknown>[];
};

export async function resultadosEncuesta(
  leccionId: string,
  bloqueId?: string | null,
): Promise<ResultadosEncuesta> {
  const staff = await getSesionStaff();
  return comoStaff(staff.userId, async (sql) => {
    const filas = await sql<{ respuestas: Record<string, unknown> }[]>`
      select respuestas from lxp.encuesta_respuestas
      where leccion_id = ${leccionId}
        and bloque_id is not distinct from ${bloqueId ?? null}`;
    return { total: filas.length, mapas: filas.map((f) => f.respuestas ?? {}) };
  });
}

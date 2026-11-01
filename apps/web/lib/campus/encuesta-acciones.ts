'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { marcarLeccionCompletada } from './leccion-acciones';

/**
 * Respuestas de ENCUESTA del alumno (§5C · B3). CRUD directo web→Supabase bajo RLS
 * (Regla de Oro §2): la policy `encuesta_respuestas_insert/update` exige
 * `id_alumno = auth.uid()`. NO hay calificación — solo se recoge. Una fila por alumno ×
 * encuesta (lección o bloque); re-enviar REEMPLAZA (upsert). Responder una encuesta de
 * LECCIÓN marca el paso como completado (no bloquea el avance; responder = completar).
 */
export type ResultadoEncuesta = { ok: true } | { ok: false; error: string };

export async function responderEncuesta(datos: {
  leccionId: string;
  bloqueId?: string | null;
  respuestas: Record<string, unknown>;
  tituloLeccion?: string;
}): Promise<ResultadoEncuesta> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  if (!datos.leccionId) return { ok: false, error: 'Falta la lección de la encuesta.' };
  const bloqueId = datos.bloqueId ?? null;
  const respuestas = datos.respuestas ?? {};

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.encuesta_respuestas (id_alumno, leccion_id, bloque_id, respuestas)
        values (${alumno.userId}, ${datos.leccionId}, ${bloqueId}, ${sql.json(respuestas as never)})
        on conflict (id_alumno, leccion_id, coalesce(bloque_id, '00000000-0000-0000-0000-000000000000'::uuid))
        do update set respuestas = excluded.respuestas, updated_at = now()`;
    });
  } catch (e) {
    console.error('[responderEncuesta] fallo:', e);
    return { ok: false, error: 'No se pudo guardar tu respuesta. Inténtalo de nuevo.' };
  }

  // Encuesta de LECCIÓN (sin bloque): responder = completar el paso (best-effort).
  if (!bloqueId) {
    try {
      await marcarLeccionCompletada(datos.leccionId, datos.tituloLeccion ?? '');
    } catch {
      /* el progreso es best-effort; la respuesta ya quedó guardada */
    }
  }
  revalidatePath(`/leccion/${datos.leccionId}`);
  return { ok: true };
}

/** Respuesta previa del alumno a esta encuesta (para prellenar y mostrar "ya respondiste"). */
export async function getMiRespuestaEncuesta(
  leccionId: string,
  bloqueId?: string | null,
): Promise<Record<string, unknown> | null> {
  const alumno = await getSesionAlumno();
  if (!leccionId) return null;
  return comoAlumno(alumno.userId, async (sql) => {
    const rows = await sql<{ respuestas: Record<string, unknown> }[]>`
      select respuestas from lxp.encuesta_respuestas
      where id_alumno = ${alumno.userId} and leccion_id = ${leccionId}
        and bloque_id is not distinct from ${bloqueId ?? null}
      limit 1`;
    return rows[0]?.respuestas ?? null;
  });
}

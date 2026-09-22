'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { emitirEventoLeccion } from './xapi-leccion';
import type { ResultadoAccion } from './resultado';

/**
 * Server action de la lección. CRUD simple `web → Supabase` bajo RLS (Regla de Oro
 * §2 — NO pasa por NestJS): corre con `comoAlumno`, así que la policy
 * reproduccion_progreso_insert/update (alumno = auth.uid() + acceso_activo) es el
 * segundo candado. La emisión xAPI `completó` al LRS es dominio y NO vive aquí
 * (cola `envio-xapi` · §7/§8 · ver leccion-contrato · PENDIENTE).
 */

/**
 * Marca una lección como COMPLETADA para el alumno y persiste el avance (upsert en
 * reproduccion_progreso). Re-llaveado por LECCIÓN (mig 0028): escribe una fila anclada
 * a `leccion_id` (contenido_id NULL) que funciona con TODOS los tipos del modelo nuevo
 * (teoría/video/foro/…), y —si la lección es del modelo viejo— también marca sus
 * contenidos para el indicador "Visto" por bloque. Emite xAPI `completó` al LRS (§7).
 */
export async function marcarLeccionCompletada(
  leccionId: string,
  tituloLeccion = '',
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      // Fila ANCLADA A LA LECCIÓN (modelo nuevo · cualquier tipo).
      await sql`
        insert into lxp.reproduccion_progreso (alumno_id, leccion_id, porcentaje, completado)
        values (${alumno.userId}, ${leccionId}, 100, true)
        on conflict (alumno_id, leccion_id) where contenido_id is null and leccion_id is not null
        do update set porcentaje = 100, completado = true, actualizado_en = now()`;
      // Modelo VIEJO: marca también los contenidos (indicador "Visto" por bloque). No-op
      // si la lección no tiene filas en lxp.contenidos (los tipos nuevos).
      await sql`
        insert into lxp.reproduccion_progreso (alumno_id, contenido_id, leccion_id, porcentaje, completado)
        select ${alumno.userId}, co.id, co.leccion_id, 100, true
        from lxp.contenidos co
        where co.leccion_id = ${leccionId}
        on conflict (alumno_id, contenido_id)
        do update set porcentaje = 100, completado = true, actualizado_en = now()`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar tu avance. Inténtalo de nuevo.' };
  }
  // xAPI `completó` al LRS (best-effort · §7). No bloquea si el api/LRS no responde.
  await emitirEventoLeccion(alumno.userId, alumno.nombre, leccionId, tituloLeccion, 'completo');
  revalidatePath('/cursos');
  revalidatePath(`/leccion/${leccionId}`);
  return { ok: true };
}

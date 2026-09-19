'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';

/**
 * Server action de la lección. CRUD simple `web → Supabase` bajo RLS (Regla de Oro
 * §2 — NO pasa por NestJS): corre con `comoAlumno`, así que la policy
 * reproduccion_progreso_insert/update (alumno = auth.uid() + acceso_activo) es el
 * segundo candado. La emisión xAPI `completó` al LRS es dominio y NO vive aquí
 * (cola `envio-xapi` · §7/§8 · ver leccion-contrato · PENDIENTE).
 */

/**
 * Marca TODOS los contenidos de una lección como completados para el alumno
 * (upsert en reproduccion_progreso). Mueve el avance real de Mis cursos.
 */
export async function marcarLeccionCompletada(
  leccionId: string,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.reproduccion_progreso (alumno_id, contenido_id, porcentaje, completado)
        select ${alumno.userId}, co.id, 100, true
        from lxp.contenidos co
        where co.leccion_id = ${leccionId}
        on conflict (alumno_id, contenido_id)
        do update set porcentaje = 100, completado = true, actualizado_en = now()`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar tu avance. Inténtalo de nuevo.' };
  }
  // PENDIENTE DE API: encolar xAPI `completó` por contenido en `envio-xapi` (§7).
  revalidatePath('/cursos');
  revalidatePath(`/leccion/${leccionId}`);
  return { ok: true };
}

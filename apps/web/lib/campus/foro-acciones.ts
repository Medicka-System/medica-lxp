'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions del FORO del alumno (§1). CRUD simple `web → Supabase` bajo RLS
 * (Regla de Oro §2): corren con `comoAlumno`, así que la policy `foro_insert`
 * (autor_id = auth.uid() + acceso_activo) es el segundo candado. El cuerpo es el
 * HTML del EditorRico.
 */

async function publicar(
  actividadId: string,
  grupoId: string,
  cuerpo: string,
  parentId: string | null,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const texto = cuerpo.trim();
  if (!texto) return { ok: false, error: 'Escribe tu mensaje antes de publicar.' };
  if (!grupoId) return { ok: false, error: 'Este foro aún no tiene un grupo asignado.' };

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.foro_mensajes (actividad_id, grupo_id, autor_id, parent_id, cuerpo)
        values (${actividadId}, ${grupoId}, ${alumno.userId}, ${parentId}, ${texto})`;
    });
  } catch {
    return { ok: false, error: 'No se pudo publicar. Inténtalo de nuevo.' };
  }
  revalidatePath(`/foro/${actividadId}`);
  return { ok: true };
}

/** Crea un post raíz en el foro de la lección. */
export async function crearPostForo(
  actividadId: string,
  grupoId: string,
  cuerpo: string,
): Promise<ResultadoAccion> {
  return publicar(actividadId, grupoId, cuerpo, null);
}

/** Responde a un mensaje del foro. */
export async function responderForo(
  actividadId: string,
  grupoId: string,
  parentId: string,
  cuerpo: string,
): Promise<ResultadoAccion> {
  return publicar(actividadId, grupoId, cuerpo, parentId);
}

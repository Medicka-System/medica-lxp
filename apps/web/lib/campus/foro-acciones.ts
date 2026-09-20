'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { comoConfigForo, estadoVentanaForo } from '@/lib/studio/foro-config';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions del FORO del alumno (§1). CRUD simple `web → Supabase` bajo RLS
 * (Regla de Oro §2): corren con `comoAlumno`, así que la policy `foro_insert`
 * (autor_id = auth.uid() + acceso_activo) es el segundo candado. El cuerpo es el
 * HTML del EditorRico.
 *
 * La VENTANA de apertura/cierre que fija el diseñador (§5C · `lecciones.config`) se
 * refuerza aquí como segundo candado: fuera de fechas no se publica, aunque la UI ya
 * oculte el compositor.
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
    const error = await comoAlumno(alumno.userId, async (sql) => {
      // Refuerza la ventana del diseñador (config de la lección del foro).
      const fila = (
        await sql<{ config: Record<string, unknown> | null }[]>`
          select l.config
          from lxp.actividades a
          join lxp.lecciones l on l.id = a.leccion_id
          where a.id = ${actividadId} and a.tipo = 'foro'
          limit 1`
      )[0];
      const ventana = estadoVentanaForo(comoConfigForo(fila?.config), new Date());
      if (!ventana.abierto) {
        return ventana.estado === 'programado'
          ? 'Este foro aún no abre.'
          : 'Este foro ya cerró.';
      }
      await sql`
        insert into lxp.foro_mensajes (actividad_id, grupo_id, autor_id, parent_id, cuerpo)
        values (${actividadId}, ${grupoId}, ${alumno.userId}, ${parentId}, ${texto})`;
      return null;
    });
    if (error) return { ok: false, error };
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

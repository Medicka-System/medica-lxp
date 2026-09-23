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

/** Deriva un título corto del cuerpo (HTML) cuando el flujo no envía uno explícito. */
function tituloDesde(html: string): string {
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!txt) return 'Caso del foro';
  return txt.length <= 70 ? txt : `${txt.slice(0, 70).trim()}…`;
}

async function publicar(
  actividadId: string,
  grupoId: string,
  cuerpo: string,
  parentId: string | null,
  titulo: string | null,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const texto = cuerpo.trim();
  if (!texto) return { ok: false, error: 'Escribe tu mensaje antes de publicar.' };
  if (!grupoId) return { ok: false, error: 'Este foro aún no tiene un grupo asignado.' };
  // Un post raíz lleva título; si no se envía (flujo viejo), se deriva del cuerpo.
  const tituloLimpio =
    titulo?.trim() || (parentId === null ? tituloDesde(texto) : null);

  let leccionId: string | null = null;
  try {
    const error = await comoAlumno(alumno.userId, async (sql) => {
      // Refuerza la ventana del diseñador (config de la lección del foro).
      const fila = (
        await sql<{ id: string; config: Record<string, unknown> | null }[]>`
          select l.id, l.config
          from lxp.actividades a
          join lxp.lecciones l on l.id = a.leccion_id
          where a.id = ${actividadId} and a.tipo = 'foro'
          limit 1`
      )[0];
      leccionId = fila?.id ?? null;
      const ventana = estadoVentanaForo(comoConfigForo(fila?.config), new Date());
      if (!ventana.abierto) {
        return ventana.estado === 'programado'
          ? 'Este foro aún no abre.'
          : 'Este foro ya cerró.';
      }
      // Un post RAÍZ por alumno (cada quien publica una vez): si ya tiene uno, no crea otro.
      if (parentId === null) {
        const ya = (
          await sql<{ ok: boolean }[]>`
            select exists (
              select 1 from lxp.foro_mensajes
              where actividad_id = ${actividadId} and grupo_id = ${grupoId}
                and autor_id = ${alumno.userId} and parent_id is null
            ) as ok`
        )[0]?.ok;
        if (ya) return 'Ya publicaste tu caso en este foro. De aquí en adelante participa respondiendo.';
      }
      // Ancla el mensaje a la lección (mig 0026): participar CUENTA como completar el
      // foro (la palomita del menú del curso lee foro_mensajes.leccion_id · §6).
      await sql`
        insert into lxp.foro_mensajes (actividad_id, grupo_id, autor_id, parent_id, cuerpo, leccion_id, titulo)
        values (${actividadId}, ${grupoId}, ${alumno.userId}, ${parentId}, ${texto}, ${leccionId}, ${tituloLimpio})`;
      return null;
    });
    if (error) return { ok: false, error };
  } catch {
    return { ok: false, error: 'No se pudo publicar. Inténtalo de nuevo.' };
  }
  revalidatePath(`/foro/${actividadId}`);
  if (leccionId) revalidatePath(`/leccion/${leccionId}`);
  revalidatePath('/cursos');
  return { ok: true };
}

/** Crea el post raíz (una vez por alumno) del foro de la lección. */
export async function crearPostForo(
  actividadId: string,
  grupoId: string,
  titulo: string,
  cuerpo: string,
): Promise<ResultadoAccion> {
  return publicar(actividadId, grupoId, cuerpo, null, titulo);
}

/** Responde a un mensaje del foro (comentario del hilo). */
export async function responderForo(
  actividadId: string,
  grupoId: string,
  parentId: string,
  cuerpo: string,
): Promise<ResultadoAccion> {
  return publicar(actividadId, grupoId, cuerpo, parentId, null);
}

/** Edita un mensaje PROPIO (post o comentario). Marca `editado_en` (policy foro_update). */
export async function editarMensajeForo(
  actividadId: string,
  mensajeId: string,
  cuerpo: string,
  titulo: string | null,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const texto = cuerpo.trim();
  if (!texto) return { ok: false, error: 'El mensaje no puede quedar vacío.' };
  let leccionId: string | null = null;
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      const filas = await sql<{ leccion_id: string | null }[]>`
        update lxp.foro_mensajes
        set cuerpo = ${texto},
            titulo = case when parent_id is null then ${titulo?.trim() || null} else titulo end,
            editado_en = now()
        where id = ${mensajeId} and autor_id = ${alumno.userId}
        returning leccion_id`;
      leccionId = filas[0]?.leccion_id ?? null;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar el cambio. Inténtalo de nuevo.' };
  }
  revalidatePath(`/foro/${actividadId}`);
  if (leccionId) revalidatePath(`/leccion/${leccionId}`);
  return { ok: true };
}

/** Alterna la reacción "me es útil" del alumno sobre un mensaje. */
export async function reaccionarForo(
  actividadId: string,
  mensajeId: string,
): Promise<ResultadoAccion & { activo?: boolean }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  let leccionId: string | null = null;
  let activo = false;
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      const existe = (
        await sql<{ ok: boolean }[]>`
          select exists (
            select 1 from lxp.foro_reacciones
            where mensaje_id = ${mensajeId} and autor_id = ${alumno.userId}
          ) as ok`
      )[0]?.ok;
      if (existe) {
        await sql`delete from lxp.foro_reacciones where mensaje_id = ${mensajeId} and autor_id = ${alumno.userId}`;
        activo = false;
      } else {
        await sql`insert into lxp.foro_reacciones (mensaje_id, autor_id) values (${mensajeId}, ${alumno.userId})`;
        activo = true;
      }
      const r = await sql<{ leccion_id: string | null }[]>`
        select leccion_id from lxp.foro_mensajes where id = ${mensajeId} limit 1`;
      leccionId = r[0]?.leccion_id ?? null;
    });
  } catch {
    return { ok: false, error: 'No se pudo registrar tu reacción.' };
  }
  revalidatePath(`/foro/${actividadId}`);
  if (leccionId) revalidatePath(`/leccion/${leccionId}`);
  return { ok: true, activo };
}

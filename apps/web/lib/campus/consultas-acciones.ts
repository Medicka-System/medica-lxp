'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { encolarNotificacion } from './notificaciones-cliente';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions de CONSULTAS 1:1 del alumno (§5B · lado alumno). CRUD directo
 * `web → Supabase` bajo RLS (Regla de Oro §2): `consultas_insert` exige
 * `id_alumno = auth.uid() and acceso_activo`, `consulta_mensajes_insert` exige autor =
 * uid sobre una consulta propia. La notificación al docente es un side-effect de fondo
 * (best-effort vía el motor §8), no bloquea el CRUD.
 */

/** Abre una consulta nueva con su primer mensaje. */
export async function crearConsulta(input: {
  asunto: string;
  cuerpo: string;
}): Promise<ResultadoAccion & { consultaId?: string }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const asunto = input.asunto.trim();
  const cuerpo = input.cuerpo.trim();
  if (!asunto) return { ok: false, error: 'Escribe un asunto para tu consulta.' };
  if (!cuerpo) return { ok: false, error: 'Escribe tu mensaje.' };

  let consultaId: string;
  try {
    consultaId = await comoAlumno(alumno.userId, async (sql) => {
      const rows = await sql<{ id: string }[]>`
        insert into lxp.consultas (id_alumno, asunto)
        values (${alumno.userId}, ${asunto})
        returning id`;
      const id = rows[0]!.id;
      await sql`
        insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo)
        values (${id}, ${alumno.userId}, ${cuerpo})`;
      return id;
    });
  } catch {
    return { ok: false, error: 'No se pudo abrir la consulta. Inténtalo de nuevo.' };
  }
  // El docente aún no está asignado (lo "toma" al responder · Sprint 5.5), así que la
  // consulta se ve en su bandeja por RLS; el aviso dirigido llega cuando hay destinatario.
  revalidatePath('/herramientas/consultas');
  return { ok: true, consultaId };
}

/** Responde en una consulta propia. Avisa al docente asignado (si lo hay). */
export async function responderConsulta(input: {
  consultaId: string;
  cuerpo: string;
}): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const cuerpo = input.cuerpo.trim();
  if (!cuerpo) return { ok: false, error: 'Escribe tu mensaje.' };

  let docenteId: string | null = null;
  let asunto = '';
  try {
    ({ docenteId, asunto } = await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo)
        values (${input.consultaId}, ${alumno.userId}, ${cuerpo})`;
      // Toca updated_at para reordenar la bandeja.
      const rows = await sql<{ id_docente: string | null; asunto: string }[]>`
        update lxp.consultas set updated_at = now()
        where id = ${input.consultaId}
        returning id_docente, asunto`;
      return { docenteId: rows[0]?.id_docente ?? null, asunto: rows[0]?.asunto ?? '' };
    }));
  } catch {
    return { ok: false, error: 'No se pudo enviar tu mensaje.' };
  }

  if (docenteId) {
    await encolarNotificacion({
      userId: docenteId,
      tipo: 'respuesta_consulta',
      entidadTipo: 'consulta',
      entidadId: input.consultaId,
      datos: { asunto },
    });
  }
  revalidatePath('/herramientas/consultas');
  revalidatePath(`/herramientas/consultas/${input.consultaId}`);
  return { ok: true };
}

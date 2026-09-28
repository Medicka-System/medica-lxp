'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';
import type { Mensaje } from '@/app/(campus)/consultas/_components/tipos';
import { contactosPermitidos, mensajesDeConsulta } from './consultas-chat';
import { encolarNotificacion } from './notificaciones-cliente';

/**
 * CONSULTAS — server actions del alumno (chat 1:1 · §2). CRUD bajo RLS (`comoAlumno`).
 * SIN realtime: los mensajes nuevos llegan por refetch. Ganchos de realtime (mensaje
 * nuevo, escribiendo, presencia) → PENDIENTE DE REALTIME (fase 2), no implementados.
 */

/** Carga el hilo de una consulta y marca leídos los mensajes recibidos (read-receipt). */
export async function getMensajesConsulta(consultaId: string): Promise<Mensaje[]> {
  const alumno = await getSesionAlumno();
  return comoAlumno(alumno.userId, async (sql) => {
    // Read-receipt per-mensaje (mig 0051): al abrir, marca leídos los mensajes RECIBIDOS
    // (autor = el contacto). Los propios no se tocan (su leido_en lo setea el otro lado al
    // abrir). La policy consulta_mensajes_update exige autor <> uid.
    await sql`update lxp.consulta_mensajes set leido_en = now()
      where consulta_id = ${consultaId} and autor_id <> ${alumno.userId} and leido_en is null`;
    return mensajesDeConsulta(sql, alumno.userId, consultaId);
  });
}

/** Marca los mensajes recibidos de una consulta como leídos (sin traer el hilo). */
export async function marcarLeidaConsulta(consultaId: string): Promise<void> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`update lxp.consulta_mensajes set leido_en = now()
        where consulta_id = ${consultaId} and autor_id <> ${alumno.userId} and leido_en is null`;
    });
  } catch {
    /* best-effort */
  }
  revalidatePath('/consultas');
}

/** Inicia (o reutiliza) una conversación con un contacto permitido. Devuelve su id. */
export async function iniciarConsulta(contactoId: string): Promise<ResultadoAccion & { consultaId?: string }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    const consultaId = await comoAlumno(alumno.userId, async (sql) => {
      // Permiso: el contacto debe estar en el set permitido (docente de grupo / staff / colega).
      const permitidos = await contactosPermitidos(sql, alumno.userId);
      const contacto = permitidos.find((c) => c.id === contactoId);
      if (!contacto) throw new Error('no-permitido');

      // ¿Ya existe una conversación con ese contacto? (por contacto_id o id_docente legacy)
      const ex = (await sql<{ id: string }[]>`
        select id from lxp.consultas
        where id_alumno = ${alumno.userId}
          and (contacto_id = ${contactoId} or id_docente = ${contactoId})
        order by created_at desc limit 1`)[0];
      if (ex) return ex.id;

      const asunto = `Consulta con ${contacto.nombre}`;
      const esDocente = contacto.tipo === 'docente';
      const fila = (await sql<{ id: string }[]>`
        insert into lxp.consultas (id_alumno, contacto_id, tipo_contacto, id_docente, asunto, estado)
        values (${alumno.userId}, ${contactoId}, ${contacto.tipo}::lxp.consulta_tipo_contacto,
                ${esDocente ? contactoId : null}, ${asunto}, 'abierta')
        returning id`)[0]!;
      return fila.id;
    });
    revalidatePath('/consultas');
    return { ok: true, consultaId };
  } catch {
    return { ok: false, error: 'No se pudo iniciar la conversación.' };
  }
}

/** Envía un mensaje. Si la consulta estaba cerrada, la reabre. Adjuntos: metadata (subida real PENDIENTE). */
export async function enviarMensajeConsulta(
  consultaId: string,
  texto: string,
  adjuntos: { tipo: string; nombre: string; meta: string }[] = [],
): Promise<ResultadoAccion & { mensajeId?: string }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const t = texto.trim();
  if (!t && adjuntos.length === 0) return { ok: false, error: 'Escribe un mensaje o adjunta un archivo.' };
  try {
    const res = await comoAlumno(alumno.userId, async (sql) => {
      const m = (await sql<{ id: string }[]>`
        insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo, adjuntos)
        values (${consultaId}, ${alumno.userId}, ${t}, ${sql.json(adjuntos)})
        returning id`)[0]!;
      // Reabre si estaba cerrada + toca la consulta (marca leída para mí al enviar).
      const upd = (await sql<{ id_docente: string | null; asunto: string | null }[]>`
        update lxp.consultas
        set updated_at = now(),
            alumno_leido_en = now(),
            estado = case when estado = 'cerrada' then 'abierta' else estado end,
            cerrada_el = case when estado = 'cerrada' then null else cerrada_el end
        where id = ${consultaId} and id_alumno = ${alumno.userId}
        returning id_docente, asunto`)[0];
      return { mensajeId: m.id, docenteId: upd?.id_docente ?? null, asunto: upd?.asunto ?? '' };
    });
    // Aviso al docente asignado (side-effect de fondo · §8), portado del Sistema B:
    // el CRUD ya quedó bajo RLS; encolar es best-effort y no bloquea (notificaciones-cliente).
    if (res.docenteId) {
      await encolarNotificacion({
        userId: res.docenteId,
        tipo: 'respuesta_consulta',
        entidadTipo: 'consulta',
        entidadId: consultaId,
        datos: { asunto: res.asunto },
      });
    }
    revalidatePath('/consultas');
    return { ok: true, mensajeId: res.mensajeId };
  } catch {
    return { ok: false, error: 'No se pudo enviar tu mensaje.' };
  }
}

/** Cierra la consulta (el alumno la marca resuelta). */
export async function cerrarConsulta(consultaId: string): Promise<ResultadoAccion> {
  return cambiar(consultaId, 'cerrada');
}
/** Reabre una consulta cerrada. */
export async function reabrirConsulta(consultaId: string): Promise<ResultadoAccion> {
  return cambiar(consultaId, 'abierta');
}
async function cambiar(consultaId: string, estado: 'abierta' | 'cerrada'): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`update lxp.consultas
        set estado = ${estado},
            cerrada_el = case when ${estado} = 'cerrada' then now() else null end
        where id = ${consultaId} and id_alumno = ${alumno.userId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo actualizar la consulta.' };
  }
  revalidatePath('/consultas');
  return { ok: true };
}

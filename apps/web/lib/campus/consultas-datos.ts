import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';

/**
 * Datos de las CONSULTAS 1:1 del alumno (§5B · lado alumno). El otro lado (docente) ya
 * existe (Sprint 5.5). Lectura directa `web → Supabase` bajo RLS (Regla de Oro §2): la
 * policy `consultas_select` limita a `id_alumno = auth.uid()`.
 */

export interface ConsultaResumen {
  id: string;
  asunto: string;
  estado: 'abierta' | 'cerrada';
  docente: string | null;
  actualizado: string;
  mensajes: number;
  ultimo: string | null;
}

export interface MensajeConsultaAlumno {
  id: string;
  autor: 'alumno' | 'docente';
  autorNombre: string;
  cuerpo: string;
  creadoEn: string;
}

export interface ConsultaDetalleAlumno {
  id: string;
  asunto: string;
  estado: 'abierta' | 'cerrada';
  docente: string | null;
  mensajes: MensajeConsultaAlumno[];
}

/** Lista de consultas del alumno (abiertas primero, recientes primero). */
export async function getConsultasAlumno(
  userId: string,
): Promise<ConsultaResumen[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        asunto: string;
        estado: 'abierta' | 'cerrada';
        updated_at: Date;
        docente: string | null;
        mensajes: number;
        ultimo: string | null;
      }[]
    >`
      select q.id, q.asunto, q.estado, q.updated_at, doc.nombre as docente,
             coalesce((select count(*) from lxp.consulta_mensajes cm where cm.consulta_id = q.id), 0)::int as mensajes,
             (select cm.cuerpo from lxp.consulta_mensajes cm
              where cm.consulta_id = q.id order by cm.created_at desc limit 1) as ultimo
      from lxp.consultas q
      left join lxp.perfiles doc on doc.user_id = q.id_docente
      where q.id_alumno = ${userId}
      order by case q.estado when 'abierta' then 0 else 1 end, q.updated_at desc`;
    return rows.map((r) => ({
      id: r.id,
      asunto: r.asunto,
      estado: r.estado,
      docente: r.docente,
      actualizado: r.updated_at.toISOString(),
      mensajes: r.mensajes,
      ultimo: r.ultimo,
    }));
  });
}

/** Detalle de una consulta del alumno (hilo completo). `null` si no es suya. */
export async function getConsultaAlumno(
  userId: string,
  consultaId: string,
): Promise<ConsultaDetalleAlumno | null> {
  return comoAlumno(userId, async (sql) => {
    const q = (
      await sql<
        {
          id: string;
          asunto: string;
          estado: 'abierta' | 'cerrada';
          id_alumno: string;
          docente: string | null;
        }[]
      >`
        select q.id, q.asunto, q.estado, q.id_alumno, doc.nombre as docente
        from lxp.consultas q
        left join lxp.perfiles doc on doc.user_id = q.id_docente
        where q.id = ${consultaId} limit 1`
    )[0];
    if (!q) return null;

    const mensajes = await sql<
      { id: string; autor_id: string; cuerpo: string; created_at: Date; autor: string }[]
    >`
      select cm.id, cm.autor_id, cm.cuerpo, cm.created_at, pe.nombre as autor
      from lxp.consulta_mensajes cm
      join lxp.perfiles pe on pe.user_id = cm.autor_id
      where cm.consulta_id = ${consultaId}
      order by cm.created_at asc`;

    return {
      id: q.id,
      asunto: q.asunto,
      estado: q.estado,
      docente: q.docente,
      mensajes: mensajes.map((m) => ({
        id: m.id,
        autor: m.autor_id === q.id_alumno ? 'alumno' : 'docente',
        autorNombre: m.autor,
        cuerpo: m.cuerpo,
        creadoEn: m.created_at.toISOString(),
      })),
    };
  });
}

export { iniciales };

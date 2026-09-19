import 'server-only';
import type {
  PreferenciasNotificacion,
  TipoNotificacion,
} from '@campus/shared';
import { comoAlumno } from '@/lib/db.server';

/**
 * Datos del CENTRO DE NOTIFICACIONES del alumno (§8 job #12 · Sprint 8.5). Lectura
 * directa `web → Supabase` bajo RLS (Regla de Oro §2): la policy `notificaciones_select`
 * ya limita a las del propio usuario. El motor (api/worker) las ESCRIBE; aquí solo se
 * leen y marcan.
 */

export interface NotificacionItem {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  entidadTipo: string | null;
  entidadId: string | null;
  leida: boolean;
  creadaEn: string;
}

/** Historial de notificaciones del alumno (recientes primero). */
export async function getNotificaciones(
  userId: string,
  limite = 50,
): Promise<NotificacionItem[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        tipo: TipoNotificacion;
        titulo: string;
        cuerpo: string;
        entidad_tipo: string | null;
        entidad_id: string | null;
        leida: boolean;
        created_at: Date;
      }[]
    >`
      select id, tipo::text as tipo, titulo, cuerpo,
             entidad_tipo, entidad_id, leida, created_at
      from lxp.notificaciones
      order by created_at desc
      limit ${limite}`;
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      cuerpo: r.cuerpo,
      entidadTipo: r.entidad_tipo,
      entidadId: r.entidad_id,
      leida: r.leida,
      creadaEn: r.created_at.toISOString(),
    }));
  });
}

/** Conteo de no leídas para el badge de la campana. */
export async function contarNoLeidas(userId: string): Promise<number> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ n: number }[]>`
      select count(*)::int as n
      from lxp.notificaciones
      where leida = false`;
    return rows[0]?.n ?? 0;
  });
}

/** Preferencias del usuario (objeto vacío si nunca configuró → caen en defaults). */
export async function getPreferencias(
  userId: string,
): Promise<PreferenciasNotificacion> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ preferencias: PreferenciasNotificacion }[]>`
      select preferencias
      from lxp.preferencias_notificaciones
      where id_usuario = ${userId}
      limit 1`;
    return rows[0]?.preferencias ?? {};
  });
}

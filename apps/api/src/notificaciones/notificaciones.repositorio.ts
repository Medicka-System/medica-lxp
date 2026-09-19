/**
 * Acceso a datos del motor de notificaciones. El motor ESCRIBE la fila in-app y LEE
 * la preferencia + el correo del destinatario. Corre con la conexión del `api`
 * (service_role en prod · §10): inserta notificaciones que `authenticated` no puede
 * insertar por RLS (0019). Solo esquema `lxp`.
 */
import type { Sql } from '@campus/db';
import type {
  CanalNotificacion,
  NotificacionJob,
  PreferenciasNotificacion,
} from '@campus/shared';

/** Datos del destinatario para el despacho por canales. */
export interface DestinatarioNotif {
  email: string | null;
  nombre: string | null;
}

/** Lee las preferencias del usuario (o null si nunca configuró → caen en defaults). */
export async function leerPreferencias(
  sql: Sql,
  userId: string,
): Promise<PreferenciasNotificacion | null> {
  const rows = await sql<{ preferencias: PreferenciasNotificacion }[]>`
    select preferencias
    from lxp.preferencias_notificaciones
    where id_usuario = ${userId}
    limit 1`;
  return rows[0]?.preferencias ?? null;
}

/** Lee el correo/nombre del destinatario desde su perfil LXP. */
export async function datosDestinatario(
  sql: Sql,
  userId: string,
): Promise<DestinatarioNotif | null> {
  const rows = await sql<{ email: string | null; nombre: string | null }[]>`
    select email, nombre from lxp.perfiles where user_id = ${userId} limit 1`;
  return rows[0] ?? null;
}

/** Inserta la notificación in-app (la campana). Devuelve su id. */
export async function insertarInApp(
  sql: Sql,
  job: NotificacionJob,
  titulo: string,
  cuerpo: string,
  canalesEnviados: CanalNotificacion[],
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into lxp.notificaciones
      (id_usuario, tipo, titulo, cuerpo, entidad_tipo, entidad_id, canales_enviados)
    values (
      ${job.userId}, ${job.tipo}, ${titulo}, ${cuerpo},
      ${job.entidadTipo ?? null}, ${job.entidadId ?? null},
      ${sql.array(canalesEnviados)}::lxp.canal_notificacion[]
    )
    returning id`;
  return rows[0]?.id ?? '';
}

import { getSesionAlumno } from '@/lib/session';
import { getNotificaciones } from '@/lib/campus/notificaciones-datos';
import { ListaNotificaciones } from './_components/lista-notificaciones';

/** Datos por usuario (RLS) → dinámico. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Notificaciones · Campus Médica' };

/**
 * Centro de notificaciones del alumno (§8 job #12 · Sprint 8.5). Server component:
 * lee el historial bajo RLS y lo entrega a la lista interactiva. La campana del shell
 * enlaza aquí.
 */
export default async function NotificacionesPage() {
  const alumno = await getSesionAlumno();
  const notificaciones = await getNotificaciones(alumno.userId);
  return <ListaNotificaciones notificaciones={notificaciones} />;
}

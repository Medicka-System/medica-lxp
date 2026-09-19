import { getSesionAlumno } from '@/lib/session';
import { getPreferencias } from '@/lib/campus/notificaciones-datos';
import { FormPreferencias } from './_components/form-preferencias';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Preferencias de notificación · Campus Médica' };

/** Preferencias de notificación del alumno (§8 job #12 · Sprint 8.5). */
export default async function PreferenciasNotificacionPage() {
  const alumno = await getSesionAlumno();
  const guardadas = await getPreferencias(alumno.userId);
  return <FormPreferencias guardadas={guardadas} />;
}

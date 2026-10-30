import { redirect } from 'next/navigation';
import { getSesionStaff, etiquetaRol } from '@/lib/studio/session';
import { iniciales } from '@/components/avatar';
import { getNotificacionesStaff } from '@/lib/campus/notificaciones-datos';
import { AdminShell } from './_components/admin-shell';

/** Datos por usuario (RLS + rol) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/** Roles que gobiernan la experiencia (§5B): admin y súper admin. */
const ROLES_ADMIN = ['admin', 'super_admin'] as const;

/**
 * Layout de la consola de admin / súper admin. Guard RBAC (§5B / §10): solo
 * `admin` y `super_admin` entran; cualquier otro rol (docente, diseñador, alumno)
 * se va a su propio espacio. La RLS es el segundo candado (§10). El shell del
 * diseñador y los editores a pantalla completa viven en otros route groups: por
 * eso esta consola tiene su propio layout (header navy con nav de administración),
 * sin heredar la navegación de autoría.
 */
export default async function StudioAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getSesionStaff();
  if (!ROLES_ADMIN.includes(staff.rol as (typeof ROLES_ADMIN)[number])) {
    // Diseñador → su Studio; docente → su consola; alumno → Campus.
    redirect(staff.rol === 'docente' ? '/inicio' : '/studio/programas');
  }
  const esSuper = staff.rol === 'super_admin';

  // Campana del header: notificaciones PROPIAS del staff (§8 job #12), bajo RLS.
  const { noLeidas, recientes } = await getNotificacionesStaff(staff.userId);

  return (
    <AdminShell
      usuario={{
        nombre: staff.nombre,
        iniciales: iniciales(staff.nombre),
        rol: etiquetaRol(staff.rol),
        esSuper,
      }}
      notificaciones={noLeidas}
      hayAlertaCritica={false}
      notificacionesRecientes={recientes}
    >
      {children}
    </AdminShell>
  );
}

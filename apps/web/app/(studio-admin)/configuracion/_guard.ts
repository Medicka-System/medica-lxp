import 'server-only';
import { redirect } from 'next/navigation';
import { getSesionStaff, type SesionStaff } from '@/lib/studio/session';

/**
 * Guard de la Configuración del sistema (§5B / §10). El layout de `(studio-admin)`
 * ya deja pasar a `admin` y `super_admin`; aquí ponemos el SEGUNDO candado: la
 * Configuración es EXCLUSIVA del súper admin. Un `admin` (que administra la
 * experiencia, no el sistema) se regresa a su consola.
 *
 * Doble candado (§10): esto es el guard de UI; la RLS de `lxp.eco_config`
 * (`eco_config_write` exige `rol_actual() = 'super_admin'`) es el candado de datos.
 */
export async function requireSuperAdmin(): Promise<SesionStaff> {
  const staff = await getSesionStaff();
  if (staff.rol !== 'super_admin') {
    redirect('/admin/panel');
  }
  return staff;
}

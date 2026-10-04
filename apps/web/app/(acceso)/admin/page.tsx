import { redirect } from 'next/navigation';
import { authEsDev } from '@/lib/auth/config';
import { getUsuarioSupabase } from '@/lib/supabase/server';
import { resolverStaffPorId } from '@/lib/db.server';
import LoginStudio from './_login-studio';

/** Sesión real por usuario → render dinámico (nunca estático). */
export const dynamic = 'force-dynamic';

/**
 * `/admin` — entrada del STAFF (Studio). Despachador + login (Spec B):
 *
 *   • Sin sesión → login del Studio (Microsoft/Azure + correo/contraseña).
 *   • Staff autenticado → a su área por rol: admin/súper → `/admin/panel`,
 *     docente → `/docente`, diseñador → `/studio/programas`.
 *   • Autenticado pero NO staff (p. ej. un alumno) → se muestra el login con aviso y
 *     el cliente cierra esa sesión colgada (`cerrarAlMontar`).
 *
 * En dev (perfil sin Supabase) no hay sesión real: siempre se muestra el login (para
 * verificación visual). La consola de admin vive en `/admin/panel` (ver (studio-admin)).
 */
export default async function AdminAccesoPage() {
  if (!authEsDev()) {
    const userId = await getUsuarioSupabase();
    if (userId) {
      const staff = await resolverStaffPorId(userId);
      if (staff) {
        if (staff.rol === 'docente') redirect('/docente');
        if (staff.rol === 'disenador_instruccional') redirect('/studio/programas');
        redirect('/admin/panel'); // admin | super_admin
      }
      // Autenticado pero sin perfil de staff → login + cierre de la sesión no-staff.
      return (
        <LoginStudio
          avisoInicial="Esta cuenta no tiene acceso al Studio."
          cerrarAlMontar
        />
      );
    }
  }
  return <LoginStudio />;
}

'use server';
import { authEsDev } from '@/lib/auth/config';
import { getUsuarioSupabase } from '@/lib/supabase/server';
import { resolverStaffPorId } from '@/lib/db.server';

export type RolStaff = 'super_admin' | 'admin' | 'docente';

/**
 * Rol LXP del staff de la sesión Supabase actual, o `null` si no hay sesión o el
 * usuario NO es staff (p. ej. un alumno que se autenticó por Microsoft/correo). El
 * rol vive SOLO en `lxp.perfiles.rol` (§10, regla 2); se lee vía RLS/postgres.js. El
 * login del Studio usa esto para: (a) enrutar por rol tras un login válido, y (b)
 * cerrar la sesión de quien no es staff. En dev (sin Supabase) devuelve null.
 */
export async function rolStaffActual(): Promise<RolStaff | null> {
  if (authEsDev()) return null;
  const userId = await getUsuarioSupabase();
  if (!userId) return null;
  const staff = await resolverStaffPorId(userId);
  return staff ? (staff.rol as RolStaff) : null;
}

import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import {
  resolverAlumnoDev,
  resolverAlumnoPorId,
  asegurarPerfilProvisionado,
  rolDePerfil,
  type AlumnoResuelto,
} from './db.server';
import { authEsDev } from './auth/config';
import { getUsuarioSupabase } from './supabase/server';

export type SesionAlumno = AlumnoResuelto;

/**
 * Alumno "logueado". El MECANISMO de RLS no cambia (los consumidores siguen usando
 * `comoAlumno(alumno.userId)`); solo cambia DE DÓNDE sale el `sub`:
 *
 *   • `AUTH_MODE` ≠ `supabase` (dev local): de `DEV_ALUMNO_EMAIL` (seed), sin Supabase.
 *   • `AUTH_MODE` = `supabase` (prod): del JWT de la sesión Supabase (server). En el
 *     primer login se auto-provisiona `lxp.perfiles` desde CORA (mig 0063).
 *
 * `cache()` evita re-resolver dentro del mismo request (layout + página comparten sesión).
 * El shape de retorno se conserva (userId, nombre, matricula, accesoActivo…).
 */
export const getSesionAlumno = cache(async (): Promise<SesionAlumno> => {
  if (authEsDev()) {
    const email = process.env.DEV_ALUMNO_EMAIL ?? 'a1@seed.local';
    const alumno = await resolverAlumnoDev(email);
    if (!alumno) {
      throw new Error(
        `No se encontró el alumno de dev (${email}). ¿Corriste el seed? (pnpm --filter db seed)`,
      );
    }
    return alumno;
  }

  // PROD: identidad real desde el sub del JWT de Supabase.
  const userId = await getUsuarioSupabase();
  if (!userId) redirect('/login');

  // ÚNICO punto de provisión, ARRIBA (antes de resolver rol · fix P9): el perfil se crea
  // desde CORA la 1ª vez que el usuario entra por cualquier puerta. Idempotente.
  await asegurarPerfilProvisionado(userId);

  const alumno = await resolverAlumnoPorId(userId);
  if (alumno) return alumno;

  // Sin perfil de ALUMNO tras provisionar → negación/ruteo EXPLÍCITO (no rebote mudo · req 4).
  const rol = await rolDePerfil(userId);
  if (rol === null) {
    console.warn(`[sesion-alumno] ${userId}: sin perfil LXP tras provisionar (rol CORA sin mapeo: asesor/desconocido) → sin acceso.`);
    redirect('/login?e=sin-acceso');
  }
  // Tiene perfil pero es STAFF (no alumno) → a su consola del Studio, no al login.
  console.warn(`[sesion-alumno] ${userId}: perfil "${rol}" (staff) en ruta de Campus → al Studio.`);
  redirect('/admin');
});

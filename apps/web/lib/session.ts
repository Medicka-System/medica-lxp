import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import {
  resolverAlumnoDev,
  resolverAlumnoPorId,
  provisionarPerfil,
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

  let alumno = await resolverAlumnoPorId(userId);
  if (!alumno) {
    // Primer request autenticado sin perfil → auto-provisión desde CORA y reintento.
    await provisionarPerfil(userId);
    alumno = await resolverAlumnoPorId(userId);
  }
  // Autenticado pero CORA no lo reconoce como alumno provisionable → de vuelta al login.
  if (!alumno) redirect('/login?e=sin-perfil');

  return alumno;
});

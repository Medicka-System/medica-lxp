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

/** Lo mínimo que consumen las acciones de FIRMA de media de contenido (§2/§6). */
export type SesionLectorContenido = { userId: string; accesoActivo: boolean };

/**
 * Sesión para LEER CONTENIDO DE CURSO (imágenes/video/PDF/narración de una lección) — que
 * NO es privado de ningún alumno. A diferencia de `getSesionAlumno`, un STAFF (docente/
 * admin/súper admin) NO se rebota al Studio: puede FIRMAR/VER el contenido en la VISTA
 * PREVIA del course builder (§5B) sin que la acción de media lo expulse a `/admin`.
 *
 * Garantías (deliberadas, para no aflojar seguridad):
 *   • ALUMNO real → trato IDÉNTICO a `getSesionAlumno` (incluido el gate `accesoActivo` en
 *     vivo desde CORA). No cambia nada para el alumno.
 *   • STAFF → `{ accesoActivo: true }` SIN redirigir — SOLO lectura de contenido de curso.
 *     No abre datos PRIVADOS de ningún alumno (esas lecturas siguen por `getSesionAlumno` +
 *     RLS) ni habilita escrituras (progreso/entregas/respuestas siguen exigiendo alumno).
 *   • Sin perfil LXP (asesor/desconocido) → mismo rechazo que hoy.
 *
 * Úsese SOLO en las server actions que firman media de CONTENIDO para mostrarla; jamás en
 * acciones que modifican estado del alumno.
 */
export const getSesionLectorContenido = cache(async (): Promise<SesionLectorContenido> => {
  if (authEsDev()) {
    // DEV (sin Supabase): misma identidad de alumno del seed que usaba `getSesionAlumno` →
    // comportamiento local idéntico (en dev no existe el rebote a /admin de todos modos).
    const email = process.env.DEV_ALUMNO_EMAIL ?? 'a1@seed.local';
    const alumno = await resolverAlumnoDev(email);
    if (!alumno) {
      throw new Error(
        `No se encontró el alumno de dev (${email}). ¿Corriste el seed? (pnpm --filter db seed)`,
      );
    }
    return { userId: alumno.userId, accesoActivo: alumno.accesoActivo };
  }

  const userId = await getUsuarioSupabase();
  if (!userId) redirect('/login');

  await asegurarPerfilProvisionado(userId);

  // ALUMNO real → idéntico a getSesionAlumno (incluye el gate `accesoActivo` en vivo).
  const alumno = await resolverAlumnoPorId(userId);
  if (alumno) return { userId: alumno.userId, accesoActivo: alumno.accesoActivo };

  const rol = await rolDePerfil(userId);
  if (rol === null) {
    console.warn(`[sesion-lector] ${userId}: sin perfil LXP tras provisionar → sin acceso.`);
    redirect('/login?e=sin-acceso');
  }
  // Edge: rol 'alumno' sin datos de CORA resueltos → mismo trato que hoy (NO aflojar el gate).
  if (rol === 'alumno') redirect('/admin');

  // STAFF (docente/admin/súper admin): LECTURA de contenido de curso permitida, sin rebotar.
  return { userId, accesoActivo: true };
});

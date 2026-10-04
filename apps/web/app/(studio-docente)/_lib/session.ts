import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { resolverStaffDev, resolverStaffPorId } from '@/lib/db.server';
import { authEsDev } from '@/lib/auth/config';
import { getUsuarioSupabase } from '@/lib/supabase/server';

/**
 * Staff actual: dev → `DEV_DOCENTE_EMAIL` (seed); prod → sub del JWT real + rol de
 * `lxp.perfiles.rol`. Devuelve null solo en prod cuando el sub no tiene perfil de staff
 * (p. ej. un alumno). En dev lanza si falta el seed (igual que antes).
 */
async function resolverStaffActual(): Promise<Awaited<ReturnType<typeof resolverStaffPorId>>> {
  if (authEsDev()) {
    const email = process.env.DEV_DOCENTE_EMAIL ?? 'docente@seed.local';
    const staff = await resolverStaffDev(email);
    if (!staff) {
      throw new Error(
        `No se encontró el docente de dev (${email}). ¿Corriste el seed? (pnpm --filter db seed)`,
      );
    }
    return staff;
  }
  const userId = await getUsuarioSupabase();
  if (!userId) redirect('/admin'); // sin sesión → login del Studio (no el del alumno)
  return resolverStaffPorId(userId);
}

/**
 * Sesión del DOCENTE (§5B). Su consola es su propia plataforma: el docente NO entra
 * al Campus (eso es del alumno) ni al Studio de autoría (eso es del diseñador). Aún
 * sin auth real (Sprint 11): se resuelve por `DEV_DOCENTE_EMAIL` (por defecto el
 * docente del seed). `cache()` evita re-consultar dentro del mismo request (layout +
 * página comparten la sesión). En producción esto vendrá del JWT compartido con CORA.
 */
export type SesionDocente = {
  userId: string;
  nombre: string;
  email: string;
};

export const getSesionDocente = cache(async (): Promise<SesionDocente> => {
  const staff = await resolverStaffActual();
  if (!staff) redirect('/inicio'); // prod: sub sin perfil de staff (alumno/none) → Campus
  return { userId: staff.userId, nombre: staff.nombre, email: staff.email };
});

/**
 * Guard de la consola del docente: solo el rol `docente` entra. Cualquier otro rol se
 * manda a su lugar — el alumno al Campus, el resto del staff al Studio de autoría —
 * RBAC por rol sobre el usuario REAL (§5B). La RLS (`lxp.es_docente_o_mas()`) es el
 * segundo candado (§10).
 */
export const requireDocente = cache(async (): Promise<SesionDocente> => {
  const staff = await resolverStaffActual();
  if (!staff) redirect('/inicio'); // alumno o sin perfil → fuera de la consola docente
  if (staff.rol !== 'docente') {
    redirect(staff.rol === 'disenador_instruccional' ? '/studio/programas' : '/inicio');
  }
  return { userId: staff.userId, nombre: staff.nombre, email: staff.email };
});

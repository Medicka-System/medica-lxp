import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { asegurarPerfilProvisionado, resolverStaffDev, resolverStaffPorId, rolDePerfil } from '@/lib/db.server';
import { authEsDev } from '@/lib/auth/config';
import { getUsuarioSupabase } from '@/lib/supabase/server';

/**
 * Sesión de staff del Studio (§5B). Aún sin auth real (Sprint 11): se toma de
 * `DEV_STAFF_EMAIL` (por defecto la diseñadora del seed). `cache()` evita
 * re-consultar dentro del mismo request (layout + página comparten la sesión).
 */
export type SesionStaff = NonNullable<Awaited<ReturnType<typeof resolverStaffDev>>>;

/** Roles que construyen contenido (autoría · §5B). Empata con `lxp.es_autoria()` (mig 0077):
 *  control_escolar→admin cubre el diseño instruccional; el rol disenador_instruccional quedó
 *  inerte (el mapeo CORA→LXP nunca lo produce) y se retiró de app y SQL. */
const ROLES_AUTORIA = ['admin', 'super_admin'] as const;

/**
 * Roles que CURAN la biblioteca clínica (§5B): autoría + DOCENTE. El docente estructura
 * la "verdad del caso" y valida imágenes (un pedagogo no puede juzgar una ecografía). La
 * RLS `es_staff()` (incluye docente) es el segundo candado. En dev la sesión se resuelve
 * por env; en prod, del JWT del usuario real.
 */
const ROLES_CURADURIA = [...ROLES_AUTORIA, 'docente'] as const;

export const getSesionStaff = cache(async (): Promise<SesionStaff> => {
  if (authEsDev()) {
    const email = process.env.DEV_STAFF_EMAIL ?? 'admin-studio@seed.local';
    const staff = await resolverStaffDev(email);
    if (!staff) {
      throw new Error(
        `No se encontró el staff de dev (${email}). ¿Corriste el seed? (pnpm --filter db seed)`,
      );
    }
    return staff;
  }
  // PROD: identidad REAL desde el sub del JWT de Supabase; el rol LXP sale de
  // lxp.perfiles.rol (mismo patrón que getSesionAlumno · §10). Sin perfil de staff
  // (p. ej. un alumno) → a su Campus; el rol concreto lo decide cada guard.
  const userId = await getUsuarioSupabase();
  if (!userId) redirect('/admin'); // sin sesión → login del Studio (no el del alumno)
  // MISMO punto de provisión que el alumno (fix P9): un staff que entra por /admin se
  // provisiona solo (control_escolar→admin, docente→docente, etc.), antes del RBAC.
  await asegurarPerfilProvisionado(userId);
  const staff = await resolverStaffPorId(userId);
  if (staff) return staff;
  // Sin perfil de staff tras provisionar → negación/ruteo EXPLÍCITO (no rebote mudo · req 4).
  const rol = await rolDePerfil(userId);
  if (rol === null) {
    console.warn(`[sesion-staff] ${userId}: sin perfil LXP tras provisionar (rol CORA sin mapeo: asesor/desconocido) → sin acceso al Studio.`);
    redirect('/admin?e=sin-acceso');
  }
  // Tiene perfil pero es alumno → a su Campus.
  redirect('/inicio');
});

/**
 * Guard del Studio de autoría: solo diseñador/admin/súper admin entran. Un alumno
 * (o cualquier no-autoría) se manda al Campus — RBAC por rol (§5B, DoD Sprint 4.5).
 * La RLS es el segundo control (doble candado · §10).
 */
export const requireAutoria = cache(async (): Promise<SesionStaff> => {
  const staff = await getSesionStaff();
  if (!ROLES_AUTORIA.includes(staff.rol as (typeof ROLES_AUTORIA)[number])) {
    redirect('/inicio');
  }
  return staff;
});

/**
 * Guard de la CURADURÍA clínica (biblioteca de casos): autoría + docente. El docente cura
 * la verdad del caso (§5B); el resto de no-curadores va al Campus. RLS `es_staff()` valida
 * la escritura en `lxp.casos_biblioteca`.
 */
export const requireCurador = cache(async (): Promise<SesionStaff> => {
  const staff = await getSesionStaff();
  if (!ROLES_CURADURIA.includes(staff.rol as (typeof ROLES_CURADURIA)[number])) {
    redirect('/inicio');
  }
  return staff;
});

/** Etiqueta legible del rol (para el header del Studio). */
export function etiquetaRol(rol: SesionStaff['rol']): string {
  return {
    super_admin: 'Súper administración',
    admin: 'Administración',
    docente: 'Docencia',
  }[rol];
}

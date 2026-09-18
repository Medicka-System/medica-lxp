import 'server-only';
import { cache } from 'react';
import { resolverAlumnoDev } from './db.server';

export type SesionAlumno = Awaited<ReturnType<typeof resolverAlumnoDev>>;

/**
 * Alumno "logueado" para el Sprint 4 (aún sin auth real · Sprint 11). Se toma de
 * `DEV_ALUMNO_EMAIL` (por defecto el alumno con acceso del seed). `cache()` evita
 * re-consultar dentro del mismo request (layout + página comparten la sesión).
 */
export const getSesionAlumno = cache(async () => {
  const email = process.env.DEV_ALUMNO_EMAIL ?? 'a1@seed.local';
  const alumno = await resolverAlumnoDev(email);
  if (!alumno) {
    throw new Error(
      `No se encontró el alumno de dev (${email}). ¿Corriste el seed? (pnpm --filter db seed)`,
    );
  }
  return alumno;
});

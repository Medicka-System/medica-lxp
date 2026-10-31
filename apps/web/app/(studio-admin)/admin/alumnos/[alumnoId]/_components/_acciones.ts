'use server';

import { revalidatePath } from 'next/cache';
import { getSesionStaff } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';

/**
 * Otorgamiento MANUAL de insignias por el staff (§6/§8) — CRUD web→Supabase bajo RLS
 * (Regla de Oro §2). Las policies de mig 0098 lo gobiernan:
 *   · insert: `es_staff()` y `otorgado_por = auth.uid()` (quién la da).
 *   · delete: `es_staff()` y `otorgado_por not null` → solo revoca las MANUALES; las
 *     automáticas (otorgado_por null, las pone el worker) NO se tocan desde web.
 * Human-in-loop: acción explícita del docente/admin desde el expediente del alumno.
 */

export type ResultadoOtorgar = { ok: true } | { ok: false; error: string };

export async function otorgarBadgeManual(alumnoId: string, badgeId: string): Promise<ResultadoOtorgar> {
  const staff = await getSesionStaff();
  if (!alumnoId || !badgeId) return { ok: false, error: 'Faltan datos para otorgar la insignia.' };
  try {
    await comoStaff(staff.userId, async (sql) => {
      await sql`
        insert into lxp.badges_otorgados (badge_id, id_perfil, otorgado_por)
        values (${badgeId}, ${alumnoId}, ${staff.userId})
        on conflict (badge_id, id_perfil) do nothing`;
    });
    revalidatePath(`/admin/alumnos/${alumnoId}`);
    return { ok: true };
  } catch (e) {
    console.error('[otorgarBadgeManual] fallo:', e);
    return { ok: false, error: 'No se pudo otorgar la insignia (¿ya la tenía o sin permiso?).' };
  }
}

export async function revocarBadgeManual(alumnoId: string, badgeId: string): Promise<ResultadoOtorgar> {
  const staff = await getSesionStaff();
  if (!alumnoId || !badgeId) return { ok: false, error: 'Faltan datos para revocar la insignia.' };
  try {
    await comoStaff(staff.userId, async (sql) => {
      // La policy de delete solo deja borrar las manuales (otorgado_por not null); una
      // automática simplemente no coincide y no se borra.
      await sql`
        delete from lxp.badges_otorgados
        where badge_id = ${badgeId} and id_perfil = ${alumnoId} and otorgado_por is not null`;
    });
    revalidatePath(`/admin/alumnos/${alumnoId}`);
    return { ok: true };
  } catch (e) {
    console.error('[revocarBadgeManual] fallo:', e);
    return { ok: false, error: 'No se pudo revocar la insignia.' };
  }
}

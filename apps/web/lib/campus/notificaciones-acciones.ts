'use server';

import { revalidatePath } from 'next/cache';
import type { PreferenciasNotificacion } from '@campus/shared';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions del CENTRO DE NOTIFICACIONES (§8 job #12). CRUD simple `web → Supabase`
 * bajo RLS (Regla de Oro §2): corren con `comoAlumno`, así que la policy
 * `notificaciones_update` (id_usuario = auth.uid()) es el segundo candado — el alumno
 * solo marca/edita lo suyo. El motor las inserta con service_role; aquí no se insertan.
 */

/** Marca una notificación como leída. */
export async function marcarLeida(id: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.notificaciones
        set leida = true, leida_en = now()
        where id = ${id} and leida = false`;
    });
  } catch {
    return { ok: false, error: 'No se pudo actualizar la notificación.' };
  }
  revalidatePath('/notificaciones');
  return { ok: true };
}

/** Marca TODAS las no leídas del alumno como leídas. */
export async function marcarTodasLeidas(): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.notificaciones
        set leida = true, leida_en = now()
        where leida = false`;
    });
  } catch {
    return { ok: false, error: 'No se pudieron actualizar las notificaciones.' };
  }
  revalidatePath('/notificaciones');
  return { ok: true };
}

/**
 * Guarda las preferencias de notificación del alumno (upsert). La forma la valida el
 * cliente contra el contrato compartido; aquí se persiste el JSON de overrides por
 * (tipo, canal). Lo ausente cae en la matriz de defaults.
 */
export async function guardarPreferencias(
  preferencias: PreferenciasNotificacion,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.preferencias_notificaciones (id_usuario, preferencias)
        values (${alumno.userId}, ${sql.json(preferencias)})
        on conflict (id_usuario)
        do update set preferencias = ${sql.json(preferencias)}, updated_at = now()`;
    });
  } catch {
    return { ok: false, error: 'No se pudieron guardar tus preferencias.' };
  }
  revalidatePath('/notificaciones/preferencias');
  return { ok: true };
}

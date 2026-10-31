'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '../_guard';
import { getSesionStaff } from '@/lib/studio/session';
import { comoStaff, afirmarFilas } from '@/lib/db.server';
import type { ReglaBadge, TipoReglaBadge } from '@campus/shared';

/**
 * Gestión del CATÁLOGO de badges (§6/§8) — CRUD web→Supabase bajo RLS (Regla de Oro §2).
 * La escritura de `lxp.badges` exige `es_autoria()` (policy `badges_write` · mig 0098); la
 * pantalla vive en Configuración (súper admin). El MOTOR automático (worker) no se toca:
 * solo editamos el catálogo (clave/nombre/descripción/regla) que el worker ya evalúa.
 *
 * La `regla` es EXACTAMENTE la que evalúa el motor (`@campus/shared` · badges.ts): tipos
 * casos | horas | competencia | hito | racha, o `null` = insignia MANUAL (la da el docente).
 */

/** Tipo de regla en la UI: los 5 del motor + 'manual' (que persiste como regla null). */
export type TipoReglaUi = TipoReglaBadge | 'manual';

export type ReglaUi = {
  tipo: TipoReglaUi;
  umbral?: number;
  dominio?: string;
  hito?: string;
};

export type BadgeAdmin = {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  regla: ReglaBadge | null;
  /** Cuántas veces se ha otorgado (para avisar antes de borrar). */
  otorgados: number;
};

export type ResultadoBadge = { ok: true; id?: string } | { ok: false; error: string };

/** slug kebab/underscore sin acentos para la `clave` única. */
function slugClave(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'badge';
}

/** Normaliza la regla de la UI a la forma del motor (o null para manual). */
function reglaDeUi(r: ReglaUi | null | undefined): ReglaBadge | null {
  if (!r || r.tipo === 'manual') return null;
  const regla: ReglaBadge = { tipo: r.tipo };
  if (r.tipo === 'competencia') {
    regla.umbral = Number.isFinite(r.umbral) ? r.umbral : 60;
    if (r.dominio && r.dominio !== 'todos') regla.dominio = r.dominio;
  } else if (r.tipo === 'hito') {
    regla.hito = (r.hito ?? '').trim();
  } else {
    // casos | horas | racha → umbral numérico
    regla.umbral = Number.isFinite(r.umbral) ? Math.max(0, Math.trunc(r.umbral as number)) : 1;
  }
  return regla;
}

/** Lista el catálogo (lectura staff; `otorgados` = conteo por badge). */
export async function getBadgesCatalogo(): Promise<BadgeAdmin[]> {
  const staff = await getSesionStaff();
  return comoStaff(staff.userId, async (sql) => {
    const rows = await sql<
      { id: string; clave: string; nombre: string; descripcion: string | null; regla: ReglaBadge | null; otorgados: number }[]
    >`
      select b.id, b.clave, b.nombre, b.descripcion, b.regla,
             coalesce(o.n, 0)::int as otorgados
      from lxp.badges b
      left join (select badge_id, count(*) as n from lxp.badges_otorgados group by badge_id) o
        on o.badge_id = b.id
      order by b.created_at asc, b.nombre asc`;
    return rows.map((r) => ({
      id: r.id,
      clave: r.clave,
      nombre: r.nombre,
      descripcion: r.descripcion ?? '',
      regla: r.regla,
      otorgados: r.otorgados,
    }));
  });
}

export async function crearBadge(datos: {
  nombre: string;
  descripcion?: string;
  regla: ReglaUi | null;
}): Promise<ResultadoBadge> {
  const staff = await requireSuperAdmin();
  const nombre = datos.nombre?.trim();
  if (!nombre || nombre.length < 2) return { ok: false, error: 'Escribe un nombre para la insignia.' };

  const clave = slugClave(nombre);
  const regla = reglaDeUi(datos.regla);
  if (regla?.tipo === 'hito' && !regla.hito) {
    return { ok: false, error: 'La regla de tipo hito necesita el identificador del hito (p. ej. horas_100).' };
  }

  try {
    const id = await comoStaff(staff.userId, async (sql) => {
      const rows = await sql<{ id: string }[]>`
        insert into lxp.badges (clave, nombre, descripcion, regla)
        values (${clave}, ${nombre}, ${datos.descripcion?.trim() || null},
                ${regla === null ? null : sql.json(regla as unknown as Parameters<typeof sql.json>[0])})
        returning id`;
      return rows[0]?.id;
    });
    revalidatePath('/configuracion/badges');
    return { ok: true, id };
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/unique|duplicate/i.test(msg)) {
      return { ok: false, error: `Ya existe una insignia con la clave "${clave}". Cambia el nombre.` };
    }
    console.error('[crearBadge] fallo:', e);
    return { ok: false, error: 'No se pudo crear la insignia.' };
  }
}

export async function actualizarBadge(datos: {
  id: string;
  nombre: string;
  descripcion?: string;
  regla: ReglaUi | null;
}): Promise<ResultadoBadge> {
  const staff = await requireSuperAdmin();
  const nombre = datos.nombre?.trim();
  if (!nombre || nombre.length < 2) return { ok: false, error: 'Escribe un nombre para la insignia.' };
  const regla = reglaDeUi(datos.regla);
  if (regla?.tipo === 'hito' && !regla.hito) {
    return { ok: false, error: 'La regla de tipo hito necesita el identificador del hito (p. ej. horas_100).' };
  }
  try {
    await comoStaff(staff.userId, async (sql) => {
      afirmarFilas(
        await sql`
          update lxp.badges
          set nombre = ${nombre},
              descripcion = ${datos.descripcion?.trim() || null},
              regla = ${regla === null ? null : sql.json(regla as unknown as Parameters<typeof sql.json>[0])}
          where id = ${datos.id}`,
        'actualizar badge',
      );
    });
    revalidatePath('/configuracion/badges');
    return { ok: true };
  } catch (e) {
    console.error('[actualizarBadge] fallo:', e);
    return { ok: false, error: 'No se pudo actualizar la insignia.' };
  }
}

/** Borra la insignia. FK on delete cascade (0006) elimina también sus otorgados. */
export async function eliminarBadge(id: string): Promise<ResultadoBadge> {
  const staff = await requireSuperAdmin();
  try {
    await comoStaff(staff.userId, async (sql) => {
      await sql`delete from lxp.badges where id = ${id}`;
    });
    revalidatePath('/configuracion/badges');
    return { ok: true };
  } catch (e) {
    console.error('[eliminarBadge] fallo:', e);
    return { ok: false, error: 'No se pudo eliminar la insignia.' };
  }
}

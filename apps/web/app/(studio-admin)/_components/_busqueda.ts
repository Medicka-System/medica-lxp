'use server';

import { getSesionStaff, etiquetaRol } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';

/**
 * Búsqueda global del header del Studio admin (§5B). Lo MÍNIMO real: busca personas
 * (`lxp.perfiles`) y grupos (`lxp.grupos`) por nombre bajo RLS (`comoStaff`) y devuelve
 * resultados navegables. No es un índice ni full-text: `ilike` acotado con tope, suficiente
 * para un type-ahead de ~800 alumnos. CRUD/lectura simple → web→Supabase (Regla de Oro §2).
 */
export type ResultadoBusqueda = {
  id: string;
  nombre: string;
  tipo: 'alumno' | 'staff' | 'grupo';
  detalle: string;
  href: string;
};

export async function buscarGlobal(q: string): Promise<ResultadoBusqueda[]> {
  const termino = (q ?? '').trim();
  if (termino.length < 2) return [];

  // RBAC: solo staff de la consola (admin / súper admin) busca aquí.
  const staff = await getSesionStaff();
  if (staff.rol !== 'admin' && staff.rol !== 'super_admin') return [];

  const patron = `%${termino}%`;
  return comoStaff(staff.userId, async (sql) => {
    const [personas, grupos] = await Promise.all([
      sql<{ user_id: string; nombre: string; rol: string }[]>`
        select user_id, nombre, rol::text as rol
        from lxp.perfiles
        where nombre ilike ${patron}
        order by nombre
        limit 8`,
      sql<{ id: string; nombre: string }[]>`
        select id, nombre
        from lxp.grupos
        where nombre ilike ${patron}
        order by nombre
        limit 5`,
    ]);

    const res: ResultadoBusqueda[] = [];
    for (const p of personas) {
      const esAlumno = p.rol === 'alumno';
      res.push({
        id: p.user_id,
        nombre: p.nombre,
        tipo: esAlumno ? 'alumno' : 'staff',
        detalle: esAlumno ? 'Alumno' : etiquetaRol(p.rol as Parameters<typeof etiquetaRol>[0]),
        href: esAlumno ? `/admin/alumnos/${p.user_id}` : `/admin/staff/${p.user_id}`,
      });
    }
    for (const g of grupos) {
      res.push({ id: g.id, nombre: g.nombre, tipo: 'grupo', detalle: 'Grupo', href: '/admin/grupos' });
    }
    return res;
  });
}

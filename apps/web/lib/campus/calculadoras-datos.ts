import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type { CalculadoraCatalogo } from './calculadoras-contrato';
import { parseDefinicion } from './calculadoras-motor';

/**
 * Catálogo de calculadoras configuradas por la escuela. Corre con RLS vía
 * `comoAlumno`: el alumno solo ve las PUBLICADAS (policy calculadoras_select · 0010).
 * Las calculadoras destacadas (cómputo cliente) no pasan por aquí.
 *
 * La `definicion` (jsonb) se valida/compila en el borde con `parseDefinicion`: si es
 * inválida queda en `null` (la UI la lista pero no la ejecuta) — nunca rompe la página.
 */
export async function getCalculadorasCatalogo(
  userId: string,
): Promise<CalculadoraCatalogo[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      { clave: string; nombre: string; descripcion: string | null; definicion: unknown }[]
    >`
      select clave, nombre, descripcion, definicion
      from lxp.calculadoras
      where publicado
      order by nombre`;
    return rows.map((r) => ({
      clave: r.clave,
      nombre: r.nombre,
      descripcion: r.descripcion,
      definicion: parseDefinicion(r.definicion),
    }));
  });
}

import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { comoAncla } from './notas-contrato';
import type { AnclaNota, Nota, NotaTipo } from './notas-contrato';

/**
 * Notas del alumno para una lección (§5A). Lectura bajo RLS (`comoAlumno`): la policy
 * notas_select (alumno_id = auth.uid()) es el candado — solo devuelve las suyas. Sin
 * lógica de dominio (§2).
 */
export async function getNotasLeccion(userId: string, leccionId: string): Promise<Nota[]> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<
      {
        id: string;
        tipo: NotaTipo;
        contenido: string;
        ancla: AnclaNota | null;
        created_at: string;
      }[]
    >`
      select id, tipo, contenido, ancla, created_at
      from lxp.notas
      where leccion_id = ${leccionId}
      order by created_at asc`;

    return filas.map((f) => ({
      id: f.id,
      tipo: f.tipo,
      contenido: f.contenido,
      ancla: comoAncla(f.ancla),
      creadoEn: f.created_at,
    }));
  });
}

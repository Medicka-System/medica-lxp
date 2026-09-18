import 'server-only';
import { comoStaff } from '@/lib/db.server';

/**
 * Lectura del bloque de TEORÍA para su editor a fondo (§5B). La teoría es un
 * `lxp.contenidos` de tipo `texto`: su cuerpo es el HTML que produce el EditorRico.
 * Corre con RLS vía `comoStaff` (policy `contenidos` → `lxp.es_autoria()`), igual
 * que el resto de la autoría (Regla de Oro §2 — CRUD directo, sin pasar por NestJS).
 */

export type ContenidoTeoria = {
  id: string;
  titulo: string;
  /** HTML del EditorRico. '' si aún no se ha escrito nada. */
  cuerpo: string;
  /** tipo del contenido (se espera `texto`). */
  tipo: string;
  contexto: {
    programaId: string;
    programa: string;
    modulo: string;
    leccion: string;
    publicado: boolean;
  };
};

export async function getContenidoTeoria(
  userId: string,
  contenidoId: string,
): Promise<ContenidoTeoria | null> {
  return comoStaff(userId, async (sql) => {
    const r = (
      await sql<
        {
          id: string;
          titulo: string;
          cuerpo: string | null;
          tipo: string;
          programa_id: string;
          programa: string;
          modulo: string;
          leccion: string;
          publicado: boolean;
        }[]
      >`
        select c.id, c.titulo, c.cuerpo, c.tipo::text as tipo,
               p.id as programa_id, p.nombre as programa, p.publicado,
               m.nombre as modulo, l.nombre as leccion
        from lxp.contenidos c
        join lxp.lecciones l on l.id = c.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas p on p.id = m.programa_id
        where c.id = ${contenidoId}
        limit 1`
    )[0];
    if (!r) return null;
    return {
      id: r.id,
      titulo: r.titulo,
      cuerpo: r.cuerpo ?? '',
      tipo: r.tipo,
      contexto: {
        programaId: r.programa_id,
        programa: r.programa,
        modulo: r.modulo,
        leccion: r.leccion,
        publicado: r.publicado,
      },
    };
  });
}

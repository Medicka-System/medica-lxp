import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type {
  BloqueContenido,
  ContenidoTipo,
  LeccionCompleta,
  LeccionVecina,
} from './leccion-contrato';

/**
 * Lectura de una lección (contenido + navegación). Corre con RLS vía `comoAlumno`:
 * lee lxp.contenidos/lecciones/modulos/programas (read = true) y solo el progreso
 * propio (reproduccion_progreso). Sin lógica de dominio (§2). Ver leccion-contrato
 * para el reparto REAL vs PENDIENTE (media/H5P/paquetes/xAPI).
 */
export async function getLeccion(
  userId: string,
  leccionId: string,
): Promise<LeccionCompleta | null> {
  return comoAlumno(userId, async (sql) => {
    const cab = await sql<
      {
        id: string;
        nombre: string;
        descripcion: string | null;
        tipo: string;
        modulo_id: string;
        modulo: string;
        programa_id: string;
        programa: string;
      }[]
    >`
      select
        l.id, l.nombre, l.descripcion, l.tipo::text as tipo,
        m.id as modulo_id, m.nombre as modulo,
        pr.id as programa_id, pr.nombre as programa
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where l.id = ${leccionId} and pr.publicado
      limit 1`;

    const leccion = cab[0];
    if (!leccion) return null;

    const contenidos = await sql<
      {
        id: string;
        tipo: ContenidoTipo;
        titulo: string;
        cuerpo: string | null;
        recurso_ref: string | null;
        completado: boolean;
      }[]
    >`
      select
        co.id, co.tipo, co.titulo, co.cuerpo, co.recurso_ref,
        coalesce(rp.completado, false) as completado
      from lxp.contenidos co
      left join lxp.reproduccion_progreso rp
        on rp.contenido_id = co.id and rp.alumno_id = ${userId}
      where co.leccion_id = ${leccionId}
      order by co.orden, co.created_at`;

    // Secuencia de lecciones del programa (orden módulo → lección) para vecinos.
    const secuencia = await sql<{ id: string; nombre: string }[]>`
      select l.id, l.nombre
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${leccion.programa_id}
      order by m.orden, l.orden, l.created_at`;

    const idx = secuencia.findIndex((s) => s.id === leccionId);
    const anterior: LeccionVecina | null = idx > 0 ? secuencia[idx - 1]! : null;
    const siguiente: LeccionVecina | null =
      idx >= 0 && idx < secuencia.length - 1 ? secuencia[idx + 1]! : null;

    const bloques: BloqueContenido[] = contenidos.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      cuerpo: c.cuerpo,
      recursoRef: c.recurso_ref,
      completado: c.completado,
    }));

    return {
      id: leccion.id,
      nombre: leccion.nombre,
      descripcion: leccion.descripcion,
      tipo: leccion.tipo,
      contexto: {
        programaId: leccion.programa_id,
        programa: leccion.programa,
        moduloId: leccion.modulo_id,
        modulo: leccion.modulo,
      },
      bloques,
      anterior,
      siguiente,
      completada: bloques.length > 0 && bloques.every((b) => b.completado),
    };
  });
}

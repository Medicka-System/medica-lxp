import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type { LeccionVecina } from './leccion-contrato';
import { normalizarConfigVideo, type LeccionVideo } from './leccion-video-contrato';

/**
 * Lectura de una lección tipo VIDEO del MODELO NUEVO (mig 0023). Corre con RLS vía
 * `comoAlumno`: lee `lxp.lecciones/modulos/programas` (read authenticated) y solo el
 * progreso propio (`reproduccion_progreso`). Sin lógica de dominio (§2).
 *
 * Devuelve `null` si la lección no existe, no es tipo `video`, o su programa no está
 * publicado — el `page.tsx` cae entonces al lector genérico (otros tipos). Así el
 * video queda AISLADO: no toca `getLeccion` ni el render de los demás tipos.
 */
export async function getLeccionVideo(
  userId: string,
  leccionId: string,
): Promise<LeccionVideo | null> {
  return comoAlumno(userId, async (sql) => {
    const cab = await sql<
      {
        id: string;
        nombre: string;
        descripcion: string | null;
        config: Record<string, unknown> | null;
        modulo_id: string;
        modulo: string;
        programa_id: string;
        programa: string;
      }[]
    >`
      select
        l.id, l.nombre, l.descripcion, l.config,
        m.id as modulo_id, m.nombre as modulo,
        pr.id as programa_id, pr.nombre as programa
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where l.id = ${leccionId} and pr.publicado and l.tipo = 'video'
      limit 1`;

    const leccion = cab[0];
    if (!leccion) return null;

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

    // Progreso: completada si hay una fila ANCLADA A LA LECCIÓN (modelo nuevo · mig
    // 0028, la que escribe "Marcar como vista") o, por compat, algún contenido puente
    // marcado. Siempre devuelve 1 fila.
    const prog = await sql<{ completada: boolean }[]>`
      select (
        exists (
          select 1 from lxp.reproduccion_progreso
          where leccion_id = ${leccionId} and alumno_id = ${userId} and completado
        )
        or exists (
          select 1
          from lxp.reproduccion_progreso rp
          join lxp.contenidos co on co.id = rp.contenido_id
          where co.leccion_id = ${leccionId} and rp.alumno_id = ${userId} and rp.completado
        )
      ) as completada`;

    return {
      id: leccion.id,
      nombre: leccion.nombre,
      descripcion: leccion.descripcion,
      contexto: {
        programaId: leccion.programa_id,
        programa: leccion.programa,
        moduloId: leccion.modulo_id,
        modulo: leccion.modulo,
      },
      video: normalizarConfigVideo(leccion.config),
      anterior,
      siguiente,
      completada: prog[0]?.completada ?? false,
    };
  });
}

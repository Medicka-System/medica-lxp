import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { comoTipoLeccion } from '@/lib/studio/leccion-tipos';
import {
  esLeccionInteractiva,
  type BloqueContenido,
  type ConfigLeccion,
  type ContenidoTipo,
  type LeccionCompleta,
  type LeccionVecina,
} from '@/lib/campus/leccion-contrato';

/**
 * Vista previa de una lección PARA STAFF (§5B). Es la MISMA forma de datos que ve el
 * alumno (`LeccionCompleta`) para poder reusar tal cual el render `LectorLeccion`,
 * pero con dos diferencias deliberadas del modo preview:
 *
 *   1. Corre con RLS vía `comoStaff` (no `comoAlumno`) y NO exige `programas.publicado`
 *      → el diseñador puede ver el BORRADOR tal como quedará antes de publicarlo.
 *   2. No hay progreso (el staff no es alumno): `completado`/`completada` = false.
 *
 * El gate de publicación sigue intacto para el alumno real: esta función solo es
 * alcanzable desde el route group (studio-editor), cuyo layout exige `requireAutoria`
 * (RBAC), y la RLS `es_staff()` es el segundo candado (§10). Un alumno jamás la toca.
 *
 * Sigue siendo lectura simple `web → Supabase` bajo RLS (Regla de Oro §2): NO pasa por
 * NestJS — reusa el mismo esquema que la lección del alumno, sin gate de publicado.
 */
export async function getLeccionPreview(
  userId: string,
  leccionId: string,
): Promise<LeccionCompleta | null> {
  return comoStaff(userId, async (sql) => {
    const cab = await sql<
      {
        id: string;
        nombre: string;
        descripcion: string | null;
        tipo: string;
        config: Record<string, unknown> | null;
        modulo_id: string;
        modulo: string;
        programa_id: string;
        programa: string;
      }[]
    >`
      select
        l.id, l.nombre, l.descripcion, l.tipo::text as tipo, l.config,
        m.id as modulo_id, m.nombre as modulo,
        pr.id as programa_id, pr.nombre as programa
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where l.id = ${leccionId}
      limit 1`;

    const leccion = cab[0];
    if (!leccion) return null;

    // Sin JOIN a reproduccion_progreso: en preview no hay progreso del staff.
    const contenidos = await sql<
      { id: string; tipo: ContenidoTipo; titulo: string; cuerpo: string | null; recurso_ref: string | null }[]
    >`
      select co.id, co.tipo, co.titulo, co.cuerpo, co.recurso_ref
      from lxp.contenidos co
      where co.leccion_id = ${leccionId}
      order by co.orden, co.created_at`;

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
      completado: false,
    }));

    // Modelo NUEVO: tipo + config (los interactivos h5p/xapi reproducen desde config).
    const tipo = comoTipoLeccion(leccion.tipo);
    const config = (leccion.config ?? {}) as ConfigLeccion;
    const compat = esLeccionInteractiva(tipo)
      ? contenidos.find((c) => c.tipo === tipo) ?? null
      : null;

    return {
      id: leccion.id,
      nombre: leccion.nombre,
      descripcion: leccion.descripcion,
      tipo,
      config,
      contenidoId: compat?.id ?? null,
      contexto: {
        programaId: leccion.programa_id,
        programa: leccion.programa,
        moduloId: leccion.modulo_id,
        modulo: leccion.modulo,
      },
      bloques,
      anterior,
      siguiente,
      completada: false,
    };
  });
}

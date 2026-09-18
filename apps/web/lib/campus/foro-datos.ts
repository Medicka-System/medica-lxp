import 'server-only';
import { comoAlumno } from '@/lib/db.server';

/**
 * Datos del FORO de una lección (actividad tipo `foro` · §1). Es la discusión
 * CERRADA del grupo: el alumno crea un post con el EditorRico y responde a otros.
 * Lectura con RLS vía `comoAlumno` (policy `foro_select`); CRUD directo (Regla de
 * Oro §2 — no pasa por NestJS).
 *
 * NOTA (§10, Sprint 9): la membresía real alumno↔grupo vive en CORA. Aquí el
 * `grupo_id` se resuelve al grupo que instancia el programa de la lección (mock
 * local); endurecerlo a la inscripción real es trabajo del sprint de seguridad.
 */

export type MensajeForo = {
  id: string;
  autorId: string;
  autor: string;
  /** HTML del EditorRico. */
  cuerpo: string;
  creadoEn: Date;
  esPropio: boolean;
  respuestas: MensajeForo[];
};

export type ForoData = {
  actividad: {
    id: string;
    titulo: string;
    instrucciones: string | null;
    leccion: string;
    modulo: string;
    programa: string;
  };
  /** Grupo destino para publicar (null si el programa aún no tiene grupos). */
  grupoId: string | null;
  yo: { userId: string; nombre: string };
  mensajes: MensajeForo[];
};

export async function getForo(
  userId: string,
  nombre: string,
  actividadId: string,
): Promise<ForoData | null> {
  return comoAlumno(userId, async (sql) => {
    const act = (
      await sql<
        {
          id: string;
          titulo: string;
          instrucciones: string | null;
          tipo: string;
          leccion: string;
          modulo: string;
          programa: string;
          programa_id: string;
        }[]
      >`
        select a.id, a.titulo, a.instrucciones, a.tipo::text as tipo,
               l.nombre as leccion, m.nombre as modulo,
               p.nombre as programa, p.id as programa_id
        from lxp.actividades a
        join lxp.lecciones l on l.id = a.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas p on p.id = m.programa_id
        where a.id = ${actividadId} and a.tipo = 'foro'
        limit 1`
    )[0];
    if (!act) return null;

    // Grupo destino: el que instancia este programa (mock · ver nota de cabecera).
    const grupo = (
      await sql<{ id: string }[]>`
        select id from lxp.grupos where programa_id = ${act.programa_id}
        order by created_at limit 1`
    )[0];

    const filas = await sql<
      {
        id: string;
        autor_id: string;
        autor: string | null;
        cuerpo: string;
        parent_id: string | null;
        created_at: Date;
      }[]
    >`
      select fm.id, fm.autor_id, lxp.nombre_de(fm.autor_id) as autor,
             fm.cuerpo, fm.parent_id, fm.created_at
      from lxp.foro_mensajes fm
      where fm.actividad_id = ${actividadId}
      order by fm.created_at asc`;

    // Arma el árbol: raíces (parent_id null) con sus respuestas directas.
    const porId = new Map<string, MensajeForo>();
    for (const f of filas) {
      porId.set(f.id, {
        id: f.id,
        autorId: f.autor_id,
        autor: f.autor ?? 'Alumno',
        cuerpo: f.cuerpo,
        creadoEn: f.created_at,
        esPropio: f.autor_id === userId,
        respuestas: [],
      });
    }
    const raices: MensajeForo[] = [];
    for (const f of filas) {
      const nodo = porId.get(f.id)!;
      if (f.parent_id && porId.has(f.parent_id)) porId.get(f.parent_id)!.respuestas.push(nodo);
      else raices.push(nodo);
    }

    return {
      actividad: {
        id: act.id,
        titulo: act.titulo,
        instrucciones: act.instrucciones,
        leccion: act.leccion,
        modulo: act.modulo,
        programa: act.programa,
      },
      grupoId: grupo?.id ?? null,
      yo: { userId, nombre },
      mensajes: raices,
    };
  });
}

import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import {
  comoConfigForo,
  estadoVentanaForo,
  type ModalidadForo,
  type ParticipacionForo,
  type VentanaForo,
} from '@/lib/studio/foro-config';

/**
 * Datos del FORO de una lección (actividad tipo `foro` · §1). Es la discusión
 * CERRADA del grupo: el alumno crea un post con el EditorRico y responde a otros.
 * Lectura con RLS vía `comoAlumno` (policy `foro_select`); CRUD directo (Regla de
 * Oro §2 — no pasa por NestJS).
 *
 * CONFIG DEL DISEÑADOR (§5C): una lección tipo `foro` guarda su configuración
 * (consigna, reglas, ventana, modalidad, valor) en `lxp.lecciones.config`. El motor
 * la LEE de ahí (fuente de verdad) uniendo la actividad de respaldo con su lección;
 * `actividades.instrucciones` queda solo como fallback de foros legacy sin config.
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
    /** Consigna en HTML (config del diseñador; fallback al texto legacy). */
    instrucciones: string | null;
    leccion: string;
    modulo: string;
    programa: string;
  };
  /** Config del diseñador que el motor honra (§5C). */
  config: {
    reglas: string[];
    modalidad: ModalidadForo;
    participacion: ParticipacionForo;
  };
  /** Ventana de apertura/cierre calculada al servir (hora del servidor). */
  ventana: VentanaForo;
  /** Grupo destino para publicar (null si el programa aún no tiene grupos). */
  grupoId: string | null;
  yo: { userId: string; nombre: string };
  mensajes: MensajeForo[];
};

/**
 * Foro DENTRO de la lección (§5C · foro-en-lección): resuelve la actividad de respaldo
 * (tipo foro) de una lección tipo `foro` y delega en `getForo`. Así el alumno ve la
 * MISMA discusión desde la lección, sin saltar a la ruta `/foro/[actividadId]`.
 */
export async function getForoDeLeccion(
  userId: string,
  nombre: string,
  leccionId: string,
): Promise<ForoData | null> {
  const actividadId = await comoAlumno(userId, async (sql) => {
    const r = await sql<{ id: string }[]>`
      select id from lxp.actividades
      where leccion_id = ${leccionId} and tipo = 'foro'
      order by orden, created_at
      limit 1`;
    return r[0]?.id ?? null;
  });
  if (!actividadId) return null;
  return getForo(userId, nombre, actividadId);
}

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
          config: Record<string, unknown> | null;
        }[]
      >`
        select a.id, a.titulo, a.instrucciones, a.tipo::text as tipo,
               l.nombre as leccion, m.nombre as modulo,
               p.nombre as programa, p.id as programa_id, l.config
        from lxp.actividades a
        join lxp.lecciones l on l.id = a.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas p on p.id = m.programa_id
        where a.id = ${actividadId} and a.tipo = 'foro'
        limit 1`
    )[0];
    if (!act) return null;

    // Config del diseñador (§5C). Consigna: la de la config (rica) o, si no hay,
    // el texto legacy de la actividad. Ventana: hora del servidor.
    const cfg = comoConfigForo(act.config);
    const instrucciones = cfg.instrucciones || act.instrucciones;
    const ventana = estadoVentanaForo(cfg, new Date());

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
        instrucciones,
        leccion: act.leccion,
        modulo: act.modulo,
        programa: act.programa,
      },
      config: {
        reglas: cfg.reglas,
        modalidad: cfg.modalidad,
        participacion: cfg.participacion,
      },
      ventana,
      grupoId: grupo?.id ?? null,
      yo: { userId, nombre },
      mensajes: raices,
    };
  });
}

import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { comoTareaConfig } from '@/lib/studio/tarea-contrato';

/**
 * Datos de la TAREA de una lección (lección tipo `tarea` · §5C) — lado del alumno.
 * Lee del MODELO NUEVO: la config del diseñador (lineamientos, rúbrica, valor, formato
 * de entrega) vive en `lxp.lecciones.config`; la rúbrica es una referencia al catálogo
 * (`lxp.rubricas`, familia `tareas`). Lectura con RLS vía `comoAlumno` (policies
 * `lecciones`/`rubricas`/`entregas` · true / id_alumno = auth.uid()).
 *
 * La ENTREGA se ancla en `entregas` por `leccion_id` (modelo nuevo · mig 0026) y por
 * `actividad_id` (respaldo, NOT NULL hasta fase 3). El `actividadId` se resuelve de la
 * config (`guardarTarea` lo puentea) o, en su defecto, leyendo la actividad `tarea` de
 * respaldo de la lección — así funciona tanto para tareas nuevas como legacy/seed.
 *
 * NOTA (§10, Sprint 9): la membresía real alumno↔grupo vive en CORA. Aquí el `grupoId`
 * se resuelve al grupo que instancia el programa de la lección (mock local · igual que
 * el foro); endurecerlo a la inscripción real es trabajo del sprint de seguridad.
 */

export type EstadoEntregaTarea = 'pendiente' | 'enviada' | 'calificada' | 'devuelta';

/** Criterio de rúbrica tal como lo ve el alumno (solo lectura, para saber cómo se evalúa). */
export type CriterioRubrica = { criterio: string; descripcion: string | null; peso: number | null };

export type EntregaTarea = {
  id: string;
  estado: EstadoEntregaTarea;
  /** Texto en línea que entregó el alumno (HTML del EditorRico), si lo hay. */
  texto: string | null;
  /** Archivo adjunto entregado (ref en object storage), si lo hay. */
  archivo: { key: string; nombre: string; tipo: string | null } | null;
  /** Nota asentada por el docente (0–10), null si aún no se califica. */
  nota: number | null;
  /** Feedback del docente, null si no hay. */
  feedback: string | null;
  creadaEn: Date;
};

export type TareaData = {
  leccionId: string;
  titulo: string;
  contexto: { programaId: string; programa: string; modulo: string };
  /** Lineamientos en HTML (config del diseñador). */
  lineamientos: string;
  valor: number | null;
  /** Formato de entrega esperado por el diseñador. */
  formato: 'archivo' | 'texto' | 'ambos';
  rubrica: { nombre: string; descripcion: string | null; criterios: CriterioRubrica[] } | null;
  /** Ancla de la entrega (actividad de respaldo). null si la tarea no tiene puente aún. */
  actividadId: string | null;
  /** Grupo destino de la entrega (null si el programa aún no tiene grupos). */
  grupoId: string | null;
  /** Entrega vigente del alumno (única por actividad×alumno), o null si no ha entregado. */
  entrega: EntregaTarea | null;
  /** Vecinas para continuar el recorrido de la lección. */
  anterior: { id: string } | null;
  siguiente: { id: string } | null;
};

/** Extrae el texto entregado del jsonb `contenido` (compat con el seed `nota_alumno`). */
function textoDe(contenido: Record<string, unknown> | null): string | null {
  if (!contenido) return null;
  const v = contenido.texto ?? contenido.nota_alumno ?? contenido.respuesta;
  return typeof v === 'string' && v.trim() ? v : null;
}

/** Extrae el archivo adjunto del jsonb `contenido`, si el alumno subió uno. */
function archivoDe(contenido: Record<string, unknown> | null): EntregaTarea['archivo'] {
  if (!contenido || typeof contenido.archivo !== 'object' || contenido.archivo === null) return null;
  const a = contenido.archivo as Record<string, unknown>;
  if (typeof a.key !== 'string' || !a.key) return null;
  return {
    key: a.key,
    nombre: typeof a.nombre === 'string' && a.nombre ? a.nombre : 'archivo',
    tipo: typeof a.tipo === 'string' ? a.tipo : null,
  };
}

export async function getTareaAlumno(
  userId: string,
  leccionId: string,
): Promise<TareaData | null> {
  return comoAlumno(userId, async (sql) => {
    const cab = (
      await sql<
        {
          id: string;
          nombre: string;
          tipo: string;
          config: Record<string, unknown> | null;
          modulo: string;
          programa: string;
          programa_id: string;
        }[]
      >`
        select l.id, l.nombre, l.tipo::text as tipo, l.config,
               m.nombre as modulo, pr.nombre as programa, pr.id as programa_id
        from lxp.lecciones l
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas pr on pr.id = m.programa_id
        where l.id = ${leccionId} and l.tipo = 'tarea' and pr.publicado
        limit 1`
    )[0];
    if (!cab) return null;

    const cfg = comoTareaConfig(cab.config);

    // Rúbrica del catálogo (solo lectura · rubricas_read = true). Puede no existir.
    const rub = cfg.rubricaId
      ? (
          await sql<
            { nombre: string; descripcion: string | null; criterios: unknown }[]
          >`
            select nombre, descripcion, criterios
            from lxp.rubricas where id = ${cfg.rubricaId} limit 1`
        )[0]
      : undefined;

    const rubrica = rub
      ? {
          nombre: rub.nombre,
          descripcion: rub.descripcion,
          criterios: (Array.isArray(rub.criterios) ? rub.criterios : []).map((c) => {
            const o = (c ?? {}) as Record<string, unknown>;
            return {
              criterio: typeof o.criterio === 'string' ? o.criterio : '',
              descripcion: typeof o.descripcion === 'string' ? o.descripcion : null,
              peso: typeof o.peso === 'number' ? o.peso : null,
            };
          }),
        }
      : null;

    // Ancla de la entrega: la de la config o la actividad `tarea` de respaldo (legacy/seed).
    let actividadId = cfg.actividadId ?? null;
    if (!actividadId) {
      actividadId =
        (
          await sql<{ id: string }[]>`
            select id from lxp.actividades
            where leccion_id = ${leccionId} and tipo = 'tarea'
            order by orden, created_at limit 1`
        )[0]?.id ?? null;
    }

    // Grupo destino: el que instancia este programa (mock · ver nota de cabecera).
    const grupoId =
      (
        await sql<{ id: string }[]>`
          select id from lxp.grupos where programa_id = ${cab.programa_id}
          order by created_at limit 1`
      )[0]?.id ?? null;

    // Entrega vigente del alumno (anclada por lección · única por actividad×alumno).
    const ent = (
      await sql<
        {
          id: string;
          estado: EstadoEntregaTarea;
          contenido: Record<string, unknown> | null;
          nota: number | null;
          feedback: string | null;
          created_at: Date;
        }[]
      >`
        select id, estado, contenido, nota::float8 as nota, feedback, created_at
        from lxp.entregas
        where id_alumno = ${userId} and (leccion_id = ${leccionId} or actividad_id = ${actividadId})
        order by created_at desc
        limit 1`
    )[0];

    const entrega: EntregaTarea | null = ent
      ? {
          id: ent.id,
          estado: ent.estado,
          texto: textoDe(ent.contenido),
          archivo: archivoDe(ent.contenido),
          nota: ent.nota,
          feedback: ent.feedback,
          creadaEn: ent.created_at,
        }
      : null;

    // Vecinas (orden módulo → lección) para continuar el recorrido.
    const secuencia = await sql<{ id: string }[]>`
      select l.id
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${cab.programa_id}
      order by m.orden, l.orden, l.created_at`;
    const idx = secuencia.findIndex((s) => s.id === leccionId);
    const anterior = idx > 0 ? { id: secuencia[idx - 1]!.id } : null;
    const siguiente = idx >= 0 && idx < secuencia.length - 1 ? { id: secuencia[idx + 1]!.id } : null;

    return {
      leccionId: cab.id,
      titulo: cab.nombre,
      contexto: { programaId: cab.programa_id, programa: cab.programa, modulo: cab.modulo },
      lineamientos: cfg.lineamientos ?? '',
      valor: typeof cfg.valor === 'number' ? cfg.valor : null,
      formato: cfg.entrega ?? 'archivo',
      rubrica,
      actividadId,
      grupoId,
      entrega,
      anterior,
      siguiente,
    };
  });
}

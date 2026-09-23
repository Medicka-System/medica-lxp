import 'server-only';
import { comoAlumno } from '@/lib/db.server';

/**
 * Datos de la Videoteca del alumno (Sprint 6 · re-cableado Fase 0).
 *
 * REAL (web → Supabase con RLS): los **videos instruccionales** salen de DOS fuentes,
 * unificadas:
 *   · Modelo NUEVO (mig 0023): lecciones con `tipo = 'video'`; su referencia en object
 *     storage vive en `lecciones.config->>'ref'`. Es la fuente preferente.
 *   · Modelo VIEJO (aún vivo): `lxp.contenidos` con `tipo = 'video'` (contenido previo).
 * La lectura corre como el alumno (`comoAlumno`), respetando RLS (`lecciones` y
 * `contenidos` son de lectura authenticated).
 *
 * Las **grabaciones de clases** (sesiones en vivo · Zoom → `ingesta-grabacion-zoom`, o
 * stream) viven en `lxp.videoteca` (mig 0017) con `origen in ('zoom','stream')` y se
 * leen aparte (`getGrabacionesClase`) para separarlas VISUALMENTE del contenido
 * instruccional de producción (§ Videoteca · dos colecciones distintas).
 *
 * PENDIENTE DE API (contratos en `../_components/reproductor.tsx`):
 *  - La **reproducción** necesita una URL firmada del servicio de media (`apps/api`);
 *    aquí solo viaja `recursoRef` (referencia en object storage).
 *  - El **scoping por inscripción** (qué programas/grupos ve cada alumno) vive en CORA y
 *    se endurece en el Sprint 11; hoy RLS permite leer el catálogo/grabaciones publicados.
 */

export type TipoContenido = 'video' | 'h5p' | 'scorm' | 'xapi' | 'texto' | 'quiz';

export type VideoInstruccional = {
  id: string;
  titulo: string;
  tipo: TipoContenido;
  /** Referencia en object storage; la URL firmada la emite `apps/api` (PENDIENTE). */
  recursoRef: string | null;
  programaId: string;
  programa: string;
  modulo: string;
  leccion: string;
  creadoEn: Date;
};

/** Programa con su conteo de videos, para las píldoras de filtro. */
export type ProgramaFiltro = { id: string; nombre: string; total: number };

export type VideotecaData = {
  videos: VideoInstruccional[];
  programas: ProgramaFiltro[];
};

export async function getVideoteca(userId: string): Promise<VideotecaData> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        titulo: string;
        tipo: TipoContenido;
        recurso_ref: string | null;
        created_at: Date;
        leccion: string;
        modulo: string;
        programa_id: string;
        programa: string;
      }[]
    >`
      -- Modelo NUEVO: lecciones tipo 'video' (ref en config->>'ref').
      select l.id, l.nombre as titulo, 'video'::text as tipo,
             nullif(l.config->>'ref', '') as recurso_ref, l.created_at,
             l.nombre as leccion, m.nombre as modulo,
             p.id as programa_id, p.nombre as programa,
             m.orden as m_orden, l.orden as l_orden, 0 as c_orden
      from lxp.lecciones l
      join lxp.modulos   m on m.id = l.modulo_id
      join lxp.programas p on p.id = m.programa_id
      where l.tipo = 'video'
      union all
      -- Modelo VIEJO: contenidos tipo 'video' (aún vivo).
      select c.id, c.titulo, c.tipo::text as tipo, c.recurso_ref, c.created_at,
             l.nombre as leccion, m.nombre as modulo,
             p.id as programa_id, p.nombre as programa,
             m.orden as m_orden, l.orden as l_orden, c.orden as c_orden
      from lxp.contenidos c
      join lxp.lecciones l on l.id = c.leccion_id
      join lxp.modulos   m on m.id = l.modulo_id
      join lxp.programas p on p.id = m.programa_id
      where c.tipo = 'video'
      order by programa asc, m_orden asc, l_orden asc, c_orden asc`;

    const videos: VideoInstruccional[] = rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      recursoRef: r.recurso_ref,
      programaId: r.programa_id,
      programa: r.programa,
      modulo: r.modulo,
      leccion: r.leccion,
      creadoEn: r.created_at,
    }));

    // Conteo por programa (para las píldoras de filtro), preservando el orden alfabético.
    const porPrograma = new Map<string, ProgramaFiltro>();
    for (const v of videos) {
      const prev = porPrograma.get(v.programaId);
      if (prev) prev.total += 1;
      else porPrograma.set(v.programaId, { id: v.programaId, nombre: v.programa, total: 1 });
    }

    return { videos, programas: [...porPrograma.values()] };
  });
}

/** Origen de una grabación de clase (sesión en vivo). */
export type OrigenGrabacion = 'zoom' | 'stream';

/**
 * Grabación de una clase EN VIVO que el alumno fue acumulando (no es contenido de
 * producción). Sale de `lxp.videoteca` con `origen in ('zoom','stream')`.
 */
export type GrabacionClase = {
  id: string;
  titulo: string;
  descripcion: string | null;
  origen: OrigenGrabacion;
  /** Grupo al que pertenece la sesión (null si aún no se ligó). */
  grupo: string | null;
  /** Lección asociada, si la grabación quedó ligada a una lección del programa. */
  leccion: string | null;
  duracionSeg: number | null;
  /** Referencia en object storage; la URL firmada la emite `apps/api` (PENDIENTE). */
  recursoRef: string | null;
  /** Fecha de la sesión (inicio programado de la clase, o alta de la grabación). */
  fecha: Date;
};

/**
 * Grabaciones de clases en vivo del alumno (`lxp.videoteca`, `origen in ('zoom','stream')`,
 * estado `listo`), leídas con RLS (`comoAlumno` · policy `videoteca_read`). Ordenadas de
 * la más reciente a la más antigua. Separadas del contenido instruccional a propósito.
 */
export async function getGrabacionesClase(userId: string): Promise<GrabacionClase[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        titulo: string;
        descripcion: string | null;
        origen: OrigenGrabacion;
        grupo: string | null;
        leccion: string | null;
        duracion_seg: number | null;
        recurso_ref: string | null;
        fecha: Date;
      }[]
    >`
      select v.id, v.titulo, v.descripcion, v.origen::text as origen,
             g.nombre as grupo, l.nombre as leccion,
             v.duracion_seg, v.recurso_ref,
             coalesce(cl.inicio_programado, v.created_at) as fecha
      from lxp.videoteca v
      left join lxp.grupos    g  on g.id  = v.grupo_id
      left join lxp.lecciones l  on l.id  = v.leccion_id
      left join lxp.clases    cl on cl.id = v.clase_id
      where v.origen in ('zoom', 'stream') and v.estado = 'listo'
      order by fecha desc nulls last, v.created_at desc`;

    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      descripcion: r.descripcion,
      origen: r.origen,
      grupo: r.grupo,
      leccion: r.leccion,
      duracionSeg: r.duracion_seg,
      recursoRef: r.recurso_ref,
      fecha: r.fecha,
    }));
  });
}

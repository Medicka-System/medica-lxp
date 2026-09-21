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
 * PENDIENTE DE API (contratos en `../_components/reproductor.tsx`):
 *  - La **reproducción** necesita una URL firmada del servicio de media (`apps/api`);
 *    aquí solo viaja `recursoRef` (referencia en object storage).
 *  - Las **grabaciones de clases** (Zoom → `ingesta-grabacion-zoom`) viven en su propia
 *    tabla `lxp.videoteca` (mig 0017); su galería se integra por separado (PENDIENTE).
 *  - El **scoping por inscripción** (qué programas ve cada alumno) vive en CORA y se
 *    endurece en el Sprint 11; hoy RLS permite leer el catálogo publicado.
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

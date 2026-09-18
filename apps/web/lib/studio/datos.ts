import 'server-only';
import { comoStaff } from '@/lib/db.server';

/**
 * Lecturas del Studio (autoría · §5B). TODAS corren con RLS vía `comoStaff`: las
 * policies `lxp.es_autoria()` deciden qué ve/escribe el staff, igual que en
 * producción. Devuelven datos ya listos para la UI (sin lógica de dominio · §2).
 */

// ── Programas (lista / course builder) ─────────────────────────────────────────
export type EstadoPrograma = 'publicado' | 'borrador';

export type ProgramaResumen = {
  id: string;
  nombre: string;
  horas: number;
  modulos: number;
  gruposActivos: number;
  estado: EstadoPrograma;
  version: number;
  actualizado: Date;
};

export async function getProgramas(userId: string): Promise<ProgramaResumen[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        nombre: string;
        publicado: boolean;
        version: number;
        updated_at: Date;
        horas: number;
        modulos: number;
        grupos: number;
      }[]
    >`
      select
        p.id, p.nombre, p.publicado, p.version, p.updated_at,
        coalesce(m.horas, 0)::float8 as horas,
        coalesce(m.modulos, 0)::int  as modulos,
        coalesce(g.grupos, 0)::int   as grupos
      from lxp.programas p
      left join (
        select programa_id, sum(horas) as horas, count(*) as modulos
        from lxp.modulos group by programa_id
      ) m on m.programa_id = p.id
      left join (
        select programa_id, count(*) as grupos
        from lxp.grupos group by programa_id
      ) g on g.programa_id = p.id
      order by p.updated_at desc`;

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      horas: Math.round(r.horas),
      modulos: r.modulos,
      gruposActivos: r.grupos,
      estado: r.publicado ? 'publicado' : 'borrador',
      version: r.version,
      actualizado: r.updated_at,
    }));
  });
}

// ── Builder de un programa (árbol completo) ────────────────────────────────────
/** Tipos de bloque del builder (§5B): contenido (video/teoría/H5P) + actividad. */
export type TipoBloque = 'video' | 'teoria' | 'h5p' | 'autoevaluacion' | 'tarea' | 'foro';

/** Un bloque es una fila de `contenidos` O de `actividades`; se distinguen por `fuente`. */
export type Bloque = {
  id: string;
  fuente: 'contenido' | 'actividad';
  tipo: TipoBloque;
  titulo: string;
  meta: string;
  orden: number;
};

export type Leccion = { id: string; titulo: string; orden: number; bloques: Bloque[] };
export type Modulo = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  orden: number;
  lecciones: Leccion[];
};

export type ProgramaBuilder = {
  id: string;
  nombre: string;
  estado: EstadoPrograma;
  version: number;
  gruposActivos: number;
  actualizado: Date;
  totales: { modulos: number; horas: number; lecciones: number; bloques: number };
  modulos: Modulo[];
};

/** contenido_tipo (BD) → tipo de bloque del builder. */
const CONTENIDO_A_BLOQUE: Record<string, TipoBloque> = {
  video: 'video',
  texto: 'teoria',
  h5p: 'h5p',
  scorm: 'h5p',
  xapi: 'h5p',
  quiz: 'autoevaluacion',
};

export async function getProgramaBuilder(
  userId: string,
  programaId: string,
): Promise<ProgramaBuilder | null> {
  return comoStaff(userId, async (sql) => {
    const prog = (
      await sql<
        {
          id: string;
          nombre: string;
          publicado: boolean;
          version: number;
          updated_at: Date;
          grupos: number;
        }[]
      >`
        select p.id, p.nombre, p.publicado, p.version, p.updated_at,
               coalesce((select count(*) from lxp.grupos g where g.programa_id = p.id), 0)::int as grupos
        from lxp.programas p where p.id = ${programaId} limit 1`
    )[0];
    if (!prog) return null;

    const modulos = await sql<
      { id: string; nombre: string; orden: number; horas: number }[]
    >`
      select id, nombre, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${programaId} order by orden, created_at`;

    const moduloIds = modulos.map((m) => m.id);
    const lecciones = moduloIds.length
      ? await sql<{ id: string; modulo_id: string; nombre: string; orden: number }[]>`
          select id, modulo_id, nombre, orden from lxp.lecciones
          where modulo_id in ${sql(moduloIds)} order by orden, created_at`
      : [];

    const leccionIds = lecciones.map((l) => l.id);
    const contenidos = leccionIds.length
      ? await sql<
          { id: string; leccion_id: string; tipo: string; titulo: string; orden: number }[]
        >`
          select id, leccion_id, tipo::text as tipo, titulo, orden from lxp.contenidos
          where leccion_id in ${sql(leccionIds)} order by orden, created_at`
      : [];
    const actividades = leccionIds.length
      ? await sql<
          { id: string; leccion_id: string; tipo: string; titulo: string; orden: number }[]
        >`
          select id, leccion_id, tipo::text as tipo, titulo, orden from lxp.actividades
          where leccion_id in ${sql(leccionIds)} order by orden, created_at`
      : [];

    // Ensambla bloques por lección (contenidos + actividades unidos por `orden`).
    const bloquesPorLeccion = new Map<string, Bloque[]>();
    for (const c of contenidos) {
      const arr = bloquesPorLeccion.get(c.leccion_id) ?? [];
      arr.push({
        id: c.id,
        fuente: 'contenido',
        tipo: CONTENIDO_A_BLOQUE[c.tipo] ?? 'teoria',
        titulo: c.titulo,
        meta: metaContenido(c.tipo),
        orden: c.orden,
      });
      bloquesPorLeccion.set(c.leccion_id, arr);
    }
    for (const a of actividades) {
      const arr = bloquesPorLeccion.get(a.leccion_id) ?? [];
      arr.push({
        id: a.id,
        fuente: 'actividad',
        tipo: (a.tipo as TipoBloque) ?? 'tarea',
        titulo: a.titulo,
        meta: metaActividad(a.tipo),
        orden: a.orden,
      });
      bloquesPorLeccion.set(a.leccion_id, arr);
    }
    for (const arr of bloquesPorLeccion.values()) arr.sort((x, y) => x.orden - y.orden);

    const leccionesPorModulo = new Map<string, Leccion[]>();
    for (const l of lecciones) {
      const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
      arr.push({
        id: l.id,
        titulo: l.nombre,
        orden: l.orden,
        bloques: bloquesPorLeccion.get(l.id) ?? [],
      });
      leccionesPorModulo.set(l.modulo_id, arr);
    }

    const modulosArmados: Modulo[] = modulos.map((m, i) => ({
      id: m.id,
      clave: String(i + 1).padStart(2, '0'),
      titulo: m.nombre,
      horas: Math.round(m.horas),
      orden: m.orden,
      lecciones: leccionesPorModulo.get(m.id) ?? [],
    }));

    const totalBloques = contenidos.length + actividades.length;

    return {
      id: prog.id,
      nombre: prog.nombre,
      estado: prog.publicado ? 'publicado' : 'borrador',
      version: prog.version,
      gruposActivos: prog.grupos,
      actualizado: prog.updated_at,
      totales: {
        modulos: modulos.length,
        horas: Math.round(modulos.reduce((s, m) => s + m.horas, 0)),
        lecciones: lecciones.length,
        bloques: totalBloques,
      },
      modulos: modulosArmados,
    };
  });
}

function metaContenido(tipo: string): string {
  return {
    video: 'Cine-loop o video',
    texto: 'Lectura',
    h5p: 'H5P interactivo',
    scorm: 'Paquete SCORM',
    xapi: 'Paquete xAPI',
    quiz: 'Quiz',
  }[tipo] ?? 'Contenido';
}

function metaActividad(tipo: string): string {
  return {
    tarea: 'se acredita al validar',
    autoevaluacion: 'autoevaluación',
    foro: 'discusión cerrada del grupo',
  }[tipo] ?? 'actividad';
}

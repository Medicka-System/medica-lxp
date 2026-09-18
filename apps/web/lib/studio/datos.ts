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

// ── Grupos (instancias de un programa · herencia §6) ───────────────────────────
export type ModalidadGrupo = 'sincrono' | 'asincrono';
export type EstadoGrupo = 'proximo' | 'curso' | 'finalizado';

export type GrupoResumen = {
  id: string;
  nombre: string;
  programaId: string;
  programaNombre: string;
  programaVersion: number;
  modalidad: ModalidadGrupo;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  docente: string | null;
  overrides: number;
  estado: EstadoGrupo;
};

/** Estado del grupo a partir de sus fechas (asíncrono = siempre en curso). */
function estadoDeGrupo(inicio: Date | null, fin: Date | null, hoy: Date): EstadoGrupo {
  if (inicio && inicio > hoy) return 'proximo';
  if (fin && fin < hoy) return 'finalizado';
  return 'curso';
}

export async function getGrupos(userId: string): Promise<GrupoResumen[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        nombre: string;
        modalidad: ModalidadGrupo;
        fecha_inicio: Date | null;
        fecha_fin: Date | null;
        programa_id: string;
        programa_nombre: string;
        programa_version: number;
        docente: string | null;
        overrides: number;
      }[]
    >`
      select
        g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin,
        g.programa_id, p.nombre as programa_nombre, p.version as programa_version,
        lxp.nombre_de(g.docente_id) as docente,
        coalesce((select count(*) from lxp.grupo_overrides o where o.grupo_id = g.id), 0)::int as overrides
      from lxp.grupos g
      join lxp.programas p on p.id = g.programa_id
      order by g.created_at desc`;

    const hoy = new Date();
    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      programaId: r.programa_id,
      programaNombre: r.programa_nombre,
      programaVersion: r.programa_version,
      modalidad: r.modalidad,
      fechaInicio: r.fecha_inicio,
      fechaFin: r.fecha_fin,
      docente: r.docente,
      overrides: r.overrides,
      estado: estadoDeGrupo(r.fecha_inicio, r.fecha_fin, hoy),
    }));
  });
}

/** Docentes disponibles para asignar a un grupo (RLS: staff ve todos los perfiles). */
export async function getDocentes(userId: string): Promise<{ userId: string; nombre: string }[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<{ user_id: string; nombre: string }[]>`
      select user_id, nombre from lxp.perfiles where rol = 'docente' order by nombre`;
    return rows.map((r) => ({ userId: r.user_id, nombre: r.nombre }));
  });
}

/** Un nodo del temario del grupo con su marca de herencia (cruda, desde grupo_overrides). */
export type NodoLeccionGrupo = { id: string; titulo: string; personalizado: boolean };
export type NodoModuloGrupo = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  personalizado: boolean;
  lecciones: NodoLeccionGrupo[];
};

export type OverrideCrudo = {
  id: string;
  entidad: string;
  entidadId: string;
  creadoEn: Date;
};

export type GrupoDetalle = {
  id: string;
  nombre: string;
  modalidad: ModalidadGrupo;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  estado: EstadoGrupo;
  docenteId: string | null;
  programa: { id: string; nombre: string; version: number; publicado: boolean };
  totales: { modulos: number; horas: number; lecciones: number };
  temario: NodoModuloGrupo[];
  overrides: OverrideCrudo[];
};

export async function getGrupoDetalle(
  userId: string,
  grupoId: string,
): Promise<GrupoDetalle | null> {
  return comoStaff(userId, async (sql) => {
    const g = (
      await sql<
        {
          id: string;
          nombre: string;
          modalidad: ModalidadGrupo;
          fecha_inicio: Date | null;
          fecha_fin: Date | null;
          docente_id: string | null;
          programa_id: string;
          programa_nombre: string;
          programa_version: number;
          programa_publicado: boolean;
        }[]
      >`
        select g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin, g.docente_id,
               p.id as programa_id, p.nombre as programa_nombre,
               p.version as programa_version, p.publicado as programa_publicado
        from lxp.grupos g
        join lxp.programas p on p.id = g.programa_id
        where g.id = ${grupoId} limit 1`
    )[0];
    if (!g) return null;

    const modulos = await sql<{ id: string; nombre: string; orden: number; horas: number }[]>`
      select id, nombre, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${g.programa_id} order by orden, created_at`;
    const moduloIds = modulos.map((m) => m.id);
    const lecciones = moduloIds.length
      ? await sql<{ id: string; modulo_id: string; nombre: string; orden: number }[]>`
          select id, modulo_id, nombre, orden from lxp.lecciones
          where modulo_id in ${sql(moduloIds)} order by orden, created_at`
      : [];

    const overrides = await sql<
      { id: string; entidad: string; entidad_id: string; created_at: Date }[]
    >`
      select id, entidad, entidad_id, created_at
      from lxp.grupo_overrides where grupo_id = ${grupoId} order by created_at`;
    // Set de entidades personalizadas (marca cruda: existe un override → personalizado).
    const personalizados = new Set(overrides.map((o) => o.entidad_id));

    const leccionesPorModulo = new Map<string, NodoLeccionGrupo[]>();
    for (const l of lecciones) {
      const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
      arr.push({ id: l.id, titulo: l.nombre, personalizado: personalizados.has(l.id) });
      leccionesPorModulo.set(l.modulo_id, arr);
    }

    const hoy = new Date();
    return {
      id: g.id,
      nombre: g.nombre,
      modalidad: g.modalidad,
      fechaInicio: g.fecha_inicio,
      fechaFin: g.fecha_fin,
      estado: estadoDeGrupo(g.fecha_inicio, g.fecha_fin, hoy),
      docenteId: g.docente_id,
      programa: {
        id: g.programa_id,
        nombre: g.programa_nombre,
        version: g.programa_version,
        publicado: g.programa_publicado,
      },
      totales: {
        modulos: modulos.length,
        horas: Math.round(modulos.reduce((s, m) => s + m.horas, 0)),
        lecciones: lecciones.length,
      },
      temario: modulos.map((m, i) => ({
        id: m.id,
        clave: String(i + 1).padStart(2, '0'),
        titulo: m.nombre,
        horas: Math.round(m.horas),
        personalizado: personalizados.has(m.id),
        lecciones: leccionesPorModulo.get(m.id) ?? [],
      })),
      overrides: overrides.map((o) => ({
        id: o.id,
        entidad: o.entidad,
        entidadId: o.entidad_id,
        creadoEn: o.created_at,
      })),
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

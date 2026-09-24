import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { firmarLecturaImagenes, firmarLecturaImagen } from '@/lib/media/firmar-imagenes.server';
import type {
  Recurso,
  RecursoDetalle,
  TipoRecurso,
  UsoRecurso,
} from '@/lib/studio/contenido-contrato';
import type { CasoEditor, CasoResumen, DominioIaim } from '@/lib/studio/casos-contrato';
import { comoTipoLeccion, type BloqueTeoria, type TipoLeccion } from '@/lib/studio/leccion-tipos';

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
/**
 * Tipos de bloque del modelo VIEJO (contenidos/actividades). Se conserva solo para
 * las acciones legacy de `acciones.ts` que aún tocan esas tablas (el reader del
 * alumno las lee). El builder nuevo NO usa este tipo: cada lección tiene su `tipo`
 * (`TipoLeccion`) y su contenido vive en `bloques` (teoría) o `config` (§5C · mig 0023).
 */
export type TipoBloque = 'video' | 'teoria' | 'h5p' | 'autoevaluacion' | 'tarea' | 'foro';

/** Una lección MONO-TIPO (§5C · mig 0023): su `tipo` decide qué editor la abre. */
export type Leccion = {
  id: string;
  titulo: string;
  orden: number;
  horas: number;
  tipo: TipoLeccion;
  /** Config de los tipos config-backed (video/autoeval/tarea/foro/h5p/xapi). {} en teoría. */
  config: Record<string, unknown>;
  /** Bloques ordenables de teoría (lxp.bloques). Vacío en tipos config-backed. */
  bloques: BloqueTeoria[];
};
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
      ? await sql<
          {
            id: string;
            modulo_id: string;
            nombre: string;
            orden: number;
            horas: number;
            tipo: string;
            config: Record<string, unknown>;
          }[]
        >`
          select id, modulo_id, nombre, orden, horas::float8 as horas,
                 tipo::text as tipo, config
          from lxp.lecciones
          where modulo_id in ${sql(moduloIds)} order by orden, created_at`
      : [];

    const leccionIds = lecciones.map((l) => l.id);
    // Bloques de las lecciones tipo `teoria` (lxp.bloques · mig 0023). El resto de
    // tipos guarda su contenido en `lecciones.config` (no hay filas aquí).
    const bloques = leccionIds.length
      ? await sql<
          {
            id: string;
            leccion_id: string;
            orden: number;
            tipo_bloque: string;
            config: Record<string, unknown>;
          }[]
        >`
          select id, leccion_id, orden, tipo_bloque, config from lxp.bloques
          where leccion_id in ${sql(leccionIds)} order by orden, created_at`
      : [];

    const bloquesPorLeccion = new Map<string, BloqueTeoria[]>();
    for (const b of bloques) {
      const arr = bloquesPorLeccion.get(b.leccion_id) ?? [];
      arr.push({ id: b.id, orden: b.orden, tipoBloque: b.tipo_bloque, config: b.config ?? {} });
      bloquesPorLeccion.set(b.leccion_id, arr);
    }

    const leccionesPorModulo = new Map<string, Leccion[]>();
    for (const l of lecciones) {
      const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
      arr.push({
        id: l.id,
        titulo: l.nombre,
        orden: l.orden,
        horas: l.horas,
        tipo: comoTipoLeccion(l.tipo),
        config: l.config ?? {},
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

    // "Bloques" del programa = bloques de teoría (lxp.bloques). Los tipos
    // config-backed no aportan filas: su contenido vive en lecciones.config.
    const totalBloques = bloques.length;

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
  /** Alumnos inscritos (CORA, vía puente `cora_conteo_alumnos` · §10). */
  alumnos: number;
  estado: EstadoGrupo;
  /** URL firmada de la portada del grupo (null → placeholder). */
  portadaUrl: string | null;
};

/** Estado del grupo a partir de sus fechas (asíncrono = siempre en curso). */
function estadoDeGrupo(inicio: Date | null, fin: Date | null, hoy: Date): EstadoGrupo {
  if (inicio && inicio > hoy) return 'proximo';
  if (fin && fin < hoy) return 'finalizado';
  return 'curso';
}

export async function getGrupos(userId: string): Promise<GrupoResumen[]> {
  return comoStaff(userId, async (sql) => {
    const [rows, conteos] = await Promise.all([
      sql<
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
          cora_grupo_id: string | null;
          imagen_portada: string | null;
        }[]
      >`
        select
          g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin,
          g.programa_id, p.nombre as programa_nombre, p.version as programa_version,
          lxp.nombre_de(g.docente_id) as docente, g.cora_grupo_id, g.imagen_portada,
          coalesce((select count(*) from lxp.grupo_overrides o where o.grupo_id = g.id), 0)::int as overrides
        from lxp.grupos g
        join lxp.programas p on p.id = g.programa_id
        order by g.created_at desc`,
      // Roster de CORA por grupo (una sola query · puente SECDEF, gated a staff · §10).
      sql<{ cora_grupo_id: string; alumnos: number }[]>`
        select cora_grupo_id, alumnos from lxp.cora_conteo_alumnos()`,
    ]);

    const alumnosPorCora = new Map(conteos.map((c) => [c.cora_grupo_id, c.alumnos]));
    // Firma las portadas en un solo lote (ref → url); las que no tienen quedan sin URL.
    const portadas = await firmarLecturaImagenes(rows.map((r) => r.imagen_portada));
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
      alumnos: r.cora_grupo_id ? (alumnosPorCora.get(r.cora_grupo_id) ?? 0) : 0,
      estado: estadoDeGrupo(r.fecha_inicio, r.fecha_fin, hoy),
      portadaUrl: r.imagen_portada ? (portadas[r.imagen_portada] ?? null) : null,
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
  /** Ref de storage de la portada del grupo (para saber si hay una). */
  imagenPortadaRef: string | null;
  /** URL firmada de la portada (preview en el editor · null si no hay). */
  portadaUrl: string | null;
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
          imagen_portada: string | null;
        }[]
      >`
        select g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin, g.docente_id,
               g.imagen_portada,
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
      imagenPortadaRef: g.imagen_portada,
      portadaUrl: await firmarLecturaImagen(g.imagen_portada),
    };
  });
}

// ── Roster + avance de un grupo (§5B) ──────────────────────────────────────────
// El roster viene de CORA vía el puente SECDEF `cora_alumnos_de_grupo` (§10, gated a
// staff); el avance se calcula del progreso real del alumno (reproduccion_progreso,
// que el staff lee bajo RLS · 0017). Nada se escribe en `public`.
export type AlumnoDeGrupo = {
  userId: string;
  nombre: string;
  matricula: string | null;
  /** Lecciones completadas / total de lecciones del programa. */
  completadas: number;
  totalLecciones: number;
  avancePct: number;
};

export async function getGrupoAlumnos(
  userId: string,
  grupoId: string,
): Promise<AlumnoDeGrupo[]> {
  return comoStaff(userId, async (sql) => {
    const g = (
      await sql<{ programa_id: string; cora_grupo_id: string | null }[]>`
        select programa_id, cora_grupo_id from lxp.grupos where id = ${grupoId} limit 1`
    )[0];
    if (!g || !g.cora_grupo_id) return [];

    // Roster desde CORA (solo staff obtiene filas · §10).
    const roster = await sql<{ supabase_auth_id: string; nombre: string; matricula: string | null }[]>`
      select supabase_auth_id, nombre, matricula
      from lxp.cora_alumnos_de_grupo(${g.cora_grupo_id})`;
    if (roster.length === 0) return [];

    // Total de lecciones del programa (denominador del avance).
    const total =
      (
        await sql<{ n: number }[]>`
          select count(*)::int as n
          from lxp.lecciones l
          join lxp.modulos m on m.id = l.modulo_id
          where m.programa_id = ${g.programa_id}`
      )[0]?.n ?? 0;

    // Lecciones completadas por alumno (staff lee todo · reproduccion_progreso_select).
    const ids = roster.map((r) => r.supabase_auth_id);
    const progreso = await sql<{ alumno_id: string; n: number }[]>`
      select rp.alumno_id, count(distinct rp.leccion_id)::int as n
      from lxp.reproduccion_progreso rp
      join lxp.lecciones l on l.id = rp.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${g.programa_id}
        and rp.completado
        and rp.alumno_id in ${sql(ids)}
      group by rp.alumno_id`;
    const completadasPor = new Map(progreso.map((p) => [p.alumno_id, p.n]));

    return roster.map((r): AlumnoDeGrupo => {
      const completadas = completadasPor.get(r.supabase_auth_id) ?? 0;
      return {
        userId: r.supabase_auth_id,
        nombre: r.nombre,
        matricula: r.matricula,
        completadas,
        totalLecciones: total,
        avancePct: total > 0 ? Math.round((100 * completadas) / total) : 0,
      };
    });
  });
}

// ── Herramientas (administración · plantillas/calculadoras/simuladores) ─────────
export type TipoHerramienta = 'plantillas' | 'calculadoras' | 'simuladores';
export type HerramientaItem = { id: string; nombre: string; submeta: string; publicado: boolean };
export type ConteosHerramientas = Record<TipoHerramienta, number>;

export async function getConteosHerramientas(userId: string): Promise<ConteosHerramientas> {
  return comoStaff(userId, async (sql) => {
    const p = await sql<{ n: number }[]>`select count(*)::int as n from lxp.plantillas_reporte`;
    const c = await sql<{ n: number }[]>`select count(*)::int as n from lxp.calculadoras`;
    const s = await sql<{ n: number }[]>`select count(*)::int as n from lxp.simuladores`;
    return { plantillas: p[0]?.n ?? 0, calculadoras: c[0]?.n ?? 0, simuladores: s[0]?.n ?? 0 };
  });
}

export async function getHerramientas(
  userId: string,
  tipo: TipoHerramienta,
): Promise<HerramientaItem[]> {
  return comoStaff(userId, async (sql) => {
    if (tipo === 'plantillas') {
      const rows = await sql<{ id: string; nombre: string; tipo_estudio: string | null; publicado: boolean }[]>`
        select id, nombre, tipo_estudio, publicado from lxp.plantillas_reporte
        order by publicado, created_at desc`;
      return rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        submeta: r.tipo_estudio ? `Estudio: ${r.tipo_estudio}` : 'Sin tipo de estudio',
        publicado: r.publicado,
      }));
    }
    if (tipo === 'calculadoras') {
      const rows = await sql<{ id: string; nombre: string; clave: string; publicado: boolean }[]>`
        select id, nombre, clave, publicado from lxp.calculadoras order by publicado, created_at desc`;
      return rows.map((r) => ({ id: r.id, nombre: r.nombre, submeta: r.clave, publicado: r.publicado }));
    }
    const rows = await sql<{ id: string; nombre: string; tipo: string; publicado: boolean }[]>`
      select id, nombre, tipo::text as tipo, publicado from lxp.simuladores order by publicado, created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      submeta: r.tipo === 'reporte' ? 'Simulador de reporte' : 'Simulador de interpretación',
      publicado: r.publicado,
    }));
  });
}

// ── Casos (curaduría del banco · lxp.casos_biblioteca) ─────────────────────────
/** Normaliza un jsonb (string[] o [{texto}]) a lista de textos para la UI. */
function aTextos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === 'string'
        ? x
        : x && typeof x === 'object' && 'texto' in x
          ? String((x as { texto: unknown }).texto)
          : '',
    )
    .filter(Boolean);
}

export async function getCasos(userId: string): Promise<CasoResumen[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        titulo: string;
        organo: string | null;
        dominio_iaim: DominioIaim | null;
        hallazgos_clave: unknown;
        puntos_aprendizaje: unknown;
        publicado: boolean;
        curador: string | null;
        created_at: Date;
      }[]
    >`
      select id, titulo, organo, dominio_iaim, hallazgos_clave, puntos_aprendizaje,
             publicado, lxp.nombre_de(curador_id) as curador, created_at
      from lxp.casos_biblioteca
      order by publicado, created_at desc`;

    return rows.map((r): CasoResumen => {
      const hallazgos = aTextos(r.hallazgos_clave);
      const puntos = aTextos(r.puntos_aprendizaje);
      return {
        id: r.id,
        titulo: r.titulo,
        organo: r.organo,
        dominio: r.dominio_iaim,
        estado: r.publicado ? 'biblioteca' : 'por_curar',
        curador: r.curador,
        verdadCompleta: hallazgos.length >= 3 && puntos.length >= 2,
        cuando: r.created_at,
      };
    });
  });
}

export async function getCasoEditor(userId: string, casoId: string): Promise<CasoEditor | null> {
  return comoStaff(userId, async (sql) => {
    const r = (
      await sql<
        {
          id: string;
          titulo: string;
          organo: string | null;
          patologia: string | null;
          dominio_iaim: DominioIaim | null;
          tecnica: string | null;
          equipo: string | null;
          vineta: string | null;
          etiquetas: unknown;
          diagnostico_correcto: string | null;
          hallazgos_clave: unknown;
          puntos_aprendizaje: unknown;
          errores_comunes: unknown;
          publicado: boolean;
          estudio_estado: import('./casos-contrato').EstudioEstadoCaso;
          series: number;
          curador: string | null;
          contenido_estructurado: import('@campus/shared').ContenidoEstructuradoCaso | null;
          modulo_id: string | null;
        }[]
      >`
        select id, titulo, organo, patologia, dominio_iaim, tecnica, equipo, vineta,
               etiquetas, diagnostico_correcto,
               hallazgos_clave, puntos_aprendizaje, errores_comunes,
               contenido_estructurado, modulo_id,
               publicado, estudio_estado::text as estudio_estado,
               coalesce(jsonb_array_length(estudio_series), 0)::int as series,
               lxp.nombre_de(curador_id) as curador
        from lxp.casos_biblioteca where id = ${casoId} limit 1`
    )[0];
    if (!r) return null;
    return {
      id: r.id,
      titulo: r.titulo,
      organo: r.organo ?? '',
      patologia: r.patologia ?? '',
      dominioIaim: r.dominio_iaim,
      tecnica: r.tecnica ?? '',
      equipo: r.equipo ?? '',
      vineta: r.vineta ?? '',
      etiquetas: aTextos(r.etiquetas),
      diagnostico: r.diagnostico_correcto ?? '',
      hallazgosClave: aTextos(r.hallazgos_clave),
      puntosAprendizaje: aTextos(r.puntos_aprendizaje),
      erroresComunes: aTextos(r.errores_comunes),
      publicado: r.publicado,
      tieneDicom: r.estudio_estado === 'anonimizado',
      estudioEstado: r.estudio_estado,
      series: r.series,
      curador: r.curador,
      contenidoEstructurado: r.contenido_estructurado ?? null,
      moduloId: r.modulo_id ?? null,
    };
  });
}

/**
 * Catálogo de módulos para el dropdown de curaduría (§5B): el docente asigna el caso a
 * su módulo. De programas PUBLICADOS, agrupado por programa. RLS: lectura de módulos es
 * true para staff. (Acotar al programa del grupo llega con el contrato CORA · Sprint 11.)
 */
export async function getModulosCatalogo(
  userId: string,
): Promise<import('./casos-contrato').ModuloOpcionCaso[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<{ id: string; nombre: string; programa: string }[]>`
      select m.id, m.nombre, pr.nombre as programa
      from lxp.modulos m
      join lxp.programas pr on pr.id = m.programa_id
      where pr.publicado
      order by pr.nombre, m.orden`;
    return rows.map((r) => ({ id: r.id, nombre: r.nombre, programa: r.programa }));
  });
}

// ── Contenido (biblioteca reutilizable · PENDIENTE DE DB — ver contenido-contrato) ──
/** Error de Postgres "relación no existe" (la tabla lxp.recursos aún no se creó). */
function esTablaInexistente(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '42P01';
}

type MetaRecurso = Record<string, string | number | undefined>;

function textoMeta(tipo: TipoRecurso, meta: MetaRecurso): string {
  const m = meta ?? {};
  switch (tipo) {
    case 'video':
      return [m.duracion, m.resolucion].filter(Boolean).join(' · ') || 'Video';
    case 'scorm':
      return m.version_scorm ? `SCORM ${m.version_scorm}` : 'SCORM';
    case 'xapi':
      return m.fuente ? `xAPI · ${m.fuente}` : 'xAPI · Articulate';
    case 'pdf':
      return m.paginas ? `PDF · ${m.paginas} págs` : 'PDF';
    case 'word':
      return m.paginas ? `DOCX · ${m.paginas} págs` : 'DOCX';
    case 'ppt':
      return m.diapositivas ? `PPTX · ${m.diapositivas} diapositivas` : 'PPTX';
    case 'h5p':
      return m.items ? `${m.items} ítems · interactivo` : 'H5P interactivo';
    case 'imagen':
      return m.dimensiones ? `Imagen · ${m.dimensiones}` : 'Imagen';
    default:
      return '';
  }
}

export type BibliotecaContenido = { pendienteDb: boolean; recursos: Recurso[] };

export async function getRecursos(userId: string): Promise<BibliotecaContenido> {
  try {
    const recursos = await comoStaff(userId, async (sql) => {
      const rows = await sql<
        {
          id: string;
          tipo: TipoRecurso;
          nombre: string;
          meta: MetaRecurso;
          reproduccion: string | null;
          etiquetas: string[];
          procesando: boolean;
          progreso: number | null;
          created_at: Date;
          usos: number;
          programas: number;
        }[]
      >`
        select r.id, r.tipo::text as tipo, r.nombre, r.meta, r.reproduccion, r.etiquetas,
               r.procesando, r.progreso, r.created_at,
               coalesce((select count(*) from lxp.contenidos c where c.recurso_id = r.id), 0)::int as usos,
               coalesce((
                 select count(distinct m.programa_id)
                 from lxp.contenidos c
                 join lxp.lecciones l on l.id = c.leccion_id
                 join lxp.modulos m on m.id = l.modulo_id
                 where c.recurso_id = r.id
               ), 0)::int as programas
        from lxp.recursos r
        order by usos desc, r.created_at desc`;
      return rows.map(
        (r): Recurso => ({
          id: r.id,
          tipo: r.tipo,
          nombre: r.nombre,
          meta: textoMeta(r.tipo, r.meta),
          peso: typeof r.meta?.peso === 'string' ? r.meta.peso : undefined,
          reproduccion: r.reproduccion ?? undefined,
          fecha: r.created_at,
          usos: r.usos,
          programas: r.programas,
          etiquetas: r.etiquetas ?? [],
          procesando: r.procesando,
          progreso: r.progreso ?? undefined,
        }),
      );
    });
    return { pendienteDb: false, recursos };
  } catch (e) {
    if (esTablaInexistente(e)) return { pendienteDb: true, recursos: [] };
    throw e;
  }
}

export type DetalleContenido = { pendienteDb: boolean; recurso: RecursoDetalle | null };

export async function getRecursoDetalle(userId: string, recursoId: string): Promise<DetalleContenido> {
  try {
    const recurso = await comoStaff(userId, async (sql) => {
      const r = (
        await sql<
          {
            id: string;
            tipo: TipoRecurso;
            nombre: string;
            meta: MetaRecurso;
            reproduccion: string | null;
            etiquetas: string[];
            version: number;
            created_at: Date;
            updated_at: Date;
          }[]
        >`
          select id, tipo::text as tipo, nombre, meta, reproduccion, etiquetas, version, created_at, updated_at
          from lxp.recursos where id = ${recursoId} limit 1`
      )[0];
      if (!r) return null;

      const usos = await sql<
        {
          id: string;
          programa: string;
          version: number;
          publicado: boolean;
          modulo: string;
          leccion: string;
        }[]
      >`
        select c.id, p.nombre as programa, p.version, p.publicado,
               m.nombre as modulo, l.nombre as leccion
        from lxp.contenidos c
        join lxp.lecciones l on l.id = c.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas p on p.id = m.programa_id
        where c.recurso_id = ${recursoId}
        order by p.nombre, m.orden, l.orden`;

      const m = r.meta ?? {};
      const metadatos = [
        { etiqueta: 'Tipo', valor: textoMeta(r.tipo, m) },
        ...(m.duracion ? [{ etiqueta: 'Duración', valor: String(m.duracion) }] : []),
        ...(m.resolucion ? [{ etiqueta: 'Resolución', valor: String(m.resolucion) }] : []),
        ...(m.peso ? [{ etiqueta: 'Peso', valor: String(m.peso) }] : []),
        { etiqueta: 'Última versión', valor: `v${r.version}` },
      ];

      return {
        id: r.id,
        tipo: r.tipo,
        nombre: r.nombre,
        reproduccion: r.reproduccion ?? undefined,
        duracion: typeof m.duracion === 'string' ? m.duracion : undefined,
        metadatos,
        etiquetas: r.etiquetas ?? [],
        usos: usos.map(
          (u): UsoRecurso => ({
            id: u.id,
            programa: u.programa,
            version: u.version,
            ruta: `${u.modulo} · ${u.leccion}`,
            estadoLeccion: u.publicado ? 'publicada' : 'borrador',
          }),
        ),
        // Historial de versiones del archivo = PENDIENTE (no hay tabla de versiones);
        // se muestra solo la versión actual derivada de recursos.version.
        versiones: [
          { id: `v${r.version}`, etiqueta: `v${r.version}`, nota: 'Versión actual', fecha: r.updated_at, actual: true },
        ],
      };
    });
    return { pendienteDb: false, recurso };
  } catch (e) {
    if (esTablaInexistente(e)) return { pendienteDb: true, recurso: null };
    throw e;
  }
}


// ── Constructor de plantilla de reporte (§6.5) ──────────────────────────────────
// La ESTRUCTURA (secciones/campos/guía) del reporte que el médico llena en el campus.
// CRUD real bajo RLS es_autoria; la forma vive en el contrato compartido `reportes/estructura`.
export type PlantillaConstructor = {
  id: string;
  nombre: string;
  tipoEstudio: string;
  publicado: boolean;
  estructura: import('@/lib/reportes/estructura').EstructuraPlantilla;
  actualizado: Date;
};

export async function getPlantilla(userId: string, id: string): Promise<PlantillaConstructor | null> {
  const { normalizarEstructura } = await import('@/lib/reportes/estructura');
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      { id: string; nombre: string; tipo_estudio: string | null; publicado: boolean; estructura: unknown; updated_at: Date }[]
    >`
      select id, nombre, tipo_estudio, publicado, estructura, updated_at
      from lxp.plantillas_reporte where id = ${id} limit 1`;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      nombre: r.nombre,
      tipoEstudio: r.tipo_estudio ?? '',
      publicado: r.publicado,
      estructura: normalizarEstructura(r.estructura),
      actualizado: r.updated_at,
    };
  });
}

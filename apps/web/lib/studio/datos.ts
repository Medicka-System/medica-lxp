import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type { Sql } from '@/lib/db.server';
import { firmarLecturaImagenes, firmarLecturaImagen, firmarDerivados, firmarDerivado } from '@/lib/media/firmar-imagenes.server';
import { firmarLecturaArchivo } from '@/lib/media/firmar-archivos.server';
import { firmarReproduccionVideo } from '@/lib/media/firmar-video.server';
import type {
  PreviewRecurso,
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
        -- Stats del PROGRAMA = solo heredado (grupo_id IS NULL); lo propio del grupo no cuenta.
        select programa_id, sum(horas) as horas, count(*) as modulos
        from lxp.modulos where grupo_id is null group by programa_id
      ) m on m.programa_id = p.id
      left join (
        select programa_id, count(*) as grupos
        from lxp.grupos group by programa_id
      ) g on g.programa_id = p.id
      where p.cora_programa_id is null   -- SOLO nativos LXP; el espejo CORA se lista aparte
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

// ── Lista UNIFICADA de programas (nativos LXP + espejo CORA) · PUENTE 1 ──────────
export type OrigenPrograma = 'lxp' | 'cora';
export type EstadoContenido = 'publicado' | 'borrador' | 'sin-contenido';

/**
 * Una fila de la lista ÚNICA de programas del Studio: nativos del LXP y espejo de CORA,
 * SIN grupos anidados (los grupos viven en la vista de Grupos). `origen` da el chip
 * CORA/LXP; `lxpProgramaId` es el shell editable (nativo: su id; CORA: el shell si ya se
 * abrió para autoría, si no null → "Construir contenido" con `abrirProgramaCora`).
 */
export type ProgramaListaItem = {
  clave: string;
  origen: OrigenPrograma;
  nombre: string;
  slug: string | null;
  estado: EstadoContenido;
  modulos: number;
  horas: number;
  version: number | null;
  actualizado: Date | null;
  lxpProgramaId: string | null;
  coraProgramaId: string | null;
};

/** Suma de horas + nº de módulos por programa (subconsulta reutilizable). */
const HORAS_MODULOS = (sql: Sql) => sql`
  left join (select programa_id, sum(horas) as horas, count(*) as modulos
             from lxp.modulos where grupo_id is null group by programa_id) m on m.programa_id = p.id`;

/**
 * Lista ÚNICA de programas = TODO `lxp.programas`, partido por origen: NATIVOS del LXP
 * (cora_programa_id IS NULL) + ESPEJO de CORA (cora_programa_id IS NOT NULL). Tras el reflejo
 * (`reflejar_programas_cora_staff` · mig 0089, al tope de la page) `lxp.programas` ES el
 * universo completo: los 15 programas CORA quedan materializados como shell (activos E
 * inactivos — el catálogo activo-only de 0082 ya NO filtra aquí). CORA primero, luego nativos.
 * Un shell recién reflejado sale `borrador` con 0 módulos (su contenido lo construye el
 * diseñador). El `nombre`/`slug` son el snapshot del reflejo (patrón idéntico al de grupos).
 */
export async function getProgramasLista(userId: string): Promise<ProgramaListaItem[]> {
  return comoStaff(userId, async (sql) => {
    const filas = await sql<
      {
        id: string;
        nombre: string;
        publicado: boolean;
        version: number;
        updated_at: Date;
        cora_programa_id: string | null;
        cora_programa_slug: string | null;
        horas: number;
        modulos: number;
      }[]
    >`
      select p.id, p.nombre, p.publicado, p.version, p.updated_at,
             p.cora_programa_id, p.cora_programa_slug,
             coalesce(m.horas, 0)::float8 as horas, coalesce(m.modulos, 0)::int as modulos
      from lxp.programas p ${HORAS_MODULOS(sql)}
      order by (p.cora_programa_id is null), p.nombre`;

    return filas.map((r) => ({
      clave: r.id,
      origen: (r.cora_programa_id ? 'cora' : 'lxp') as OrigenPrograma,
      nombre: r.nombre,
      slug: r.cora_programa_slug,
      estado: (r.publicado ? 'publicado' : 'borrador') as EstadoContenido,
      modulos: r.modulos,
      horas: Math.round(r.horas),
      version: r.version,
      actualizado: r.updated_at,
      lxpProgramaId: r.id,
      coraProgramaId: r.cora_programa_id,
    }));
  });
}

// ── Builder de un programa (árbol completo) ────────────────────────────────────
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
  /** Vínculo a CORA (PUENTE 1 · mig 0082): programa de `public.bc_programas` ligado, o null. */
  coraProgramaId: string | null;
  coraProgramaSlug: string | null;
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
          cora_programa_id: string | null;
          cora_programa_slug: string | null;
        }[]
      >`
        select p.id, p.nombre, p.publicado, p.version, p.updated_at,
               p.cora_programa_id, p.cora_programa_slug,
               coalesce((select count(*) from lxp.grupos g where g.programa_id = p.id), 0)::int as grupos
        from lxp.programas p where p.id = ${programaId} limit 1`
    )[0];
    if (!prog) return null;

    const modulos = await sql<
      { id: string; nombre: string; orden: number; horas: number }[]
    >`
      select id, nombre, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${programaId} and grupo_id is null order by orden, created_at`;

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
          where modulo_id in ${sql(moduloIds)} and grupo_id is null order by orden, created_at`
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
          where leccion_id in ${sql(leccionIds)} and grupo_id is null order by orden, created_at`
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
      coraProgramaId: prog.cora_programa_id,
      coraProgramaSlug: prog.cora_programa_slug,
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
  portadaSrcset?: { w: number; url: string }[];
  /**
   * `true` = grupo nativo del LXP (sin `cora_grupo_id`); `false` = reflejo de CORA. La UI
   * es universal (no muestra el origen), pero el borrado solo aplica a nativos (§10 · CORA
   * es dueño de los reflejados). Additivo; no lo usa el detalle (que usa GrupoDetalle).
   */
  esNativo: boolean;
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
        -- Lista UNIVERSAL: nativos LXP + grupos CORA reflejados (mig 0082/0086). Una sola
        -- población; el origen es plomería interna, invisible en la UI. Alumnos de un grupo
        -- reflejado vienen de CORA (cora_grupo_id); un nativo no tiene inscritos CORA (→ 0).
        order by g.created_at desc`,
      // Roster de CORA por grupo (una sola query · puente SECDEF, gated a staff · §10).
      sql<{ cora_grupo_id: string; alumnos: number }[]>`
        select cora_grupo_id, alumnos from lxp.cora_conteo_alumnos()`,
    ]);

    const alumnosPorCora = new Map(conteos.map((c) => [c.cora_grupo_id, c.alumnos]));
    // Firma las portadas en un solo lote (ref → url); las que no tienen quedan sin URL.
    const portadas = await firmarDerivados(rows.map((r) => r.imagen_portada), 'portada');
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
      portadaUrl: r.imagen_portada ? (portadas[r.imagen_portada]?.url ?? null) : null,
      portadaSrcset: r.imagen_portada ? portadas[r.imagen_portada]?.srcset : undefined,
      esNativo: r.cora_grupo_id === null,
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
export type NodoLeccionGrupo = {
  id: string;
  titulo: string;
  /** Tipo de la lección (decide el editor; config-types se editan inline · Paso 2). */
  tipo: TipoLeccion;
  personalizado: boolean;
  /** PROPIO del grupo (grupo_id · Opción 1A): editable/borrable, no heredado del programa. */
  esPropio: boolean;
  /** Reemplazo copy-on-write de una lección heredada (Paso 2): sello "Editada para este grupo". */
  editada: boolean;
  /** La copia (editada) quedó atrás de la versión actual del programa (Paso 3 · desfase). */
  desfasada: boolean;
};
export type NodoModuloGrupo = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  personalizado: boolean;
  /** PROPIO del grupo (agregado aquí, no del programa). */
  esPropio: boolean;
  /** Fecha de apertura del módulo en este grupo (liberación · mig 0087). null = abierto. */
  fechaApertura: Date | null;
  lecciones: NodoLeccionGrupo[];
};

export type OverrideCrudo = {
  id: string;
  entidad: string;
  entidadId: string;
  creadoEn: Date;
};

/**
 * Aviso de re-sincronización de un override (#6 · computado en el web, Path A). Se detecta
 * comparando la versión del programa vigente al aplicar el override (`aplicadoSobreVersion`)
 * contra la versión ACTUAL, o si la entidad ya no existe en la plantilla (huérfano). Trae lo
 * necesario para la banda ámbar y el "ver diferencia": ubicación legible + valor actual del
 * programa vs la personalización del grupo (del patch). Sin historial de versiones (§decisión 2).
 */
export type AvisoResyncUI = {
  entidad: string;
  entidadId: string;
  motivo: 'desfasado' | 'huerfano';
  aplicadoSobreVersion: number;
  versionActual: number;
  /** Ubicación legible del nodo, p. ej. "Módulo 04" o "Módulo 04 · Lección 3". */
  donde: string;
  /** Título ACTUAL del nodo en el programa (null si huérfano: ya no existe). */
  tituloActual: string | null;
  /** La personalización cruda del grupo (patch del override) para el diff lado a lado. */
  patch: Record<string, unknown>;
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
  /** Overrides que necesitan re-sincronización (#6 · desfasado/huérfano). Vacío = nada que decidir. */
  resync: AvisoResyncUI[];
  /** Ref de storage de la portada del grupo (para saber si hay una). */
  imagenPortadaRef: string | null;
  /** URL firmada de la portada (preview en el editor · null si no hay). */
  portadaUrl: string | null;
  portadaSrcset?: { w: number; url: string }[];
};

/**
 * Fusiona entidades PROPIAS en una lista base HEREDADA (ya ordenada), por posición: cada
 * propia va DESPUÉS de su ancla (`despuesDe`, un id de la base). Ancla NULL/inexistente →
 * al inicio; entre propias con la misma ancla, por `orden`. Espeja `fusionarPosicion` del
 * motor (@campus/shared) para el temario del Studio. No muta la base.
 */
function fusionarPos<T extends { id: string; orden: number; despuesDe: string | null }>(
  base: T[],
  propios: T[],
): T[] {
  if (propios.length === 0) return base;
  const idsBase = new Set(base.map((b) => b.id));
  const cmp = (a: T, b: T): number => a.orden - b.orden || a.id.localeCompare(b.id);
  const alInicio: T[] = [];
  const porAncla = new Map<string, T[]>();
  for (const p of propios) {
    if (p.despuesDe === null || !idsBase.has(p.despuesDe)) {
      alInicio.push(p);
    } else {
      const arr = porAncla.get(p.despuesDe) ?? [];
      arr.push(p);
      porAncla.set(p.despuesDe, arr);
    }
  }
  alInicio.sort(cmp);
  for (const arr of porAncla.values()) arr.sort(cmp);
  const out: T[] = [...alInicio];
  for (const b of base) {
    out.push(b);
    const despues = porAncla.get(b.id);
    if (despues) out.push(...despues);
  }
  return out;
}

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

    // HEREDADO (grupo_id IS NULL): el temario del programa. El contenido PROPIO del grupo
    // (grupo_id = grupoId) se incorpora + se marca en la Etapa 4B; aquí se filtra para NO
    // mostrar lo propio de OTROS grupos (RLS deja al staff ver todo propio → el filtro es
    // necesario a nivel query).
    const modulos = await sql<{ id: string; nombre: string; orden: number; horas: number }[]>`
      select id, nombre, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${g.programa_id} and grupo_id is null order by orden, created_at`;
    const moduloIds = modulos.map((m) => m.id);
    const lecciones = moduloIds.length
      ? await sql<{ id: string; modulo_id: string; nombre: string; orden: number; tipo: string }[]>`
          select id, modulo_id, nombre, orden, tipo::text as tipo from lxp.lecciones
          where modulo_id in ${sql(moduloIds)} and grupo_id is null order by orden, created_at`
      : [];

    // Contenido PROPIO de ESTE grupo (grupo_id = grupoId · Opción 1A) — se fusiona en el
    // temario por posición (`despues_de`) y se marca `esPropio` (editable/borrable).
    const [propioMods, propioLecs] = await Promise.all([
      sql<{ id: string; nombre: string; orden: number; horas: number; despues_de: string | null }[]>`
        select id, nombre, orden, horas::float8 as horas, despues_de
        from lxp.modulos where grupo_id = ${grupoId} order by orden, created_at`,
      sql<
        {
          id: string;
          modulo_id: string;
          nombre: string;
          orden: number;
          despues_de: string | null;
          tipo: string;
          reemplaza_a: string | null;
          independizada_sobre_version: number | null;
        }[]
      >`
        select id, modulo_id, nombre, orden, despues_de, tipo::text as tipo,
               reemplaza_a, independizada_sobre_version
        from lxp.lecciones where grupo_id = ${grupoId} order by orden, created_at`,
    ]);

    const overrides = await sql<
      {
        id: string;
        entidad: string;
        entidad_id: string;
        created_at: Date;
        patch: Record<string, unknown>;
        aplicado_sobre_version: number;
      }[]
    >`
      select id, entidad, entidad_id, created_at, patch, aplicado_sobre_version
      from lxp.grupo_overrides where grupo_id = ${grupoId} order by created_at`;
    // Set de entidades personalizadas (marca cruda: existe un override → personalizado).
    const personalizados = new Set(overrides.map((o) => o.entidad_id));

    // Calendario de liberación (fecha de apertura por módulo · mig 0087). Map moduloId→fecha.
    const calFilas = await sql<{ modulo_id: string; fecha_apertura: Date }[]>`
      select modulo_id, fecha_apertura from lxp.grupo_calendario where grupo_id = ${grupoId}`;
    const aperturaPorModulo = new Map(calFilas.map((c) => [c.modulo_id, c.fecha_apertura]));

    // Lecciones por módulo = heredadas (grupo_id NULL) + propias de este grupo, FUSIONADAS
    // por posición y marcadas `esPropio`. Una propia no es "personalización" (no override).
    type LecDesc = {
      id: string;
      nombre: string;
      orden: number;
      despuesDe: string | null;
      esPropio: boolean;
      tipo: string;
      editada: boolean;
      desfasada: boolean;
    };
    // Copy-on-write (Paso 2): una heredada con reemplazo propio en este grupo se SUPRIME
    // (su copia propia la sustituye en su posición). `reemplazadas` = ids heredados cubiertos.
    const reemplazadas = new Set(
      propioLecs.filter((l) => l.reemplaza_a).map((l) => l.reemplaza_a as string),
    );
    const heredadasPorMod = new Map<string, LecDesc[]>();
    for (const l of lecciones) {
      if (reemplazadas.has(l.id)) continue; // suprimida: la ve como su copia editada del grupo
      const arr = heredadasPorMod.get(l.modulo_id) ?? [];
      arr.push({ id: l.id, nombre: l.nombre, orden: l.orden, despuesDe: null, esPropio: false, tipo: l.tipo, editada: false, desfasada: false });
      heredadasPorMod.set(l.modulo_id, arr);
    }
    const propiasPorMod = new Map<string, LecDesc[]>();
    for (const l of propioLecs) {
      const editada = l.reemplaza_a !== null;
      // Desfase (Paso 3): la copia se congeló sobre una versión anterior a la actual del programa.
      const desfasada =
        editada && l.independizada_sobre_version !== null && l.independizada_sobre_version < g.programa_version;
      const arr = propiasPorMod.get(l.modulo_id) ?? [];
      arr.push({
        id: l.id,
        nombre: l.nombre,
        orden: l.orden,
        despuesDe: l.despues_de,
        esPropio: true,
        tipo: l.tipo,
        editada,
        desfasada,
      });
      propiasPorMod.set(l.modulo_id, arr);
    }
    const leccionesDeModulo = (moduloId: string): NodoLeccionGrupo[] =>
      fusionarPos(heredadasPorMod.get(moduloId) ?? [], propiasPorMod.get(moduloId) ?? []).map((l) => ({
        id: l.id,
        titulo: l.nombre,
        tipo: comoTipoLeccion(l.tipo),
        personalizado: l.esPropio ? false : personalizados.has(l.id),
        esPropio: l.esPropio,
        editada: l.editada,
        desfasada: l.desfasada,
      }));

    // Módulos del temario = heredados + propios, fusionados por posición.
    const mergedMods = fusionarPos(
      modulos.map((m) => ({ id: m.id, nombre: m.nombre, orden: m.orden, horas: m.horas, despuesDe: null as string | null, esPropio: false })),
      propioMods.map((m) => ({ id: m.id, nombre: m.nombre, orden: m.orden, horas: m.horas, despuesDe: m.despues_de, esPropio: true })),
    );

    // ── Re-sincronización (#6 · Path A, en memoria): un override está DESFASADO si se aplicó
    // sobre una versión anterior a la actual del programa, o HUÉRFANO si su nodo ya no existe
    // en la plantilla. Mismo criterio que detectarResync (shared); aquí se computa con los
    // datos ya cargados (versión + temario), sin query extra ni tocar shared. ──
    const claveMod = new Map(modulos.map((m, i) => [m.id, { clave: String(i + 1).padStart(2, '0'), titulo: m.nombre }]));
    const moduloDeLeccion = new Map(lecciones.map((l) => [l.id, l.modulo_id]));
    const tituloLeccion = new Map(lecciones.map((l) => [l.id, l.nombre]));
    const resync: AvisoResyncUI[] = [];
    for (const o of overrides) {
      const existe =
        o.entidad === 'modulo'
          ? claveMod.has(o.entidad_id)
          : o.entidad === 'leccion'
            ? tituloLeccion.has(o.entidad_id)
            : true; // otras entidades: no se evalúan como huérfanas aquí
      const huerfano = !existe;
      const desfasado = existe && o.aplicado_sobre_version < g.programa_version;
      if (!huerfano && !desfasado) continue;

      // Ubicación legible + título actual del nodo (null si huérfano).
      let donde = o.entidad;
      let tituloActual: string | null = null;
      if (o.entidad === 'modulo') {
        const m = claveMod.get(o.entidad_id);
        donde = m ? `Módulo ${m.clave}` : 'Módulo (eliminado)';
        tituloActual = m?.titulo ?? null;
      } else if (o.entidad === 'leccion') {
        const modId = moduloDeLeccion.get(o.entidad_id);
        const m = modId ? claveMod.get(modId) : undefined;
        const t = tituloLeccion.get(o.entidad_id) ?? null;
        donde = m ? `Módulo ${m.clave} · Lección` : 'Lección (eliminada)';
        tituloActual = t;
      } else if (o.entidad === 'bloque' || o.entidad === 'leccion_config') {
        // Reemplazo de FUENTE (4b): se rotula "Recurso reemplazado" (no el id ni la ref · §decisión 4).
        donde = 'Recurso reemplazado';
      }
      resync.push({
        entidad: o.entidad,
        entidadId: o.entidad_id,
        motivo: huerfano ? 'huerfano' : 'desfasado',
        aplicadoSobreVersion: o.aplicado_sobre_version,
        versionActual: g.programa_version,
        donde,
        tituloActual,
        patch: o.patch ?? {},
      });
    }

    const hoy = new Date();
    // Portada del grupo con derivados webp (640/1280) + fallback al original (preview editor).
    const _gp = await firmarDerivado(g.imagen_portada, 'portada');
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
        modulos: mergedMods.length,
        horas: Math.round(mergedMods.reduce((s, m) => s + m.horas, 0)),
        lecciones: lecciones.length - reemplazadas.size + propioLecs.length,
      },
      temario: mergedMods.map((m, i) => ({
        id: m.id,
        clave: String(i + 1).padStart(2, '0'),
        titulo: m.nombre,
        horas: Math.round(m.horas),
        personalizado: m.esPropio ? false : personalizados.has(m.id),
        esPropio: m.esPropio,
        fechaApertura: aperturaPorModulo.get(m.id) ?? null,
        lecciones: leccionesDeModulo(m.id),
      })),
      overrides: overrides.map((o) => ({
        id: o.id,
        entidad: o.entidad,
        entidadId: o.entidad_id,
        creadoEn: o.created_at,
      })),
      resync,
      imagenPortadaRef: g.imagen_portada,
      portadaUrl: _gp?.url ?? null,
      portadaSrcset: _gp?.srcset,
    };
  });
}

// ── Editor de contenido de una LECCIÓN PROPIA del grupo (Opción 1A · Etapa 4C) ──────
/** Datos para montar el course builder (EditorDeLeccion) sobre una lección PROPIA del grupo. */
export type LeccionGrupoEditor = {
  grupoId: string;
  grupoNombre: string;
  programaId: string;
  leccionId: string;
  tipo: TipoLeccion;
  titulo: string;
  config: Record<string, unknown>;
  bloques: BloqueTeoria[];
};

/**
 * Carga una lección PROPIA del grupo (grupo_id = grupoId) + sus bloques propios, para el
 * editor de contenido del grupo. Devuelve null si la lección no es propia de este grupo
 * (candado: no se edita contenido heredado desde aquí — eso vive en el programa).
 */
export async function getLeccionGrupoEditor(
  userId: string,
  grupoId: string,
  leccionId: string,
): Promise<LeccionGrupoEditor | null> {
  return comoStaff(userId, async (sql) => {
    const l = (
      await sql<{ programa_id: string; nombre: string; tipo: string; config: Record<string, unknown> | null; grupo_nombre: string }[]>`
        select m.programa_id, l.nombre, l.tipo::text as tipo, l.config, g.nombre as grupo_nombre
        from lxp.lecciones l
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.grupos g on g.id = ${grupoId}
        where l.id = ${leccionId} and l.grupo_id = ${grupoId} limit 1`
    )[0];
    if (!l) return null;
    const bloques = await sql<{ id: string; orden: number; tipo_bloque: string; config: Record<string, unknown> | null }[]>`
      select id, orden, tipo_bloque, config from lxp.bloques
      where leccion_id = ${leccionId} and grupo_id = ${grupoId} order by orden, created_at`;
    return {
      grupoId,
      grupoNombre: l.grupo_nombre,
      programaId: l.programa_id,
      leccionId,
      tipo: comoTipoLeccion(l.tipo),
      titulo: l.nombre,
      config: l.config ?? {},
      bloques: bloques.map((b) => ({ id: b.id, orden: b.orden, tipoBloque: b.tipo_bloque, config: b.config ?? {} })),
    };
  });
}

// ── Bloques de una lección de teoría EN EL GRUPO (copy-on-write por bloque · Paso 4) ──
/** Un bloque de teoría tal como lo ve el grupo: heredado, propio NUEVO o propio que EDITA uno heredado. */
export type BloqueGrupoItem = {
  id: string;
  tipoBloque: string;
  config: Record<string, unknown>;
  /** Fila propia del grupo (editable/borrable aquí). */
  esPropio: boolean;
  /** Reemplaza a un bloque heredado (copy-on-write) → sello "Editado para este grupo". */
  editada: boolean;
};
export type BloquesLeccionGrupo = {
  leccionId: string;
  programaId: string;
  titulo: string;
  bloques: BloqueGrupoItem[];
};

/**
 * Lista de bloques de una lección de TEORÍA en el contexto del grupo: heredados (grupo_id NULL)
 * + propios del grupo, fusionados por posición, suprimiendo el heredado donde una copia lo
 * reemplaza (Paso 4). Marca `editada` el propio que reemplaza a un heredado. null si no es teoría.
 */
export async function getBloquesLeccionGrupo(
  userId: string,
  grupoId: string,
  leccionId: string,
): Promise<BloquesLeccionGrupo | null> {
  return comoStaff(userId, async (sql) => {
    const l = (
      await sql<{ programa_id: string; nombre: string; tipo: string }[]>`
        select m.programa_id, l.nombre, l.tipo::text as tipo
        from lxp.lecciones l join lxp.modulos m on m.id = l.modulo_id
        where l.id = ${leccionId} limit 1`
    )[0];
    if (!l || l.tipo !== 'teoria') return null;

    const filas = await sql<
      {
        id: string;
        tipo_bloque: string;
        config: Record<string, unknown> | null;
        grupo_id: string | null;
        orden: number;
        despues_de: string | null;
        reemplaza_a: string | null;
      }[]
    >`
      select id, tipo_bloque, config, grupo_id, orden, despues_de, reemplaza_a
      from lxp.bloques
      where leccion_id = ${leccionId} and (grupo_id is null or grupo_id = ${grupoId})
      order by orden, created_at`;

    const reemplazados = new Set(
      filas.filter((f) => f.grupo_id !== null && f.reemplaza_a).map((f) => f.reemplaza_a as string),
    );
    type D = {
      id: string;
      orden: number;
      despuesDe: string | null;
      tipoBloque: string;
      config: Record<string, unknown>;
      esPropio: boolean;
      editada: boolean;
    };
    const base: D[] = filas
      .filter((f) => f.grupo_id === null && !reemplazados.has(f.id))
      .map((f) => ({ id: f.id, orden: f.orden, despuesDe: null, tipoBloque: f.tipo_bloque, config: f.config ?? {}, esPropio: false, editada: false }));
    const propios: D[] = filas
      .filter((f) => f.grupo_id !== null)
      .map((f) => ({ id: f.id, orden: f.orden, despuesDe: f.despues_de, tipoBloque: f.tipo_bloque, config: f.config ?? {}, esPropio: true, editada: f.reemplaza_a !== null }));

    return {
      leccionId,
      programaId: l.programa_id,
      titulo: l.nombre,
      bloques: fusionarPos(base, propios).map((b) => ({
        id: b.id,
        tipoBloque: b.tipoBloque,
        config: b.config,
        esPropio: b.esPropio,
        editada: b.editada,
      })),
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

    // Total de lecciones = heredadas del programa (grupo_id IS NULL) + las PROPIAS de ESTE
    // grupo (grupo_id = grupoId); así el avance del alumno de este grupo cuenta lo que ve.
    const total =
      (
        await sql<{ n: number }[]>`
          select count(*)::int as n
          from lxp.lecciones l
          join lxp.modulos m on m.id = l.modulo_id
          where m.programa_id = ${g.programa_id}
            and (l.grupo_id is null or l.grupo_id = ${grupoId})
            and not (l.grupo_id is null and l.id in (
              select reemplaza_a from lxp.lecciones
              where grupo_id = ${grupoId} and reemplaza_a is not null))`
      )[0]?.n ?? 0;

    // Lecciones completadas por alumno (staff lee todo · reproduccion_progreso_select).
    const ids = roster.map((r) => r.supabase_auth_id);
    const progreso = await sql<{ alumno_id: string; n: number }[]>`
      select rp.alumno_id, count(distinct rp.leccion_id)::int as n
      from lxp.reproduccion_progreso rp
      join lxp.lecciones l on l.id = rp.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${g.programa_id}
        and (l.grupo_id is null or l.grupo_id = ${grupoId})
        and not (l.grupo_id is null and l.id in (
          select reemplaza_a from lxp.lecciones
          where grupo_id = ${grupoId} and reemplaza_a is not null))
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
          storage_key: string | null;
          usos: number;
          programas: number;
        }[]
      >`
        select r.id, r.tipo::text as tipo, r.nombre, r.meta, r.reproduccion, r.etiquetas,
               r.procesando, r.progreso, r.created_at, r.storage_key,
               coalesce((
                 select count(distinct b.leccion_id)
                 from lxp.bloques b
                 where b.config->>'recursoId' = r.id::text
               ), 0)::int as usos,
               coalesce((
                 select count(distinct m.programa_id)
                 from lxp.bloques b
                 join lxp.lecciones l on l.id = b.leccion_id
                 join lxp.modulos m on m.id = l.modulo_id
                 where b.config->>'recursoId' = r.id::text
               ), 0)::int as programas
        from lxp.recursos r
        order by usos desc, r.created_at desc`;

      // Miniatura real solo para IMÁGENES: se firma la lectura de sus claves en un lote
      // (el resto de tipos no tiene un frame barato de servir → cae al ícono del tipo).
      const urlsImg = await firmarLecturaImagenes(
        rows.filter((r) => r.tipo === 'imagen').map((r) => r.storage_key),
      );

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
          thumbUrl: r.tipo === 'imagen' && r.storage_key ? (urlsImg[r.storage_key] ?? null) : null,
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

/**
 * Firma la PREVIEW reproducible del recurso según su tipo (§2 — la firma la hace el `api`,
 * el binario no pasa por el web). Falla suave a `ninguno` cuando no hay artefacto firmable
 * o el servicio no responde → el detalle cae al marco con ícono del tipo.
 *
 *  · imagen        → URL firmada de `media/imagenes/*`      (<img>)
 *  · pdf/word/ppt  → URL firmada de `media/archivos/*`      (visor PDF · descarga docx/pptx)
 *  · video         → URL de reproducción firmada por videotecaId (BloqueVideo)
 *  · h5p           → contentId (== storage_key); el cliente arma el servidor base
 *  · scorm/xapi    → sin lanzador propio aún → BloquePaquete se degrada con dignidad
 */
async function construirPreview(
  tipo: TipoRecurso,
  storageKey: string | null,
): Promise<PreviewRecurso> {
  switch (tipo) {
    case 'imagen': {
      const url = await firmarLecturaImagen(storageKey);
      return url ? { clase: 'imagen', url } : { clase: 'ninguno' };
    }
    case 'pdf': {
      const url = await firmarLecturaArchivo(storageKey);
      return url ? { clase: 'pdf', url } : { clase: 'ninguno' };
    }
    case 'word':
    case 'ppt': {
      const url = await firmarLecturaArchivo(storageKey);
      return { clase: 'documento', tipo, url };
    }
    case 'video': {
      const url = await firmarReproduccionVideo(storageKey);
      return url ? { clase: 'video', url } : { clase: 'ninguno' };
    }
    case 'h5p':
      return storageKey ? { clase: 'h5p', contentId: storageKey } : { clase: 'ninguno' };
    case 'scorm':
    case 'xapi':
      return { clase: 'paquete', tipo };
    default:
      return { clase: 'ninguno' };
  }
}

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
            storage_key: string | null;
            created_at: Date;
            updated_at: Date;
          }[]
        >`
          select id, tipo::text as tipo, nombre, meta, reproduccion, etiquetas, version, storage_key, created_at, updated_at
          from lxp.recursos where id = ${recursoId} limit 1`
      )[0];
      if (!r) return null;

      // La referencia real de una lección al recurso vive en lxp.bloques.config.recursoId
      // (el "Insertar recurso" del constructor de teoría). Una lección puede tener varios
      // bloques que lo referencian → se cuenta DISTINCT por lección.
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
        select distinct on (l.id)
               l.id, p.nombre as programa, p.version, p.publicado,
               m.nombre as modulo, l.nombre as leccion
        from lxp.bloques b
        join lxp.lecciones l on l.id = b.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        join lxp.programas p on p.id = m.programa_id
        where b.config->>'recursoId' = ${recursoId}
        order by l.id, p.nombre, m.orden, l.orden`;

      const m = r.meta ?? {};
      const metadatos = [
        { etiqueta: 'Tipo', valor: textoMeta(r.tipo, m) },
        ...(m.duracion ? [{ etiqueta: 'Duración', valor: String(m.duracion) }] : []),
        ...(m.resolucion ? [{ etiqueta: 'Resolución', valor: String(m.resolucion) }] : []),
        ...(m.peso ? [{ etiqueta: 'Peso', valor: String(m.peso) }] : []),
        { etiqueta: 'Última versión', valor: `v${r.version}` },
      ];

      const preview = await construirPreview(r.tipo, r.storage_key);

      return {
        id: r.id,
        tipo: r.tipo,
        nombre: r.nombre,
        reproduccion: r.reproduccion ?? undefined,
        duracion: typeof m.duracion === 'string' ? m.duracion : undefined,
        metadatos,
        preview,
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

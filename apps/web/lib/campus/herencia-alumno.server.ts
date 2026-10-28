import 'server-only';
import type postgres from 'postgres';
import {
  resolverHerencia,
  type ActividadTpl,
  type ContenidoPropioGrupo,
  type ContenidoTpl,
  type LeccionPropia,
  type LeccionTpl,
  type ModuloPropio,
  type ModuloTpl,
  type OverrideCrudo,
  type ProgramaTpl,
  type VistaEfectiva,
} from '@campus/shared';
import { grupoDelAlumnoEnPrograma } from './inscripcion';

type Sql = ReturnType<typeof postgres>;

/**
 * Herencia programa→grupo aplicada a la VISTA DEL ALUMNO (§6). El alumno ve la vista
 * RESUELTA de SU grupo (plantilla + overrides), no la plantilla cruda: una lección/
 * módulo/contenido que su grupo ocultó NO le aparece ni cuenta en su avance.
 *
 * Reusa el MOTOR PURO de `@campus/shared` (mismo código que `apps/api`): el shape
 * `ProgramaTpl` es el contrato único, así que este ensamblador no puede divergir en
 * silencio del de `apps/api` (si el shape cambia, ambos dejan de compilar).
 *
 * PARIDAD / PERFORMANCE: se cargan los campos ESTRUCTURALES (ids, orden, tipo, títulos)
 * que la resolución necesita. Los campos pesados de passthrough (`cuerpo` de contenidos,
 * `bloques`/`config` de lección, `instrucciones`) NO se hidratan: son nullable/opcionales
 * en el contrato, la resolución de `oculto`/orden no los usa, y bajarlos en cada carga de
 * curso sería costoso a escala (800 concurrentes). El cuerpo real de una lección lo baja
 * su propia vista (`leccion-datos`), no este árbol.
 *
 * Todo corre con RLS vía el `sql` del `comoAlumno` del consumidor (la policy
 * `grupo_overrides_read` permite al alumno leer los overrides de su grupo).
 */

/** Ensambla `ProgramaTpl` desde las tablas de la plantilla (4 queries planas, sin N+1). */
async function ensamblarPlantilla(sql: Sql, programaId: string): Promise<ProgramaTpl | null> {
  const prog = (
    await sql<{ id: string; nombre: string; descripcion: string | null; version: number; publicado: boolean }[]>`
      select id, nombre, descripcion, version, publicado
      from lxp.programas where id = ${programaId} and publicado limit 1`
  )[0];
  if (!prog) return null;

  // HEREDADO del programa SOLO: `grupo_id IS NULL`. El contenido PROPIO del grupo (grupo_id
  // set · Opción 1A) se carga aparte en `cargarPropias` y se FUSIONA en el motor — si se
  // colara aquí, se contaría doble (como heredado Y como propio).
  const [modulos, lecciones, contenidos, actividades] = await Promise.all([
    sql<{ id: string; nombre: string; descripcion: string | null; orden: number; horas: number }[]>`
      select id, nombre, descripcion, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${programaId} and grupo_id is null order by orden, id`,
    sql<{ id: string; modulo_id: string; nombre: string; descripcion: string | null; orden: number; tipo: string }[]>`
      select l.id, l.modulo_id, l.nombre, l.descripcion, l.orden, l.tipo::text as tipo
      from lxp.lecciones l join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${programaId} and l.grupo_id is null order by l.orden, l.id`,
    sql<{ id: string; leccion_id: string; tipo: string; titulo: string; recurso_ref: string | null; orden: number }[]>`
      select c.id, c.leccion_id, c.tipo::text as tipo, c.titulo, c.recurso_ref, c.orden
      from lxp.contenidos c
      join lxp.lecciones l on l.id = c.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${programaId} and c.grupo_id is null order by c.orden, c.id`,
    sql<{ id: string; leccion_id: string; tipo: string; titulo: string; orden: number }[]>`
      select a.id, a.leccion_id, a.tipo::text as tipo, a.titulo, a.orden
      from lxp.actividades a
      join lxp.lecciones l on l.id = a.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${programaId} and a.grupo_id is null order by a.orden, a.id`,
  ]);

  const leccionRef = new Map<string, LeccionTpl>();
  const leccionesPorModulo = new Map<string, LeccionTpl[]>();
  for (const l of lecciones) {
    const nodo: LeccionTpl = {
      id: l.id,
      nombre: l.nombre,
      descripcion: l.descripcion,
      orden: l.orden,
      tipo: l.tipo,
      // bloques/config/cuerpo: passthrough pesado NO hidratado (ver cabecera).
      contenidos: [],
      actividades: [],
    };
    leccionRef.set(l.id, nodo);
    const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
    arr.push(nodo);
    leccionesPorModulo.set(l.modulo_id, arr);
  }
  for (const c of contenidos) {
    leccionRef.get(c.leccion_id)?.contenidos.push({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      recurso_ref: c.recurso_ref,
      cuerpo: null,
      orden: c.orden,
    } satisfies ContenidoTpl);
  }
  for (const a of actividades) {
    leccionRef.get(a.leccion_id)?.actividades.push({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      instrucciones: null,
      orden: a.orden,
    } satisfies ActividadTpl);
  }

  const modulosTpl: ModuloTpl[] = modulos.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    orden: m.orden,
    horas: m.horas,
    lecciones: leccionesPorModulo.get(m.id) ?? [],
  }));

  return {
    id: prog.id,
    nombre: prog.nombre,
    descripcion: prog.descripcion,
    version: prog.version,
    publicado: prog.publicado,
    modulos: modulosTpl,
  };
}

/** Overrides del grupo (RLS: el alumno los lee). Vacío si el alumno no tiene grupo. */
async function cargarOverrides(sql: Sql, grupoId: string): Promise<OverrideCrudo[]> {
  return sql<OverrideCrudo[]>`
    select entidad, entidad_id, patch, aplicado_sobre_version
    from lxp.grupo_overrides where grupo_id = ${grupoId}`;
}

/**
 * Contenido PROPIO del grupo (Opción 1A · `grupo_id` = grupo). RLS: el alumno miembro lo
 * lee (policy `*_grupo_aislado`), nadie de otro grupo. Lo forma como `ContenidoPropioGrupo`
 * para el merge del motor: módulos propios con sus lecciones anidadas; lecciones propias
 * bajo un módulo HEREDADO como standalone (con `modulo_id` + `despues_de`). Los bloques NO
 * se hidratan aquí (igual que la plantilla: passthrough pesado) — su vista los baja getLeccion.
 */
async function cargarPropias(sql: Sql, grupoId: string): Promise<ContenidoPropioGrupo> {
  const [mods, lecs, conts, acts] = await Promise.all([
    sql<{ id: string; nombre: string; descripcion: string | null; orden: number; horas: number; despues_de: string | null }[]>`
      select id, nombre, descripcion, orden, horas::float8 as horas, despues_de
      from lxp.modulos where grupo_id = ${grupoId} order by orden, id`,
    sql<{ id: string; modulo_id: string; nombre: string; descripcion: string | null; orden: number; tipo: string; despues_de: string | null }[]>`
      select id, modulo_id, nombre, descripcion, orden, tipo::text as tipo, despues_de
      from lxp.lecciones where grupo_id = ${grupoId} order by orden, id`,
    sql<{ id: string; leccion_id: string; tipo: string; titulo: string; recurso_ref: string | null; orden: number }[]>`
      select id, leccion_id, tipo::text as tipo, titulo, recurso_ref, orden
      from lxp.contenidos where grupo_id = ${grupoId} order by orden, id`,
    sql<{ id: string; leccion_id: string; tipo: string; titulo: string; orden: number }[]>`
      select id, leccion_id, tipo::text as tipo, titulo, orden
      from lxp.actividades where grupo_id = ${grupoId} order by orden, id`,
  ]);
  if (mods.length === 0 && lecs.length === 0) return {}; // nada propio → merge no-op

  // Nodo LeccionTpl por lección propia, con sus contenidos/actividades anidados.
  const leccionRef = new Map<string, LeccionTpl>();
  for (const l of lecs) {
    leccionRef.set(l.id, {
      id: l.id,
      nombre: l.nombre,
      descripcion: l.descripcion,
      orden: l.orden,
      tipo: l.tipo,
      contenidos: [],
      actividades: [],
    });
  }
  for (const c of conts) {
    leccionRef.get(c.leccion_id)?.contenidos.push({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      recurso_ref: c.recurso_ref,
      cuerpo: null,
      orden: c.orden,
    } satisfies ContenidoTpl);
  }
  for (const a of acts) {
    leccionRef.get(a.leccion_id)?.actividades.push({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      instrucciones: null,
      orden: a.orden,
    } satisfies ActividadTpl);
  }

  // Partición: lecciones bajo un módulo PROPIO → anidadas; bajo uno HEREDADO → standalone.
  const propioModIds = new Set(mods.map((m) => m.id));
  const leccionesDeModulo = new Map<string, LeccionTpl[]>();
  const leccionesStandalone: LeccionPropia[] = [];
  for (const l of lecs) {
    const nodo = leccionRef.get(l.id)!;
    if (propioModIds.has(l.modulo_id)) {
      const arr = leccionesDeModulo.get(l.modulo_id) ?? [];
      arr.push(nodo);
      leccionesDeModulo.set(l.modulo_id, arr);
    } else {
      leccionesStandalone.push({ ...nodo, modulo_id: l.modulo_id, despues_de: l.despues_de });
    }
  }
  const modulos: ModuloPropio[] = mods.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    orden: m.orden,
    horas: m.horas,
    despues_de: m.despues_de,
    lecciones: leccionesDeModulo.get(m.id) ?? [],
  }));

  return { modulos, lecciones: leccionesStandalone };
}

/** Calendario de liberación del grupo (RLS read · mig 0087). Vacío = sin gating. */
async function cargarCalendario(sql: Sql, grupoId: string): Promise<Map<string, Date>> {
  const filas = await sql<{ modulo_id: string; fecha_apertura: Date }[]>`
    select modulo_id, fecha_apertura from lxp.grupo_calendario where grupo_id = ${grupoId}`;
  return new Map(filas.map((f) => [f.modulo_id, f.fecha_apertura]));
}

/** Día UTC (yyyymmdd) para comparar `date` sin desfase por hora/zona (igual que fechaCortaDia). */
function diaUTC(d: Date): number {
  return d.getUTCFullYear() * 10000 + d.getUTCMonth() * 100 + d.getUTCDate();
}

/** Vista resuelta del curso para el alumno + conjuntos VISIBLES (cascada) + gating por fecha. */
export type CursoResueltoAlumno = {
  grupoId: string | null;
  vista: VistaEfectiva;
  /** Ids visibles (no ocultos, y no bajo un padre oculto). */
  modulosVisibles: Set<string>;
  leccionesVisibles: Set<string>;
  contenidosVisibles: Set<string>;
  /**
   * Gating por fecha de apertura (§6 · solo grupos SÍNCRONOS). Un módulo con fecha
   * futura está BLOQUEADO: el alumno lo VE pero no entra. Default seguro: sin fila de
   * calendario ⇒ abierto (nunca bloqueado por omisión). En asíncrono, vacío (cero gating).
   */
  modulosBloqueados: Set<string>;
  /** Lecciones de módulos bloqueados (cascada) — corta el acceso directo por URL. */
  leccionesBloqueadas: Set<string>;
  /** Fecha de apertura por módulo (para el aviso "se abre el [fecha]"). Solo los que tienen fila. */
  aperturaPorModulo: Map<string, Date>;
  /**
   * Reemplazo de FUENTE por grupo (Paso 4b). Se arma de los overrides YA cargados (sin query
   * extra): `bloque` → patch por id de bloque de teoría; `leccionConfig` → patch por id de
   * lección (video). Vacío en el caso común → el overlay en getLeccion es no-op. La fuente
   * viene YA RESUELTA (ref/src/videotecaId/imagenes); el lector la firma/reproduce.
   */
  overridesFuente: {
    bloque: Map<string, Record<string, unknown>>;
    leccionConfig: Map<string, Record<string, unknown>>;
  };
};

/**
 * Resuelve el curso del alumno: ensambla la plantilla, resuelve el grupo del alumno,
 * carga sus overrides y aplica el motor. Devuelve la vista + sets visibles con CASCADA
 * (módulo oculto ⇒ caen sus lecciones/contenidos; lección oculta ⇒ caen sus contenidos)
 * + gating por fecha de apertura (solo síncrono; sin fecha = abierto).
 * `null` si el programa no existe/publicado. Sin overrides/calendario ⇒ igual que hoy.
 */
export async function resolverCursoAlumno(
  sql: Sql,
  userId: string,
  programaId: string,
): Promise<CursoResueltoAlumno | null> {
  const plantilla = await ensamblarPlantilla(sql, programaId);
  if (!plantilla) return null;
  const grupo = await grupoDelAlumnoEnPrograma(sql, userId, programaId);
  const overrides = grupo ? await cargarOverrides(sql, grupo.id) : [];
  // Contenido propio del grupo (Opción 1A): se FUSIONA en el árbol heredado (motor · Etapa 2).
  // El alumno lo ve mezclado y transparente; cuenta en el avance como una lección/contenido más.
  const propias = grupo ? await cargarPropias(sql, grupo.id) : {};
  const vista = resolverHerencia(plantilla, overrides, propias);

  // Reemplazo de fuente (Paso 4b): se arma de los overrides YA cargados (sin query extra).
  const fuenteBloque = new Map<string, Record<string, unknown>>();
  const fuenteLeccionConfig = new Map<string, Record<string, unknown>>();
  for (const o of overrides) {
    if (o.entidad === 'bloque') fuenteBloque.set(o.entidad_id, o.patch);
    else if (o.entidad === 'leccion_config') fuenteLeccionConfig.set(o.entidad_id, o.patch);
  }

  // Gating por fecha SOLO en síncronos (regla de producto). En asíncrono: calendario vacío.
  const aperturaPorModulo =
    grupo && grupo.modalidad === 'sincrono' ? await cargarCalendario(sql, grupo.id) : new Map<string, Date>();
  const hoy = diaUTC(new Date());
  const modulosBloqueados = new Set<string>();
  const leccionesBloqueadas = new Set<string>();

  const modulosVisibles = new Set<string>();
  const leccionesVisibles = new Set<string>();
  const contenidosVisibles = new Set<string>();
  for (const m of vista.modulos) {
    if (m.herencia.oculto) continue;
    modulosVisibles.add(m.id);
    // BLOQUEADO si tiene fecha de apertura ESTRICTAMENTE futura. Sin fila ⇒ abierto (candado).
    const apertura = aperturaPorModulo.get(m.id);
    const bloqueado = apertura !== undefined && diaUTC(apertura) > hoy;
    if (bloqueado) modulosBloqueados.add(m.id);
    for (const l of m.lecciones) {
      if (l.herencia.oculto) continue;
      leccionesVisibles.add(l.id);
      if (bloqueado) leccionesBloqueadas.add(l.id);
      for (const c of l.contenidos) {
        if (!c.herencia.oculto) contenidosVisibles.add(c.id);
      }
    }
  }
  return {
    grupoId: grupo?.id ?? null,
    vista,
    modulosVisibles,
    leccionesVisibles,
    contenidosVisibles,
    modulosBloqueados,
    leccionesBloqueadas,
    aperturaPorModulo,
    overridesFuente: { bloque: fuenteBloque, leccionConfig: fuenteLeccionConfig },
  };
}

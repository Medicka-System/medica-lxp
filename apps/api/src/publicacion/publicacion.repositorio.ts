/**
 * Lecturas/escrituras de la publicación con versionado (§6 · Sprint 4.5). Arma el
 * SNAPSHOT completo del programa (incluye rúbricas, a diferencia de la vista de
 * herencia) y aplica los cambios de estado de forma transaccional. La máquina de
 * estados (versionado.logic) no conoce SQL.
 */
import type { Sql } from '@campus/db';
import type { EstadoPublicacion } from './versionado.logic';

export interface ProgramaEstado {
  id: string;
  nombre: string;
  estado: EstadoPublicacion;
  version: number;
}

/** Estado y versión actuales del programa; `null` si no existe. */
export async function cargarEstado(
  sql: Sql,
  programaId: string,
): Promise<ProgramaEstado | null> {
  const rows = await sql<ProgramaEstado[]>`
    select id, nombre, estado::text as estado, version
    from lxp.programas where id = ${programaId}`;
  return rows[0] ?? null;
}

/** Metadatos de las versiones publicadas (sin el snapshot pesado). */
export interface VersionMeta {
  version: number;
  notas: string | null;
  publicado_por: string | null;
  publicado_en: string;
}

export async function cargarHistorial(
  sql: Sql,
  programaId: string,
): Promise<VersionMeta[]> {
  return sql<VersionMeta[]>`
    select version, notas, publicado_por, publicado_en::text as publicado_en
    from lxp.programa_versiones
    where programa_id = ${programaId}
    order by version desc`;
}

/** Snapshot congelado de una versión concreta; `null` si no existe. */
export async function cargarSnapshot(
  sql: Sql,
  programaId: string,
  version: number,
): Promise<unknown | null> {
  const rows = await sql<{ snapshot: unknown }[]>`
    select snapshot from lxp.programa_versiones
    where programa_id = ${programaId} and version = ${version}`;
  return rows[0]?.snapshot ?? null;
}

/**
 * Construye el snapshot inmutable del árbol del programa (programa→módulos→
 * lecciones→contenidos/actividades/rúbricas). Consultas planas por nivel
 * ensambladas en memoria (evita N+1). Es lo que se congela al publicar.
 */
export async function construirSnapshot(
  sql: Sql,
  programaId: string,
): Promise<Record<string, unknown>> {
  const [prog] = await sql<
    { id: string; nombre: string; descripcion: string | null; version: number }[]
  >`select id, nombre, descripcion, version from lxp.programas where id = ${programaId}`;

  const modulos = await sql<
    {
      id: string;
      nombre: string;
      descripcion: string | null;
      orden: number;
      horas: number;
    }[]
  >`
    select id, nombre, descripcion, orden, horas::float8 as horas
    from lxp.modulos where programa_id = ${programaId}
    order by orden, id`;

  // Modelo NUEVO (mig 0023): la lección tiene `tipo` + `config`; su contenido de
  // teoría vive en `lxp.bloques`. Se congelan también, junto al modelo viejo
  // (contenidos/actividades), para que el snapshot conserve ambos hasta fase 3.
  const lecciones = await sql<
    {
      id: string;
      modulo_id: string;
      nombre: string;
      descripcion: string | null;
      orden: number;
      tipo: string;
      config: unknown;
    }[]
  >`
    select l.id, l.modulo_id, l.nombre, l.descripcion, l.orden,
           l.tipo::text as tipo, l.config
    from lxp.lecciones l
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId}
    order by l.orden, l.id`;

  const bloques = await sql<
    {
      id: string;
      leccion_id: string;
      orden: number;
      tipo_bloque: string;
      config: unknown;
    }[]
  >`
    select b.id, b.leccion_id, b.orden, b.tipo_bloque, b.config
    from lxp.bloques b
    join lxp.lecciones l on l.id = b.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId}
    order by b.orden, b.id`;

  const contenidos = await sql<
    {
      id: string;
      leccion_id: string;
      tipo: string;
      titulo: string;
      recurso_ref: string | null;
      cuerpo: string | null;
      orden: number;
    }[]
  >`
    select c.id, c.leccion_id, c.tipo::text as tipo, c.titulo,
           c.recurso_ref, c.cuerpo, c.orden
    from lxp.contenidos c
    join lxp.lecciones l on l.id = c.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId}
    order by c.orden, c.id`;

  const actividades = await sql<
    {
      id: string;
      leccion_id: string;
      tipo: string;
      titulo: string;
      instrucciones: string | null;
      orden: number;
    }[]
  >`
    select a.id, a.leccion_id, a.tipo::text as tipo, a.titulo,
           a.instrucciones, a.orden
    from lxp.actividades a
    join lxp.lecciones l on l.id = a.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId}
    order by a.orden, a.id`;

  const rubricas = await sql<
    { id: string; actividad_id: string; criterios: unknown }[]
  >`
    select r.id, r.actividad_id, r.criterios
    from lxp.rubricas r
    join lxp.actividades a on a.id = r.actividad_id
    join lxp.lecciones l on l.id = a.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId}
    order by r.id`;

  const rubricasPorActividad = new Map<string, unknown[]>();
  for (const r of rubricas) {
    const arr = rubricasPorActividad.get(r.actividad_id) ?? [];
    arr.push({ id: r.id, criterios: r.criterios });
    rubricasPorActividad.set(r.actividad_id, arr);
  }

  const contenidosPorLeccion = new Map<string, unknown[]>();
  for (const c of contenidos) {
    const arr = contenidosPorLeccion.get(c.leccion_id) ?? [];
    arr.push(c);
    contenidosPorLeccion.set(c.leccion_id, arr);
  }

  const actividadesPorLeccion = new Map<string, unknown[]>();
  for (const a of actividades) {
    const arr = actividadesPorLeccion.get(a.leccion_id) ?? [];
    arr.push({ ...a, rubricas: rubricasPorActividad.get(a.id) ?? [] });
    actividadesPorLeccion.set(a.leccion_id, arr);
  }

  // Modelo NUEVO: bloques de teoría por lección.
  const bloquesPorLeccion = new Map<string, unknown[]>();
  for (const b of bloques) {
    const arr = bloquesPorLeccion.get(b.leccion_id) ?? [];
    arr.push({ id: b.id, orden: b.orden, tipo_bloque: b.tipo_bloque, config: b.config });
    bloquesPorLeccion.set(b.leccion_id, arr);
  }

  const leccionesPorModulo = new Map<string, unknown[]>();
  for (const l of lecciones) {
    const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
    arr.push({
      ...l,
      // Modelo nuevo (mig 0023): tipo/config/bloques congelados en el snapshot.
      tipo: l.tipo,
      config: l.config,
      bloques: bloquesPorLeccion.get(l.id) ?? [],
      // Modelo viejo (aún vivo): contenidos/actividades siguen congelándose.
      contenidos: contenidosPorLeccion.get(l.id) ?? [],
      actividades: actividadesPorLeccion.get(l.id) ?? [],
    });
    leccionesPorModulo.set(l.modulo_id, arr);
  }

  return {
    programa: prog ?? { id: programaId },
    modulos: modulos.map((m) => ({
      ...m,
      lecciones: leccionesPorModulo.get(m.id) ?? [],
    })),
    congelado_en_version: prog?.version ?? null,
  };
}

/**
 * Publica: congela el snapshot en la versión vigente y marca el programa como
 * 'publicado', todo en una transacción. `unique (programa_id, version)` impide
 * congelar dos veces la misma versión.
 */
export async function publicarConSnapshot(
  sql: Sql,
  args: {
    programaId: string;
    version: number;
    snapshot: Record<string, unknown>;
    notas: string | null;
    actorId: string | null;
  },
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      insert into lxp.programa_versiones
        (programa_id, version, snapshot, notas, publicado_por)
      values (${args.programaId}, ${args.version},
              ${tx.json(args.snapshot as Parameters<typeof tx.json>[0])},
              ${args.notas}, ${args.actorId})`;
    await tx`
      update lxp.programas set estado = 'publicado' where id = ${args.programaId}`;
  });
}

/** Cambia el estado (sin snapshot); opcionalmente abre una nueva versión de trabajo. */
export async function cambiarEstadoSimple(
  sql: Sql,
  programaId: string,
  estado: EstadoPublicacion,
  nuevaVersion: number | null,
): Promise<void> {
  if (nuevaVersion !== null) {
    await sql`
      update lxp.programas set estado = ${estado}, version = ${nuevaVersion}
      where id = ${programaId}`;
  } else {
    await sql`update lxp.programas set estado = ${estado} where id = ${programaId}`;
  }
}

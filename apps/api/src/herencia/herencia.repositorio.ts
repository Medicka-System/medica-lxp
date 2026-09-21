/**
 * Lecturas/escrituras de la herencia programa→grupo (§6 · Sprint 4.5). Arma el
 * árbol de la PLANTILLA (programa→módulos→lecciones→contenidos/actividades) y lee
 * los overrides del grupo, en formas ya listas para la lógica pura. La lógica de
 * dominio (herencia.logic) no conoce SQL.
 */
import type { Sql } from '@campus/db';
import type {
  EntidadOverride,
  LeccionTpl,
  ModuloTpl,
  OverrideCrudo,
  ProgramaTpl,
} from './herencia.types';

/** Datos del grupo relevantes para su vista efectiva. */
export interface GrupoInfo {
  id: string;
  nombre: string;
  modalidad: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  docente_id: string | null;
  programa_id: string;
}

/** Lee el grupo; `null` si no existe. */
export async function cargarGrupo(
  sql: Sql,
  grupoId: string,
): Promise<GrupoInfo | null> {
  const rows = await sql<GrupoInfo[]>`
    select id, nombre, modalidad::text as modalidad,
           fecha_inicio::text as fecha_inicio, fecha_fin::text as fecha_fin,
           docente_id, programa_id
    from lxp.grupos where id = ${grupoId}`;
  return rows[0] ?? null;
}

/**
 * Arma el árbol completo de la plantilla de un programa. Cuatro consultas planas
 * (una por nivel) ensambladas en memoria: evita N+1 y deja los datos ordenados.
 * `null` si el programa no existe.
 */
export async function cargarPlantilla(
  sql: Sql,
  programaId: string,
): Promise<ProgramaTpl | null> {
  const progRows = await sql<
    {
      id: string;
      nombre: string;
      descripcion: string | null;
      version: number;
      publicado: boolean;
    }[]
  >`
    select id, nombre, descripcion, version, publicado
    from lxp.programas where id = ${programaId}`;
  const prog = progRows[0];
  if (!prog) return null;

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

  // Modelo NUEVO (mig 0023): bloques de teoría por lección (passthrough en herencia).
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

  // Ensamblado en memoria (programa → módulos → lecciones → hijos).
  const leccionesPorModulo = new Map<string, LeccionTpl[]>();
  const leccionRef = new Map<string, LeccionTpl>();
  for (const l of lecciones) {
    const nodo: LeccionTpl = {
      id: l.id,
      nombre: l.nombre,
      descripcion: l.descripcion,
      orden: l.orden,
      // Modelo NUEVO (mig 0023): tipo/config/bloques heredados (passthrough).
      tipo: l.tipo,
      config: l.config,
      bloques: [],
      contenidos: [],
      actividades: [],
    };
    leccionRef.set(l.id, nodo);
    const arr = leccionesPorModulo.get(l.modulo_id) ?? [];
    arr.push(nodo);
    leccionesPorModulo.set(l.modulo_id, arr);
  }
  for (const b of bloques) {
    leccionRef.get(b.leccion_id)?.bloques?.push({
      id: b.id,
      orden: b.orden,
      tipo_bloque: b.tipo_bloque,
      config: b.config,
    });
  }
  for (const c of contenidos) {
    leccionRef.get(c.leccion_id)?.contenidos.push({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      recurso_ref: c.recurso_ref,
      cuerpo: c.cuerpo,
      orden: c.orden,
    });
  }
  for (const a of actividades) {
    leccionRef.get(a.leccion_id)?.actividades.push({
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      instrucciones: a.instrucciones,
      orden: a.orden,
    });
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

/** Overrides del grupo, tal cual viven en `lxp.grupo_overrides`. */
export async function cargarOverrides(
  sql: Sql,
  grupoId: string,
): Promise<OverrideCrudo[]> {
  const rows = await sql<
    {
      entidad: EntidadOverride;
      entidad_id: string;
      patch: Record<string, unknown>;
      aplicado_sobre_version: number;
    }[]
  >`
    select entidad, entidad_id, patch, aplicado_sobre_version
    from lxp.grupo_overrides where grupo_id = ${grupoId}`;
  return rows;
}

/**
 * Upsert de un override (uno por grupo+entidad+entidad_id · idx único 0012). Sella
 * la versión de la plantilla vigente para el aviso de re-sincronización posterior.
 */
export async function upsertOverride(
  sql: Sql,
  grupoId: string,
  o: {
    entidad: EntidadOverride;
    entidad_id: string;
    patch: Record<string, unknown>;
    version: number;
  },
): Promise<void> {
  await sql`
    insert into lxp.grupo_overrides
      (grupo_id, entidad, entidad_id, patch, aplicado_sobre_version)
    values (${grupoId}, ${o.entidad}, ${o.entidad_id}, ${sql.json(
      o.patch as Parameters<typeof sql.json>[0],
    )}, ${o.version})
    on conflict (grupo_id, entidad, entidad_id)
    do update set patch = excluded.patch,
                  aplicado_sobre_version = excluded.aplicado_sobre_version`;
}

/** Borra un override → la entidad vuelve a ser heredada. Devuelve cuántas filas. */
export async function borrarOverride(
  sql: Sql,
  grupoId: string,
  entidad: EntidadOverride,
  entidadId: string,
): Promise<number> {
  const res = await sql`
    delete from lxp.grupo_overrides
    where grupo_id = ${grupoId} and entidad = ${entidad} and entidad_id = ${entidadId}`;
  return res.count;
}

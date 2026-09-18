/**
 * Acceso a `lxp.rubricas` (catálogo reutilizable · mig 0018) y al enlace desde la
 * actividad (`actividades.rubrica_id`). Funciones puras sobre `sql` (postgres.js).
 * El LISTADO/lectura del catálogo es CRUD simple → va web→Supabase (§2); aquí solo
 * viven las escrituras con lógica (validación + disparo de RAG).
 */
import type { Sql } from '@campus/db';
import type { CriterioRubrica } from './rubrica.logic';

export interface RubricaFila {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  publicado: boolean;
  criterios: unknown;
}

export async function crearRubrica(
  sql: Sql,
  d: {
    nombre: string;
    tipo: 'estudios_reportes' | 'tareas';
    descripcion?: string | null;
    criterios: CriterioRubrica[];
    publicado?: boolean;
    creadoPor?: string | null;
  },
): Promise<RubricaFila> {
  const rows = await sql<RubricaFila[]>`
    insert into lxp.rubricas (nombre, tipo, descripcion, publicado, criterios, creado_por)
    values (
      ${d.nombre}, ${d.tipo}::lxp.rubrica_tipo, ${d.descripcion ?? null},
      ${d.publicado ?? false}, ${sql.json(d.criterios as never)}, ${d.creadoPor ?? null}
    )
    returning id, nombre, tipo::text as tipo, descripcion, publicado, criterios`;
  return rows[0];
}

export async function actualizarRubrica(
  sql: Sql,
  id: string,
  d: {
    nombre?: string;
    tipo?: 'estudios_reportes' | 'tareas';
    descripcion?: string | null;
    criterios?: CriterioRubrica[];
    publicado?: boolean;
  },
): Promise<RubricaFila | null> {
  const rows = await sql<RubricaFila[]>`
    update lxp.rubricas set
      nombre = coalesce(${d.nombre ?? null}, nombre),
      tipo = coalesce(${d.tipo ?? null}::lxp.rubrica_tipo, tipo),
      descripcion = ${d.descripcion === undefined ? sql`descripcion` : d.descripcion},
      publicado = coalesce(${d.publicado ?? null}, publicado),
      criterios = ${d.criterios === undefined ? sql`criterios` : sql.json(d.criterios as never)}
    where id = ${id}
    returning id, nombre, tipo::text as tipo, descripcion, publicado, criterios`;
  return rows[0] ?? null;
}

/** Enlaza una rúbrica del catálogo a una actividad (vínculo reutilizable · §5B). */
export async function asignarRubricaAActividad(
  sql: Sql,
  actividadId: string,
  rubricaId: string | null,
): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    update lxp.actividades set rubrica_id = ${rubricaId}
    where id = ${actividadId}
    returning id`;
  return rows.length > 0;
}

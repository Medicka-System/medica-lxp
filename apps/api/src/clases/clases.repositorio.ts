/**
 * Repositorio de clases y videoteca-de-grabación (§6 · esquema `lxp`). Funciones puras
 * sobre `sql` (postgres.js). Solo lo que el dominio de clases / la ingesta de Zoom
 * necesitan escribir; el listado de clases va web→Supabase.
 */
import type { Sql } from '@campus/db';

export interface ClaseFila {
  id: string;
  grupo_id: string;
  leccion_id: string | null;
  docente_id: string | null;
  titulo: string;
  estado: string;
  enlace_union: string | null;
  enlace_inicio: string | null;
  reunion_externa_id: string | null;
}

export interface InsertarClaseDatos {
  grupoId: string;
  leccionId?: string;
  docenteId?: string;
  plataforma: 'zoom' | 'mico_plus';
  titulo: string;
  descripcion?: string;
  inicioProgramado?: string;
  duracionMin?: number;
  reunionExternaId?: string;
  enlaceUnion?: string;
  enlaceInicio?: string;
  reunionExterna?: unknown;
}

/** Inserta una clase agendada y devuelve la fila creada. */
export async function insertarClase(
  sql: Sql,
  d: InsertarClaseDatos,
): Promise<ClaseFila> {
  const rows = await sql<ClaseFila[]>`
    insert into lxp.clases
      (grupo_id, leccion_id, docente_id, plataforma, titulo, descripcion,
       inicio_programado, duracion_min, estado, reunion_externa_id,
       enlace_union, enlace_inicio, reunion_externa)
    values (
      ${d.grupoId}, ${d.leccionId ?? null}, ${d.docenteId ?? null},
      ${d.plataforma}::lxp.clase_plataforma, ${d.titulo}, ${d.descripcion ?? null},
      ${d.inicioProgramado ?? null}, ${d.duracionMin ?? null}, 'agendada',
      ${d.reunionExternaId ?? null}, ${d.enlaceUnion ?? null},
      ${d.enlaceInicio ?? null},
      ${d.reunionExterna ? sql.json(d.reunionExterna as Parameters<typeof sql.json>[0]) : null}
    )
    returning id, grupo_id, leccion_id, docente_id, titulo, estado::text as estado,
              enlace_union, enlace_inicio, reunion_externa_id`;
  return rows[0] as ClaseFila;
}

/** Carga una clase por id. */
export async function cargarClase(
  sql: Sql,
  claseId: string,
): Promise<ClaseFila | null> {
  const rows = await sql<ClaseFila[]>`
    select id, grupo_id, leccion_id, docente_id, titulo, estado::text as estado,
           enlace_union, enlace_inicio, reunion_externa_id
    from lxp.clases where id = ${claseId}`;
  return rows[0] ?? null;
}

/** Marca la clase como `en_curso` (el docente la inició). */
export async function marcarClaseEnCurso(sql: Sql, claseId: string): Promise<void> {
  await sql`update lxp.clases set estado = 'en_curso' where id = ${claseId}`;
}

/** Resuelve una clase por el id de reunión externa (para el webhook de grabación). */
export async function cargarClasePorReunion(
  sql: Sql,
  reunionExternaId: string,
): Promise<ClaseFila | null> {
  const rows = await sql<ClaseFila[]>`
    select id, grupo_id, leccion_id, docente_id, titulo, estado::text as estado,
           enlace_union, enlace_inicio, reunion_externa_id
    from lxp.clases where reunion_externa_id = ${reunionExternaId} limit 1`;
  return rows[0] ?? null;
}

export interface VideotecaGrabacionFila {
  id: string;
  grupo_id: string | null;
  leccion_id: string | null;
}

/**
 * Crea la fila de videoteca de una grabación en estado `procesando` (el binario aún
 * está en Zoom). El worker `ingesta-grabacion-zoom` la marcará `listo` tras subirla.
 */
export async function insertarGrabacionProcesando(
  sql: Sql,
  clase: ClaseFila,
  fuenteExterna: unknown,
): Promise<VideotecaGrabacionFila> {
  const rows = await sql<VideotecaGrabacionFila[]>`
    insert into lxp.videoteca
      (titulo, origen, estado, grupo_id, leccion_id, clase_id, created_by, fuente_externa)
    values (
      ${`Grabación · ${clase.titulo}`}, 'zoom', 'procesando',
      ${clase.grupo_id}, ${clase.leccion_id}, ${clase.id}, ${clase.docente_id},
      ${fuenteExterna ? sql.json(fuenteExterna as Parameters<typeof sql.json>[0]) : null}
    )
    returning id, grupo_id, leccion_id`;
  return rows[0] as VideotecaGrabacionFila;
}

/**
 * Repositorio de la autoevaluación (§6 · esquema `lxp`). Funciones puras sobre `sql`
 * (postgres.js) que:
 *   · leen el examen del MODELO NUEVO (`lxp.lecciones.tipo` + `config` jsonb · mig 0023),
 *   · aseguran una actividad-puente de respaldo (para anclar la entrega mientras
 *     `entregas.actividad_id` siga NOT NULL · mig 0026 fase 3),
 *   · persisten la entrega del alumno (upsert por actividad+alumno).
 *
 * Corre con la conexión del `api` (service_role en prod): puede crear la actividad de
 * respaldo aunque el alumno no tenga permiso de autoría (RLS `es_autoria`).
 */
import type { Sql } from '@campus/db';
import type { ReactivoGradable, TipoReactivoGradable } from '@campus/shared';

/** Examen cargado desde el modelo nuevo, listo para calificar. */
export interface LeccionAutoeval {
  leccionId: string;
  nombre: string;
  /** Tipo de la lección (debe ser `autoevaluacion`). */
  tipo: string;
  /** Reactivos gradables extraídos de `config.reactivos`. */
  reactivos: ReactivoGradable[];
  /** Actividad-puente ya registrada en `config.actividadId` (o null). */
  actividadId: string | null;
}

const TIPOS = new Set<TipoReactivoGradable>([
  'opcion_multiple',
  'multi',
  'verdadero_falso',
  'abierta',
]);

/** Extrae los reactivos GRADABLES del `config` crudo (defensivo · misma forma que web). */
function extraerReactivos(config: Record<string, unknown>): ReactivoGradable[] {
  const raw = Array.isArray(config.reactivos) ? (config.reactivos as unknown[]) : [];
  const out: ReactivoGradable[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id ? o.id : null;
    if (!id) continue;
    const tipo: TipoReactivoGradable = TIPOS.has(o.tipo as TipoReactivoGradable)
      ? (o.tipo as TipoReactivoGradable)
      : 'opcion_multiple';
    const correcta =
      tipo === 'abierta'
        ? null
        : Array.isArray(o.correcta)
          ? (o.correcta as unknown[]).map(String)
          : o.correcta != null
            ? String(o.correcta)
            : null;
    const puntajeNum = Number(o.puntaje);
    out.push({
      id,
      tipo,
      correcta,
      puntaje: Number.isFinite(puntajeNum) && puntajeNum > 0 ? puntajeNum : 1,
      dominio: typeof o.dominio === 'string' && o.dominio ? o.dominio : undefined,
      retro: typeof o.retro === 'string' && o.retro.trim() ? o.retro.trim() : undefined,
    });
  }
  return out;
}

/** Carga la lección autoevaluación (tipo + config del modelo nuevo). */
export async function cargarLeccionAutoeval(
  sql: Sql,
  leccionId: string,
): Promise<LeccionAutoeval | null> {
  const rows = await sql<
    { id: string; nombre: string; tipo: string; config: Record<string, unknown> | null }[]
  >`
    select id, nombre, tipo::text as tipo, config
    from lxp.lecciones
    where id = ${leccionId}
    limit 1`;
  const l = rows[0];
  if (!l) return null;
  const config = (l.config ?? {}) as Record<string, unknown>;
  return {
    leccionId: l.id,
    nombre: l.nombre,
    tipo: l.tipo,
    reactivos: extraerReactivos(config),
    actividadId: typeof config.actividadId === 'string' ? config.actividadId : null,
  };
}

/**
 * Asegura una actividad de respaldo tipo `autoevaluacion` para la lección y devuelve
 * su id. Reutiliza la de `config.actividadId` (convención del import · autoeval-contrato)
 * o una existente; si no hay, la crea y fija el puntero en `config.actividadId`.
 */
export async function asegurarActividadAutoeval(
  sql: Sql,
  leccionId: string,
  actividadId: string | null,
  titulo: string,
): Promise<string> {
  if (actividadId) {
    const ok = await sql<{ id: string }[]>`
      select id from lxp.actividades where id = ${actividadId} limit 1`;
    if (ok[0]) return ok[0].id;
  }
  const existente = await sql<{ id: string }[]>`
    select id from lxp.actividades
    where leccion_id = ${leccionId} and tipo = 'autoevaluacion'::lxp.actividad_tipo
    order by orden, created_at
    limit 1`;
  if (existente[0]) {
    await fijarActividadEnConfig(sql, leccionId, existente[0].id);
    return existente[0].id;
  }
  const creada = await sql<{ id: string }[]>`
    insert into lxp.actividades (leccion_id, tipo, titulo, orden)
    values (${leccionId}, 'autoevaluacion'::lxp.actividad_tipo, ${titulo}, 0)
    returning id`;
  const nuevo = creada[0]!.id;
  await fijarActividadEnConfig(sql, leccionId, nuevo);
  return nuevo;
}

async function fijarActividadEnConfig(
  sql: Sql,
  leccionId: string,
  actividadId: string,
): Promise<void> {
  await sql`
    update lxp.lecciones
    set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('actividadId', ${actividadId}::text)
    where id = ${leccionId}`;
}

/** Datos para persistir la entrega de la autoevaluación. */
export interface RegistrarEntregaDatos {
  actividadId: string;
  leccionId: string;
  alumnoId: string;
  /** Contenido jsonb: respuestas del alumno + resumen de la autocalificación. */
  contenido: Record<string, unknown>;
  /** Nota 0..10 de la parte objetiva (o null si no hay objetivas). */
  nota: number | null;
  /** `calificada` si todo era objetivo; `enviada` si hay abiertas por revisar. */
  estado: 'calificada' | 'enviada';
}

/**
 * Upsert de la entrega del alumno (anclada por lección · modelo nuevo, y por
 * actividad de respaldo). `eco_sugerida` = false: la nota objetiva la puso el motor
 * determinista, no Eco. Re-intentar sobre-escribe el intento anterior.
 */
export async function registrarEntregaAutoeval(
  sql: Sql,
  d: RegistrarEntregaDatos,
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into lxp.entregas
      (actividad_id, leccion_id, id_alumno, contenido, nota, estado, eco_sugerida)
    values (
      ${d.actividadId}, ${d.leccionId}, ${d.alumnoId},
      ${sql.json(d.contenido as Parameters<typeof sql.json>[0])},
      ${d.nota}, ${d.estado}::lxp.entrega_estado, false
    )
    on conflict (actividad_id, id_alumno) do update set
      leccion_id  = excluded.leccion_id,
      contenido   = excluded.contenido,
      nota        = excluded.nota,
      estado      = excluded.estado,
      eco_sugerida = false,
      updated_at  = now()
    returning id`;
  return rows[0]!.id;
}

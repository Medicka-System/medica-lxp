/**
 * Tool de RECOPILACIÓN (§7A, paso 1: "recopila las entregas/casos del grupo —
 * nunca un LLM"). SQL puro contra `lxp`: arma los `ItemEvaluable` base (respuesta,
 * tipo, rúbrica, clave objetiva) que el pipeline evaluará. La verdad del caso la
 * añade después el tool de RAG.
 *
 * Modelo NUEVO (mig 0023/0026): la entrega se ANCLA a la lección (`entregas.leccion_id`)
 * y su tipo/rúbrica/reactivos viven en `lxp.lecciones.tipo` + `lxp.lecciones.config`.
 * La rúbrica de una tarea es una referencia al CATÁLOGO (`config.rubricaId` →
 * `lxp.rubricas`, mig 0018); la clave objetiva de una autoevaluación vive en
 * `config.reactivos[]` (cada reactivo con su `id` + `correcta`).
 *
 * Modelo VIEJO (aún vivo): si la entrega no tiene `leccion_id` (contenido previo),
 * se cae al camino por `actividad_id` → `actividades`/`rubricas.actividad_id`/
 * `lxp.reactivos`. Ninguna tabla vieja se dropeó; solo se prefiere el nuevo anclaje.
 */
import type { Sql } from '@campus/db';
import type { CriterioRubrica, ItemEvaluable, ClaveObjetiva } from '../pipeline/tipos';

/** Entregas de una lección/actividad (o de todo un grupo) pendientes de calificar. */
export async function recopilarEntregas(
  sql: Sql,
  params: { grupoId: string; leccionId?: string; actividadId?: string },
): Promise<ItemEvaluable[]> {
  const rows = await sql<
    {
      id: string;
      id_alumno: string;
      grupo_id: string | null;
      contenido: unknown;
      // Modelo nuevo (lección · mig 0023/0026).
      leccion_tipo: string | null;
      leccion_config: unknown;
      leccion_rubrica_criterios: unknown;
      // Modelo viejo (actividad · mig 0003) — fallback si no hay leccion_id.
      actividad_tipo: 'tarea' | 'autoevaluacion' | 'foro' | null;
      actividad_criterios: unknown;
      actividad_clave_reactivos: unknown;
    }[]
  >`
    select e.id,
           e.id_alumno,
           e.grupo_id,
           e.contenido,
           -- ── Modelo NUEVO: la lección es la fuente de verdad (tipo + config) ──
           l.tipo::text as leccion_tipo,
           l.config     as leccion_config,
           -- Rúbrica del catálogo referenciada por la tarea (config.rubricaId).
           (
             select rc.criterios
             from lxp.rubricas rc
             where rc.id = nullif(l.config->>'rubricaId', '')::uuid
             limit 1
           ) as leccion_rubrica_criterios,
           -- ── Modelo VIEJO: se resuelve por actividad_id (compat) ──
           a.tipo::text as actividad_tipo,
           coalesce(r.criterios, '[]'::jsonb) as actividad_criterios,
           coalesce((
             select jsonb_object_agg(rx.id::text, rx.correcta)
             from lxp.reactivos rx
             where rx.actividad_id = a.id and rx.correcta is not null
           ), '{}'::jsonb) as actividad_clave_reactivos
    from lxp.entregas e
    left join lxp.lecciones l on l.id = e.leccion_id
    left join lxp.actividades a on a.id = e.actividad_id
    -- Vínculo canónico por catálogo (a.rubrica_id); fallback a la rúbrica inline
    -- deprecada (r.actividad_id) para compat con contenido previo (§5B · mig 0018).
    left join lxp.rubricas r
      on r.id = a.rubrica_id
      or (a.rubrica_id is null and r.actividad_id = a.id)
    where e.grupo_id = ${params.grupoId}
      and e.estado in ('enviada', 'pendiente')
      ${params.leccionId ? sql`and e.leccion_id = ${params.leccionId}` : sql``}
      ${params.actividadId ? sql`and e.actividad_id = ${params.actividadId}` : sql``}
    order by e.created_at asc`;

  return rows.map((f) => {
    // Preferimos el modelo NUEVO (anclaje por lección) cuando la entrega lo tiene.
    if (f.leccion_tipo) {
      const actividadTipo = tipoLeccionAActividad(f.leccion_tipo);
      const rubrica = criteriosDeRubrica(f.leccion_rubrica_criterios);
      const claveObjetiva = claveDeReactivosConfig(f.leccion_config);
      return {
        tipo: 'entrega' as const,
        id: f.id,
        alumnoId: f.id_alumno,
        grupoId: f.grupo_id ?? params.grupoId,
        actividadTipo,
        respuesta: f.contenido,
        claveObjetiva,
        rubrica,
      };
    }

    // Fallback al modelo VIEJO (actividad), aún vivo.
    const { rubrica, clave } = separarRubricaYClave(f.actividad_criterios);
    // La clave objetiva la fija PRIMERO el banco de reactivos (import · mig 0018);
    // si no hay, cae a la clave embebida en la rúbrica (convención previa).
    const claveObjetiva = claveDeReactivos(f.actividad_clave_reactivos) ?? clave;
    return {
      tipo: 'entrega' as const,
      id: f.id,
      alumnoId: f.id_alumno,
      grupoId: f.grupo_id ?? params.grupoId,
      actividadTipo: f.actividad_tipo ?? undefined,
      respuesta: f.contenido,
      claveObjetiva,
      rubrica,
    };
  });
}

/** Mapea el enum de 7 tipos de lección (mig 0023) al union evaluable (tarea/autoeval/foro). */
function tipoLeccionAActividad(
  tipo: string,
): 'tarea' | 'autoevaluacion' | 'foro' | undefined {
  if (tipo === 'tarea' || tipo === 'autoevaluacion' || tipo === 'foro') return tipo;
  return undefined; // video/teoria/h5p/xapi no producen entregas evaluables aquí.
}

/** Criterios de una rúbrica del catálogo (jsonb `criterios` = [{criterio, descripcion, peso}]). */
function criteriosDeRubrica(v: unknown): CriterioRubrica[] {
  if (!Array.isArray(v)) return [];
  const out: CriterioRubrica[] = [];
  for (const c of v) {
    if (c && typeof c === 'object' && 'criterio' in c) out.push(c as CriterioRubrica);
  }
  return out;
}

/**
 * Clave objetiva desde el banco de reactivos del modelo NUEVO (`config.reactivos[]`).
 * Cada reactivo lleva `id` estable del editor + `correcta` (str | str[] | null); las
 * abiertas (correcta null) se omiten (las juzga Sonnet, no el autocalificador · §7A).
 */
function claveDeReactivosConfig(config: unknown): ClaveObjetiva | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  const reactivos = (config as Record<string, unknown>).reactivos;
  if (!Array.isArray(reactivos)) return null;
  const correctas: Record<string, string | string[]> = {};
  for (const raw of reactivos) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === 'string' && r.id ? r.id : null;
    if (!id) continue;
    const c = r.correcta;
    if (c == null) continue; // abierta → no auto-calificable
    correctas[id] = Array.isArray(c) ? c.map(String) : String(c);
  }
  return Object.keys(correctas).length ? { correctas } : null;
}

/** Arma la clave objetiva a partir del banco de reactivos viejo (`{reactivoId: correcta}`). */
function claveDeReactivos(v: unknown): ClaveObjetiva | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const correctas = v as Record<string, string | string[]>;
  return Object.keys(correctas).length ? { correctas } : null;
}

/** Casos de bitácora pendientes de validación de un grupo. */
export async function recopilarCasos(
  sql: Sql,
  params: { grupoId: string },
): Promise<ItemEvaluable[]> {
  const rows = await sql<
    {
      id: string;
      id_alumno: string;
      grupo_id: string | null;
      organo: string | null;
      dominio_iaim: string | null;
      hallazgos: string | null;
      diagnostico_presuntivo: string | null;
    }[]
  >`
    select id, id_alumno, grupo_id, organo, dominio_iaim,
           hallazgos, diagnostico_presuntivo
    from lxp.bitacora_casos
    where grupo_id = ${params.grupoId}
      and estado_validacion = 'pendiente'
    order by created_at asc`;

  return rows.map((f) => ({
    tipo: 'caso' as const,
    id: f.id,
    alumnoId: f.id_alumno,
    grupoId: f.grupo_id ?? params.grupoId,
    // El "respuesta" del alumno en un caso = sus hallazgos + diagnóstico presuntivo.
    respuesta: {
      organo: f.organo,
      dominio_iaim: f.dominio_iaim,
      hallazgos: f.hallazgos,
      diagnostico_presuntivo: f.diagnostico_presuntivo,
    },
    claveObjetiva: null,
  }));
}

/**
 * La rúbrica (jsonb `criterios`) puede llevar embebida una clave de auto-calificación
 * bajo `{ "clave": { "correctas": {...} } }` (convención del diseñador para quizzes).
 * La separamos: los criterios "de verdad" van a la rúbrica; la clave, a auto-calif.
 */
function separarRubricaYClave(criterios: unknown): {
  rubrica: CriterioRubrica[];
  clave: ClaveObjetiva | null;
} {
  if (!Array.isArray(criterios)) return { rubrica: [], clave: null };
  const rubrica: CriterioRubrica[] = [];
  let clave: ClaveObjetiva | null = null;
  for (const c of criterios) {
    if (c && typeof c === 'object' && 'clave' in c) {
      const posible = (c as { clave: unknown }).clave;
      if (posible && typeof posible === 'object' && 'correctas' in posible) {
        clave = posible as ClaveObjetiva;
      }
      continue;
    }
    if (c && typeof c === 'object' && 'criterio' in c) {
      rubrica.push(c as CriterioRubrica);
    }
  }
  return { rubrica, clave };
}

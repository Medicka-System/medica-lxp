/**
 * Tool de RECOPILACIÓN (§7A, paso 1: "recopila las entregas/casos del grupo —
 * nunca un LLM"). SQL puro contra `lxp`: arma los `ItemEvaluable` base (respuesta,
 * tipo, rúbrica, clave objetiva) que el pipeline evaluará. La verdad del caso la
 * añade después el tool de RAG.
 */
import type { Sql } from '@campus/db';
import type { CriterioRubrica, ItemEvaluable, ClaveObjetiva } from '../pipeline/tipos';

/** Entregas de una actividad (o de todo un grupo) pendientes de calificar. */
export async function recopilarEntregas(
  sql: Sql,
  params: { grupoId: string; actividadId?: string },
): Promise<ItemEvaluable[]> {
  const rows = await sql<
    {
      id: string;
      id_alumno: string;
      grupo_id: string | null;
      actividad_id: string;
      actividad_tipo: 'tarea' | 'autoevaluacion' | 'foro';
      contenido: unknown;
      criterios: unknown;
    }[]
  >`
    select e.id,
           e.id_alumno,
           e.grupo_id,
           e.actividad_id,
           a.tipo::text as actividad_tipo,
           e.contenido,
           coalesce(r.criterios, '[]'::jsonb) as criterios
    from lxp.entregas e
    join lxp.actividades a on a.id = e.actividad_id
    left join lxp.rubricas r on r.actividad_id = a.id
    where e.grupo_id = ${params.grupoId}
      and e.estado in ('enviada', 'pendiente')
      ${params.actividadId ? sql`and e.actividad_id = ${params.actividadId}` : sql``}
    order by e.created_at asc`;

  return rows.map((f) => {
    const { rubrica, clave } = separarRubricaYClave(f.criterios);
    return {
      tipo: 'entrega' as const,
      id: f.id,
      alumnoId: f.id_alumno,
      grupoId: f.grupo_id ?? params.grupoId,
      actividadTipo: f.actividad_tipo,
      respuesta: f.contenido,
      claveObjetiva: clave,
      rubrica,
    };
  });
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

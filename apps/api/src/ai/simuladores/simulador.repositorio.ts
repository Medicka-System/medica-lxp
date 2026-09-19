/**
 * Persistencia de la sesión de simulador (§7A · Sprint 7). SQL puro contra `lxp`:
 *   · `cargarCasoVerdad`  — trae la VERDAD ESTRUCTURADA del caso curado (0005) contra
 *     la que Eco evalúa (nunca un LLM · §7A, paso 2).
 *   · `guardarSesion`     — registra el intento en `lxp.sesiones_simulador` (0019).
 *   · `nivelDominio`      — nivel de competencia vigente del alumno en el dominio
 *     (para mostrar contexto en el feedback; la proyección la escribe el worker).
 *
 * Corre con la conexión del `api` (service_role · omite RLS). El alumno LEE su
 * historial bajo RLS desde `web` (0019).
 */
import type { Sql } from '@campus/db';
import type { CasoVerdad, TipoSimulador } from './simulador.tipos';

/** Normaliza un jsonb (array de strings, o texto) a `string[]`. Tolerante. */
export function comoLista(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

/** Carga la verdad estructurada de un caso PUBLICADO del banco. `null` si no existe. */
export async function cargarCasoVerdad(sql: Sql, casoId: string): Promise<CasoVerdad | null> {
  const rows = await sql<
    {
      id: string;
      titulo: string;
      organo: string | null;
      dominio_iaim: string | null;
      hallazgos_clave: unknown;
      diagnostico_correcto: string | null;
      puntos_aprendizaje: unknown;
      errores_comunes: unknown;
    }[]
  >`
    select id, titulo, organo, dominio_iaim::text as dominio_iaim,
           hallazgos_clave, diagnostico_correcto, puntos_aprendizaje, errores_comunes
    from lxp.casos_biblioteca
    where id = ${casoId} and publicado
    limit 1`;
  const f = rows[0];
  if (!f) return null;
  return {
    id: f.id,
    titulo: f.titulo,
    organo: f.organo,
    dominioIaim: f.dominio_iaim,
    hallazgosClave: comoLista(f.hallazgos_clave),
    diagnosticoCorrecto: f.diagnostico_correcto,
    puntosAprendizaje: comoLista(f.puntos_aprendizaje),
    erroresComunes: comoLista(f.errores_comunes),
  };
}

/** Datos para persistir un intento evaluado. */
export interface SesionAGuardar {
  alumnoId: string;
  casoId: string;
  tipo: TipoSimulador;
  dominioIaim: string | null;
  respuesta: unknown;
  evaluacion: unknown;
  puntaje: number | null;
}

/** Inserta la sesión evaluada y devuelve su id. */
export async function guardarSesion(sql: Sql, s: SesionAGuardar): Promise<{ sesionId: string }> {
  const rows = await sql<{ id: string }[]>`
    insert into lxp.sesiones_simulador
      (id_alumno, caso_biblioteca_id, tipo, dominio_iaim, estado,
       respuesta, evaluacion, puntaje, evaluada_en)
    values (
      ${s.alumnoId},
      ${s.casoId},
      ${s.tipo}::lxp.simulador_tipo,
      ${s.dominioIaim ? sql`${s.dominioIaim}::lxp.dominio_iaim` : sql`null`},
      'evaluada',
      ${sql.json(s.respuesta as never)},
      ${sql.json(s.evaluacion as never)},
      ${s.puntaje},
      now()
    )
    returning id`;
  return { sesionId: rows[0].id };
}

/** Nivel de competencia vigente (0..100) del alumno en un dominio, o `null`. */
export async function nivelDominio(
  sql: Sql,
  alumnoId: string,
  dominioIaim: string | null,
): Promise<number | null> {
  if (!dominioIaim) return null;
  const rows = await sql<{ nivel: number }[]>`
    select nivel::float8 as nivel
    from lxp.competencia_dominios
    where id_alumno = ${alumnoId} and dominio_iaim = ${dominioIaim}::lxp.dominio_iaim
    limit 1`;
  return rows[0]?.nivel ?? null;
}

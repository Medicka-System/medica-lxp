/**
 * Consultas de lectura compartidas por los jobs de dominio. Devuelven datos ya
 * mapeados a los tipos puros del motor (`@campus/shared`), para que la lógica no
 * dependa de la forma de las filas.
 */
import type { Sql } from '@campus/db';
import type { CasoParaCompetencia, DominioIaim } from '@campus/shared';

/** Casos aprobados del alumno, listos para el motor de competencia. */
export async function casosAprobados(
  sql: Sql,
  alumnoId: string,
): Promise<CasoParaCompetencia[]> {
  // Fecha de práctica = created_at (cuándo se realizó/registró el caso). NO
  // updated_at: un trigger lo reescribe en cada edición, así que no refleja la
  // práctica y rompería la curva de olvido.
  const rows = await sql<
    { dominio_iaim: DominioIaim; horas_estimadas: number; fecha: Date }[]
  >`
    select dominio_iaim,
           horas_estimadas::float8 as horas_estimadas,
           created_at as fecha
    from lxp.bitacora_casos
    where id_alumno = ${alumnoId}
      and estado_validacion = 'aprobado'
      and dominio_iaim is not null`;
  return rows.map((r) => ({
    dominio_iaim: r.dominio_iaim,
    horas_estimadas: r.horas_estimadas,
    fecha: r.fecha.toISOString(),
  }));
}

/** Total de horas de competencia acumuladas (proyección) del alumno. */
export async function horasDeCompetencia(sql: Sql, alumnoId: string): Promise<number> {
  const rows = await sql<{ horas: number }[]>`
    select coalesce(sum(horas), 0)::float8 as horas
    from lxp.competencia_dominios where id_alumno = ${alumnoId}`;
  return rows[0]?.horas ?? 0;
}

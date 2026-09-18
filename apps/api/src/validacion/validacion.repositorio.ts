/**
 * Lecturas/escrituras del flujo de VALIDACIÓN del docente (§5B/§6/§7A · Sprint 5).
 * Es el pivote transaccional del loop de práctica: fija la decisión clínica en
 * `lxp.validaciones` y el estado del caso en `lxp.bitacora_casos` de forma atómica.
 * Las side-effects de dominio (competencia + xAPI) las orquesta el servicio.
 */
import type { Sql } from '@campus/db';

/** Decisión clínica del docente sobre un caso (enum `lxp.decision_validacion`). */
export type DecisionValidacion = 'aprobado' | 'rechazado';

/** Caso de bitácora visto por el flujo de validación. */
export interface CasoValidacion {
  id: string;
  id_alumno: string;
  estado_validacion: 'pendiente' | 'aprobado' | 'rechazado';
}

/** Carga el caso (id + alumno + estado). `null` si no existe. */
export async function cargarCasoValidacion(
  sql: Sql,
  casoId: string,
): Promise<CasoValidacion | null> {
  const rows = await sql<CasoValidacion[]>`
    select id,
           id_alumno,
           estado_validacion::text as estado_validacion
    from lxp.bitacora_casos
    where id = ${casoId}`;
  return rows[0] ?? null;
}

/** Datos para asentar una validación. */
export interface RegistroValidacion {
  casoId: string;
  docenteId: string;
  decision: DecisionValidacion;
  feedback?: string;
  /** Loop de mejora de Eco (§7A): qué corrigió el docente sobre la sugerencia. */
  correccionSobreEco?: unknown;
}

/**
 * Asienta la validación en una sola transacción: actualiza el estado del caso e
 * inserta la fila de `validaciones` (traza auditable de la decisión + corrección a
 * Eco). Devuelve el id de la validación creada.
 */
export async function registrarValidacion(
  sql: Sql,
  r: RegistroValidacion,
): Promise<{ validacionId: string }> {
  return sql.begin(async (tx) => {
    await tx`
      update lxp.bitacora_casos
      set estado_validacion = ${r.decision}::lxp.estado_validacion
      where id = ${r.casoId}`;

    const rows = await tx<{ id: string }[]>`
      insert into lxp.validaciones
        (caso_id, id_docente, decision, feedback, correccion_sobre_eco)
      values (
        ${r.casoId},
        ${r.docenteId},
        ${r.decision}::lxp.decision_validacion,
        ${r.feedback ?? null},
        ${r.correccionSobreEco == null ? null : tx.json(r.correccionSobreEco as never)}
      )
      returning id`;

    return { validacionId: rows[0].id };
  }) as Promise<{ validacionId: string }>;
}

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

/**
 * PUENTE bitácora→banco (§5B): al APROBAR, promueve el caso del alumno al banco curado
 * (`casos_biblioteca`, "por curar" · `publicado=false`, sin curador asignado). Copia la
 * ficha, la VERDAD ESTRUCTURADA (`contenido_estructurado`, verbatim · no se aplana) y el
 * estudio YA anonimizado (series + traza §10) — el binario ya vive redactado en object
 * storage; aquí solo se referencia (al publicar a Biblioteca se congela). El curador
 * (docente) estructura los hallazgos_clave/puntos/errores y ajusta el catálogo antes de
 * publicar. IDEMPOTENTE: `on conflict` sobre el índice único de `origen_caso_id` (0040)
 * no duplica si se re-aprueba. Devuelve el id del caso curado (nuevo o existente).
 */
export async function promoverCasoABanco(
  sql: Sql,
  casoId: string,
): Promise<{ casoBancoId: string; creado: boolean }> {
  // Título por defecto: patología → órgano → primeras palabras de los hallazgos.
  const insertadas = await sql<{ id: string }[]>`
    insert into lxp.casos_biblioteca
      (curador_id, titulo, organo, dominio_iaim, patologia, tecnica, equipo, vineta,
       etiquetas, diagnostico_correcto, contenido_estructurado,
       estudio_estado, estudio_series, anonimizacion, anonimizado_en,
       origen_caso_id, publicado)
    select
      null,
      coalesce(nullif(btrim(coalesce(b.patologia, b.organo, left(b.hallazgos, 60))), ''), 'Caso del alumno'),
      b.organo, b.dominio_iaim, b.patologia, b.tecnica, b.equipo, b.vineta,
      b.etiquetas, b.diagnostico_presuntivo, b.contenido_estructurado,
      b.estudio_estado, b.estudio_series, b.anonimizacion, b.anonimizado_en,
      b.id, false
    from lxp.bitacora_casos b
    where b.id = ${casoId}
    on conflict (origen_caso_id) where origen_caso_id is not null do nothing
    returning id`;

  if (insertadas[0]) return { casoBancoId: insertadas[0].id, creado: true };

  // Ya existía (re-aprobación): devuelve el caso curado ligado a este origen.
  const existentes = await sql<{ id: string }[]>`
    select id from lxp.casos_biblioteca where origen_caso_id = ${casoId} limit 1`;
  return { casoBancoId: existentes[0]?.id ?? '', creado: false };
}

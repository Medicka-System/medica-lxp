/**
 * Persistencia de la BANDEJA de Eco (`lxp.eco_propuestas` · §7A). Guarda los
 * BORRADORES que el pipeline produjo, separados por confianza. Re-analizar un
 * objeto REEMPLAZA su propuesta vigente (ON CONFLICT) — no acumula basura.
 *
 * Estas filas NO son notas: son propuestas. El asentado (nota real) lo hace
 * `CorreccionesService` cuando el docente confirma.
 */
import type { Sql } from '@campus/db';
import type { PropuestaEco } from './tipos';

export interface PropuestaGuardada extends PropuestaEco {
  propuestaId: string;
}

/** Upsert de una propuesta (una vigente por objeto). Devuelve su id. */
export async function guardarPropuesta(
  sql: Sql,
  p: PropuestaEco,
): Promise<{ propuestaId: string }> {
  const rows = await sql<{ id: string }[]>`
    insert into lxp.eco_propuestas
      (objeto_tipo, objeto_id, id_alumno, grupo_id, nota_sugerida,
       feedback_borrador, confianza_score, clasificacion, detalle, estado)
    values (
      ${p.objetoTipo}::lxp.eco_propuesta_objeto,
      ${p.objetoId},
      ${p.alumnoId ?? null},
      ${p.grupoId ?? null},
      ${p.notaSugerida},
      ${p.feedbackBorrador},
      ${p.confianza},
      ${p.clasificacion}::lxp.eco_confianza,
      ${sql.json(p.detalle as never)},
      'propuesta'
    )
    on conflict (objeto_tipo, objeto_id) do update
      set id_alumno        = excluded.id_alumno,
          grupo_id         = excluded.grupo_id,
          nota_sugerida    = excluded.nota_sugerida,
          feedback_borrador = excluded.feedback_borrador,
          confianza_score  = excluded.confianza_score,
          clasificacion    = excluded.clasificacion,
          detalle          = excluded.detalle,
          -- Re-analizar reabre la propuesta (vuelve a 'propuesta').
          estado           = 'propuesta',
          updated_at       = now()
    returning id`;
  return { propuestaId: rows[0].id };
}

/** Carga una propuesta por id (para confirmar/descartar). `null` si no existe. */
export async function cargarPropuesta(
  sql: Sql,
  propuestaId: string,
): Promise<
  | {
      id: string;
      objeto_tipo: 'entrega' | 'caso';
      objeto_id: string;
      id_alumno: string | null;
      nota_sugerida: number | null;
      feedback_borrador: string | null;
      estado: string;
      detalle: unknown;
    }
  | null
> {
  const rows = await sql<
    {
      id: string;
      objeto_tipo: 'entrega' | 'caso';
      objeto_id: string;
      id_alumno: string | null;
      nota_sugerida: number | null;
      feedback_borrador: string | null;
      estado: string;
      detalle: unknown;
    }[]
  >`
    select id, objeto_tipo::text as objeto_tipo, objeto_id, id_alumno,
           nota_sugerida::float8 as nota_sugerida, feedback_borrador,
           estado::text as estado, detalle
    from lxp.eco_propuestas
    where id = ${propuestaId}`;
  return rows[0] ?? null;
}

/** Marca la propuesta como confirmada o descartada (cierre humano). */
export async function marcarPropuesta(
  sql: Sql,
  propuestaId: string,
  estado: 'confirmada' | 'descartada',
): Promise<void> {
  await sql`
    update lxp.eco_propuestas
    set estado = ${estado}::lxp.eco_propuesta_estado, updated_at = now()
    where id = ${propuestaId}`;
}

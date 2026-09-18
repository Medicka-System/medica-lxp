/**
 * Escrituras del cierre humano sobre una propuesta de Eco (§7A). Dos cosas:
 *   (1) ASENTAR la nota real (solo entregas; el caso se asienta por validación
 *       clínica del docente, flujo aparte) — con `eco_sugerida = true` de traza.
 *   (2) REGISTRAR la corrección docente→Eco en `lxp.eco_correcciones` (loop de
 *       mejora): qué propuso Eco vs qué dejó el humano. Es el material para afinar
 *       prompts/conocimiento (y, a futuro, fine-tuning propio).
 */
import type { Sql } from '@campus/db';

/** Asienta la nota/feedback de una ENTREGA (confirmación humana). */
export async function asentarEntrega(
  sql: Sql,
  params: { entregaId: string; nota: number | null; feedback: string | null },
): Promise<void> {
  await sql`
    update lxp.entregas
    set nota = ${params.nota},
        feedback = ${params.feedback},
        estado = 'calificada'::lxp.entrega_estado,
        eco_sugerida = true
    where id = ${params.entregaId}`;
}

/** Registra una corrección docente→Eco (loop de mejora · §7A). */
export async function registrarCorreccion(
  sql: Sql,
  params: {
    docenteId: string;
    objetoTipo: string;
    objetoId: string;
    sugerenciaEco: unknown;
    correccion: unknown;
  },
): Promise<{ correccionId: string }> {
  const rows = await sql<{ id: string }[]>`
    insert into lxp.eco_correcciones
      (id_docente, objeto_tipo, objeto_id, sugerencia_eco, correccion)
    values (
      ${params.docenteId},
      ${params.objetoTipo},
      ${params.objetoId},
      ${sql.json(params.sugerenciaEco as never)},
      ${sql.json(params.correccion as never)}
    )
    returning id`;
  return { correccionId: rows[0].id };
}

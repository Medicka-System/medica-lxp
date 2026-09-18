/**
 * Escritura del banco de reactivos (`lxp.reactivos`). El import es idempotente:
 * reemplaza los reactivos de la actividad (borra + inserta) dentro de una transacción,
 * para que re-subir el archivo no duplique el banco.
 */
import type { Sql } from '@campus/db';
import type { ReactivoImport } from './importar.logic';

/** Reemplaza TODOS los reactivos de una actividad por los importados. Devuelve el total. */
export async function reemplazarReactivos(
  sql: Sql,
  actividadId: string,
  reactivos: ReactivoImport[],
): Promise<number> {
  return sql.begin(async (tx) => {
    await tx`delete from lxp.reactivos where actividad_id = ${actividadId}`;
    for (const r of reactivos) {
      await tx`
        insert into lxp.reactivos
          (actividad_id, orden, tipo, enunciado, opciones, correcta, puntaje, dominio_iaim, retro, origen)
        values (
          ${actividadId}, ${r.orden}, ${r.tipo}::lxp.reactivo_tipo, ${r.enunciado},
          ${tx.json(r.opciones as never)},
          ${r.correcta === null ? null : tx.json(r.correcta as never)},
          ${r.puntaje},
          ${r.dominio ? tx`${r.dominio}::lxp.dominio_iaim` : null},
          ${r.retro ?? null}, 'import'
        )`;
    }
    return reactivos.length;
  }) as Promise<number>;
}

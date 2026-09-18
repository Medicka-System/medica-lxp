/**
 * Registro de un paquete de contenido como fila de `lxp.contenidos` (§7). El binario
 * (el .zip) vive en object storage; aquí solo el metadato + la referencia. Función
 * pura sobre `sql` (postgres.js), como el resto de repositorios del repo.
 */
import type { Sql } from '@campus/db';
import type { TipoPaquete } from './manifiesto';

export interface ContenidoPaqueteNuevo {
  id: string;
  leccionId: string;
  tipo: TipoPaquete;
  titulo: string;
  recursoRef: string;
  orden: number;
}

export interface ContenidoFila {
  id: string;
  leccion_id: string;
  tipo: string;
  titulo: string;
  recurso_ref: string | null;
  orden: number;
}

/** Inserta la fila de contenido (tipo scorm|xapi) apuntando al paquete en storage. */
export async function insertarContenidoPaquete(
  sql: Sql,
  d: ContenidoPaqueteNuevo,
): Promise<ContenidoFila> {
  const rows = await sql<ContenidoFila[]>`
    insert into lxp.contenidos (id, leccion_id, tipo, titulo, recurso_ref, orden)
    values (
      ${d.id}, ${d.leccionId}, ${d.tipo}::lxp.contenido_tipo, ${d.titulo},
      ${d.recursoRef}, ${d.orden}
    )
    returning id, leccion_id, tipo::text as tipo, titulo, recurso_ref, orden`;
  return rows[0];
}

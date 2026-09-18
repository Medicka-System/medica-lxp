/**
 * Registro del contenido H5P como fila de `lxp.contenidos` (tipo `h5p`). El contenido
 * H5P (params + librerías) lo guarda el propio H5P server en su storage; aquí solo se
 * enlaza a la lección con su `contentId` en `recurso_ref` para que el player lo cargue.
 */
import type { Sql } from '@campus/db';

export interface ContenidoH5pFila {
  id: string;
  leccion_id: string;
  tipo: string;
  titulo: string;
  recurso_ref: string | null;
  orden: number;
}

/**
 * Upsert por (`tipo='h5p'`, `recurso_ref=contentId`): si el contenido H5P ya estaba
 * enlazado, actualiza el título; si no, inserta una fila nueva. Así re-guardar desde
 * el editor no duplica el contenido en la lección.
 */
export async function registrarContenidoH5p(
  sql: Sql,
  d: { contentId: string; leccionId: string; titulo: string; orden?: number },
): Promise<ContenidoH5pFila> {
  const actualizado = await sql<ContenidoH5pFila[]>`
    update lxp.contenidos
    set titulo = ${d.titulo}
    where tipo = 'h5p'::lxp.contenido_tipo and recurso_ref = ${d.contentId}
    returning id, leccion_id, tipo::text as tipo, titulo, recurso_ref, orden`;
  if (actualizado[0]) return actualizado[0];

  const insertado = await sql<ContenidoH5pFila[]>`
    insert into lxp.contenidos (leccion_id, tipo, titulo, recurso_ref, orden)
    values (${d.leccionId}, 'h5p'::lxp.contenido_tipo, ${d.titulo}, ${d.contentId}, ${d.orden ?? 0})
    returning id, leccion_id, tipo::text as tipo, titulo, recurso_ref, orden`;
  return insertado[0];
}

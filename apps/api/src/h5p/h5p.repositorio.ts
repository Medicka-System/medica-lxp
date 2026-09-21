/**
 * Registro del puntero de contenido H5P en la LECCIÓN. El contenido H5P (params +
 * librerías) lo guarda el propio H5P server en su storage; aquí solo se enlaza a la
 * lección con su `contentId`.
 *
 * Modelo NUEVO (mig 0023): la lección tipo `h5p` guarda el `contentId` en
 * `lecciones.config.contentId` — esa es la fuente de verdad que el player del modelo
 * nuevo lee. Se escribe SIEMPRE.
 *
 * Modelo VIEJO (aún vivo): además se mantiene la fila `lxp.contenidos` tipo `h5p`
 * (upsert por `recurso_ref=contentId`) para no romper lectores previos; se dropeará
 * en fase 3. No se toca el enum ni se borra nada.
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
 * Escribe el puntero H5P en `lecciones.config.contentId` (modelo nuevo) y mantiene la
 * fila `lxp.contenidos` (modelo viejo). Idempotente: re-guardar desde el editor no
 * duplica ni el config ni la fila de contenido.
 */
export async function registrarContenidoH5p(
  sql: Sql,
  d: { contentId: string; leccionId: string; titulo: string; orden?: number },
): Promise<ContenidoH5pFila> {
  // ── Modelo NUEVO: puntero en lecciones.config (fuente de verdad del player nuevo) ──
  await sql`
    update lxp.lecciones
    set config = coalesce(config, '{}'::jsonb)
                 || jsonb_build_object('contentId', ${d.contentId}::text, 'titulo', ${d.titulo}::text)
    where id = ${d.leccionId}`;

  // ── Modelo VIEJO: fila lxp.contenidos (compat, aún vivo) ──
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

/**
 * Registro de un paquete de contenido (SCORM/xAPI). El binario (el .zip) vive en
 * object storage; aquí solo el metadato + la referencia.
 *
 * Modelo NUEVO (mig 0023): la lección tipo `xapi`/`scorm` guarda la ref del paquete en
 * `lecciones.config` (`paqueteRef` + `tipo`) — fuente de verdad del player nuevo.
 * Modelo VIEJO (aún vivo): además inserta la fila `lxp.contenidos` para compat.
 * Función pura sobre `sql` (postgres.js), como el resto de repositorios del repo.
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

/**
 * Escribe la ref del paquete en `lecciones.config` (modelo nuevo · fuente de verdad
 * del player nuevo) y mantiene la fila `lxp.contenidos` (modelo viejo, compat).
 */
export async function insertarContenidoPaquete(
  sql: Sql,
  d: ContenidoPaqueteNuevo,
): Promise<ContenidoFila> {
  // ── Modelo NUEVO: puntero del paquete en lecciones.config ──
  await sql`
    update lxp.lecciones
    set config = coalesce(config, '{}'::jsonb)
                 || jsonb_build_object(
                      'paqueteRef', ${d.recursoRef}::text,
                      'tipo', ${d.tipo}::text,
                      'titulo', ${d.titulo}::text)
    where id = ${d.leccionId}`;

  // ── Modelo VIEJO: fila lxp.contenidos (compat, aún vivo) ──
  const rows = await sql<ContenidoFila[]>`
    insert into lxp.contenidos (id, leccion_id, tipo, titulo, recurso_ref, orden)
    values (
      ${d.id}, ${d.leccionId}, ${d.tipo}::lxp.contenido_tipo, ${d.titulo},
      ${d.recursoRef}, ${d.orden}
    )
    returning id, leccion_id, tipo::text as tipo, titulo, recurso_ref, orden`;
  return rows[0];
}

/**
 * Repositorio de videoteca (§6 · esquema `lxp`). Funciones puras sobre `sql`
 * (postgres.js), como el resto del dominio. Solo lo que el servicio de media
 * necesita escribir/leer para orquestar el firmado; el listado va web→Supabase.
 */
import type { Sql } from '@campus/db';
import type { SolicitarVideo } from './dto';

export interface VideotecaFila {
  id: string;
  estado: string;
  recurso_ref: string | null;
  titulo: string;
}

/** Inserta una fila de videoteca en estado `procesando` (aún sin binario). */
export async function insertarVideoProcesando(
  sql: Sql,
  datos: SolicitarVideo,
): Promise<VideotecaFila> {
  const rows = await sql<VideotecaFila[]>`
    insert into lxp.videoteca
      (titulo, descripcion, origen, estado, grupo_id, leccion_id, contenido_id, created_by)
    values (
      ${datos.titulo}, ${datos.descripcion ?? null}, 'subida', 'procesando',
      ${datos.grupoId ?? null}, ${datos.leccionId ?? null},
      ${datos.contenidoId ?? null}, ${datos.creadoPor ?? null}
    )
    returning id, estado::text as estado, recurso_ref, titulo`;
  return rows[0] as VideotecaFila;
}

/** Marca la fila como `listo` fijando la referencia del binario ya subido. */
export async function marcarVideoListo(
  sql: Sql,
  videotecaId: string,
  recursoRef: string,
  duracionSeg?: number,
): Promise<VideotecaFila | null> {
  const rows = await sql<VideotecaFila[]>`
    update lxp.videoteca
    set estado = 'listo',
        recurso_ref = ${recursoRef},
        duracion_seg = ${duracionSeg ?? null}
    where id = ${videotecaId}
    returning id, estado::text as estado, recurso_ref, titulo`;
  return rows[0] ?? null;
}

/** Carga una fila de videoteca (para firmar la lectura de reproducción). */
export async function cargarVideo(
  sql: Sql,
  videotecaId: string,
): Promise<VideotecaFila | null> {
  const rows = await sql<VideotecaFila[]>`
    select id, estado::text as estado, recurso_ref, titulo
    from lxp.videoteca where id = ${videotecaId}`;
  return rows[0] ?? null;
}

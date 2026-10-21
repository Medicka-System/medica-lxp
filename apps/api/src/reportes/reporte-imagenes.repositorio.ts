import type { Sql } from '@campus/db';

/**
 * Lecturas/escrituras de `lxp.reporte_imagenes` (fuente de verdad de la galería del reporte ·
 * §6.5/§10, mig 0085). El `api` crea la fila (estado `recibido`) y la lee para HIDRATAR el
 * contenido del reporte al generar el PDF / derivar el caso; el worker la completa (estado +
 * thumb + derivados). El JSON `contenido.valores[campoId]` es solo un marcador del campo galería.
 */

export interface ImagenReporteFila {
  id: string;
  campo_id: string;
  ref: string;
  ext: string;
  estado: string;
  thumb_ref: string | null;
  derivados: Record<string, string> | null;
  orden: number;
  pie: string | null;
}

/** Siguiente `orden` para una galería (append al final, sin pisar). */
export async function siguienteOrden(sql: Sql, reporteId: string, campoId: string): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select coalesce(max(orden) + 1, 0) as n
    from lxp.reporte_imagenes where reporte_id = ${reporteId} and campo_id = ${campoId}`;
  return row?.n ?? 0;
}

/** Inserta una fila `recibido` para una imagen en subida. Devuelve su id. */
export async function insertarImagen(
  sql: Sql,
  v: { reporteId: string; campoId: string; ref: string; ext: string; orden: number },
): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into lxp.reporte_imagenes (reporte_id, campo_id, ref, ext, estado, orden)
    values (${v.reporteId}, ${v.campoId}, ${v.ref}, ${v.ext}, 'recibido', ${v.orden})
    returning id`;
  return row!.id;
}

/** Imágenes de un reporte (todas o solo las `listo`), ordenadas por campo + orden. */
export async function imagenesDe(
  sql: Sql,
  reporteId: string,
  soloListas = false,
): Promise<ImagenReporteFila[]> {
  return sql<ImagenReporteFila[]>`
    select id, campo_id, ref, ext, estado::text as estado, thumb_ref, derivados, orden, pie
    from lxp.reporte_imagenes
    where reporte_id = ${reporteId} ${soloListas ? sql`and estado = 'listo'` : sql``}
    order by campo_id, orden, created_at`;
}

/**
 * HIDRATA las galerías de un mapa `valores` desde la tabla (fuente de verdad). Para cada campo
 * con imágenes, fija `valores[campoId]` a la lista `{ref,ext,pie}[]` — la MISMA forma que leía
 * el JSON, así los lectores (PDF, caso, conteo) no cambian. `soloListas` = solo imágenes ya
 * redactadas y publicadas (para PDF/caso: nunca se copia una imagen en cuarentena/proceso · §10).
 */
export async function hidratarGalerias(
  sql: Sql,
  reporteId: string,
  valores: Record<string, unknown>,
  soloListas = true,
): Promise<Record<string, unknown>> {
  const filas = await imagenesDe(sql, reporteId, soloListas);
  if (filas.length === 0) return valores;
  const porCampo = new Map<string, { ref: string; ext: string; pie?: string }[]>();
  for (const f of filas) {
    const lista = porCampo.get(f.campo_id) ?? [];
    lista.push({ ref: f.ref, ext: f.ext, ...(f.pie ? { pie: f.pie } : {}) });
    porCampo.set(f.campo_id, lista);
  }
  const out = { ...valores };
  for (const [campoId, lista] of porCampo) out[campoId] = lista;
  return out;
}

/** Reordena una galería según `ids` (orden = posición en el arreglo). */
export async function reordenar(sql: Sql, reporteId: string, campoId: string, ids: string[]): Promise<void> {
  await sql.begin(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx`update lxp.reporte_imagenes set orden = ${i}
               where id = ${ids[i]!} and reporte_id = ${reporteId} and campo_id = ${campoId}`;
    }
  });
}

/** Edita el pie de una imagen. */
export async function editarPie(sql: Sql, reporteId: string, imagenId: string, pie: string): Promise<void> {
  await sql`update lxp.reporte_imagenes set pie = ${pie || null}
            where id = ${imagenId} and reporte_id = ${reporteId}`;
}

/** Quita una imagen; devuelve sus refs (final + thumb + derivados) para borrar en storage. */
export async function quitar(
  sql: Sql,
  reporteId: string,
  imagenId: string,
): Promise<ImagenReporteFila | null> {
  const [row] = await sql<ImagenReporteFila[]>`
    delete from lxp.reporte_imagenes
    where id = ${imagenId} and reporte_id = ${reporteId}
    returning id, campo_id, ref, ext, estado::text as estado, thumb_ref, derivados, orden, pie`;
  return row ?? null;
}

'use server';

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';

/**
 * Puente del web hacia la GALERÍA de imágenes del reporte (§2/§6.5/§10 · unificación ASYNC).
 * El `api` es SOLO firmante + orquestador: firma la subida del crudo, ENCOLA la redacción al
 * worker (ya NO redacta inline) y firma la lectura. La FUENTE DE VERDAD es `lxp.reporte_imagenes`
 * (mig 0085): el web LEE las filas bajo RLS (dueño del reporte) para pintar/sondear, y el `api`
 * firma las URLs (las credenciales de storage viven solo en el `api` · §2/§10).
 *
 * Propiedad gateada: la imagen se ancla a un reporte del médico (`reportes.id_medico = auth.uid()`).
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoImg<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Estado del pipeline por imagen (espeja el enum `lxp.estado_imagen_reporte`). */
export type EstadoImagen = 'recibido' | 'procesando' | 'listo' | 'cuarentena' | 'error';

/** Una imagen de la galería con su estado y URLs firmadas (lo que consume la UI). */
export type ImagenReporteVista = {
  id: string;
  campoId: string;
  ref: string;
  ext: string;
  estado: EstadoImagen;
  pie: string;
  orden: number;
  /** URL firmada de la imagen final (solo si `listo`). */
  url?: string;
  /** URL firmada del thumb (JPEG del frame redactado · §10). */
  thumbUrl?: string;
  /** `srcset` de derivados webp responsivos (solo JPG/PNG `listo`). */
  srcset?: string;
};

async function esMiReporte(userId: string, reporteId: string): Promise<boolean> {
  const rows = await comoAlumno(userId, (sql) =>
    sql<{ id: string }[]>`select id from lxp.reportes where id = ${reporteId} and id_medico = ${userId} limit 1`,
  );
  return rows.length > 0;
}

/** Firma la lectura PÚBLICA de un lote de refs de galería (final / thumb / derivados) vía el api. */
async function firmarLecturaRefs(refs: string[]): Promise<Record<string, string>> {
  const propios = [...new Set(refs)].filter((r) => typeof r === 'string' && r.startsWith('reportes/imagenes/'));
  if (propios.length === 0) return {};
  const res = await fetch(`${apiBase()}/reportes/imagenes/firmar-lectura`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refs: propios }),
    cache: 'no-store',
  });
  if (!res.ok) return {};
  const d = (await res.json()) as { urls: Record<string, string> };
  return d.urls ?? {};
}

/** Paso 1: firma la subida del original (el navegador lo sube directo a storage). */
export async function firmarSubidaImagen(
  reporteId: string,
  ext: string,
): Promise<ResultadoImg<{ id: string; ext: string; urlSubida: string }>> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/imagenes/firmar-subida`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reporteId, ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio de imágenes rechazó la solicitud (HTTP ${res.status}).` };
    const d = (await res.json()) as { id: string; ext: string; urlSubida: string };
    return { ok: true, datos: { id: d.id, ext: d.ext, urlSubida: d.urlSubida } };
  } catch (e) {
    console.error('[firmarSubidaImagen] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de imágenes (apps/api).' };
  }
}

/** Paso 2 (ASYNC): encola la redacción al worker y crea la fila. La UI luego sondea el estado. */
export async function encolarImagenReporte(
  reporteId: string,
  campoId: string,
  id: string,
  ext: string,
): Promise<ResultadoImg<{ imagenId: string; ref: string; ext: string; estado: EstadoImagen; orden: number }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/imagenes/encolar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reporteId, campoId, id, ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo encolar la imagen (HTTP ${res.status}).` };
    const d = (await res.json()) as { imagenId: string; ref: string; ext: string; estado: EstadoImagen; orden: number };
    return { ok: true, datos: d };
  } catch (e) {
    console.error('[encolarImagenReporte] fallo:', e);
    return { ok: false, error: 'No se pudo encolar la imagen (apps/api).' };
  }
}

/** Lista las imágenes de una galería (o de todo el reporte) con estado + URLs firmadas. */
export async function listarGaleriaReporte(
  reporteId: string,
  campoId?: string,
): Promise<ResultadoImg<ImagenReporteVista[]>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    // Lectura bajo RLS (dueño/staff del reporte · §2): el web lee las filas, el api firma las URLs.
    const filas = await comoAlumno(alumno.userId, (sql) =>
      sql<
        {
          id: string;
          campo_id: string;
          ref: string;
          ext: string;
          estado: EstadoImagen;
          thumb_ref: string | null;
          derivados: Record<string, string> | null;
          orden: number;
          pie: string | null;
        }[]
      >`
        select id, campo_id, ref, ext, estado::text as estado, thumb_ref, derivados, orden, pie
        from lxp.reporte_imagenes
        where reporte_id = ${reporteId} ${campoId ? sql`and campo_id = ${campoId}` : sql``}
        order by campo_id, orden, created_at`,
    );

    const refs: string[] = [];
    for (const f of filas) {
      if (f.estado === 'listo') refs.push(f.ref);
      if (f.thumb_ref) refs.push(f.thumb_ref);
      if (f.derivados) refs.push(...Object.values(f.derivados));
    }
    const urls = await firmarLecturaRefs(refs);

    const vistas: ImagenReporteVista[] = filas.map((f) => {
      const srcset =
        f.estado === 'listo' && f.derivados
          ? Object.entries(f.derivados)
              .map(([ancho, ref]) => (urls[ref] ? `${urls[ref]} ${ancho}w` : ''))
              .filter(Boolean)
              .join(', ')
          : undefined;
      return {
        id: f.id,
        campoId: f.campo_id,
        ref: f.ref,
        ext: f.ext,
        estado: f.estado,
        pie: f.pie ?? '',
        orden: f.orden,
        ...(f.estado === 'listo' && urls[f.ref] ? { url: urls[f.ref] } : {}),
        ...(f.thumb_ref && urls[f.thumb_ref] ? { thumbUrl: urls[f.thumb_ref] } : {}),
        ...(srcset ? { srcset } : {}),
      };
    });
    return { ok: true, datos: vistas };
  } catch (e) {
    console.error('[listarGaleriaReporte] fallo:', e);
    return { ok: false, error: 'No se pudo leer la galería.' };
  }
}

async function accionGaleria(reporteId: string, ruta: string, body: object): Promise<ResultadoImg<null>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/imagenes/${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reporteId, ...body }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `La acción falló (HTTP ${res.status}).` };
    return { ok: true, datos: null };
  } catch (e) {
    console.error(`[${ruta}] fallo:`, e);
    return { ok: false, error: 'No se pudo completar la acción.' };
  }
}

export async function reordenarGaleriaReporte(reporteId: string, campoId: string, ids: string[]): Promise<ResultadoImg<null>> {
  return accionGaleria(reporteId, 'reordenar', { campoId, ids });
}
export async function editarPieImagenReporte(reporteId: string, imagenId: string, pie: string): Promise<ResultadoImg<null>> {
  return accionGaleria(reporteId, 'pie', { imagenId, pie });
}
export async function quitarImagenReporte(reporteId: string, imagenId: string): Promise<ResultadoImg<null>> {
  return accionGaleria(reporteId, 'quitar', { imagenId });
}

/** Firma la lectura de refs (compat con el rasterizado DICOM del PDF, que lee `valores`). */
export async function firmarLecturaImagenes(
  reporteId: string,
  refs: string[],
): Promise<ResultadoImg<{ urls: Record<string, string> }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  const propios = (refs ?? []).filter((r) => typeof r === 'string' && r.startsWith(`reportes/imagenes/${reporteId}/`));
  if (propios.length === 0) return { ok: true, datos: { urls: {} } };
  const urls = await firmarLecturaRefs(propios);
  return { ok: true, datos: { urls } };
}

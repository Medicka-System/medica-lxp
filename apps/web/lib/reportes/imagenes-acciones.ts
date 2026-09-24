'use server';

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';

/**
 * Puente del web hacia el DOMINIO de imágenes de la GALERÍA del reporte (§2/§6.5/§10).
 * NO es proxy de CRUD: firmar la subida/lectura y disparar la redacción Presidio es
 * orquestación que vive en `apps/api` (`reportes/imagenes`). El binario va del navegador
 * directo a object storage (PUT firmado); el `api` lo trae solo para TAPAR la PII quemada.
 *
 * Propiedad gateada bajo RLS: la imagen se ancla a un reporte del médico
 * (`reportes.id_medico = auth.uid()`). Ningún médico firma sobre un reporte ajeno.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoImg<T> = { ok: true; datos: T } | { ok: false; error: string };

async function esMiReporte(userId: string, reporteId: string): Promise<boolean> {
  const rows = await comoAlumno(userId, (sql) =>
    sql<{ id: string }[]>`select id from lxp.reportes where id = ${reporteId} and id_medico = ${userId} limit 1`,
  );
  return rows.length > 0;
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

/** Paso 2: redacta la PII quemada (§10) y deja la imagen final. Devuelve su ref. */
export async function procesarImagen(
  reporteId: string,
  id: string,
  ext: string,
): Promise<ResultadoImg<{ ref: string; ext: string; revisionManual: boolean }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/imagenes/procesar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reporteId, id, ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo procesar la imagen (HTTP ${res.status}).` };
    const d = (await res.json()) as { ref: string; ext: string; revisionManual: boolean };
    return { ok: true, datos: { ref: d.ref, ext: d.ext, revisionManual: !!d.revisionManual } };
  } catch (e) {
    console.error('[procesarImagen] fallo:', e);
    return { ok: false, error: 'No se pudo procesar la imagen (apps/api).' };
  }
}

/** Firma la lectura de las imágenes de la galería (solo las del reporte del médico). */
export async function firmarLecturaImagenes(
  reporteId: string,
  refs: string[],
): Promise<ResultadoImg<{ urls: Record<string, string> }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiReporte(alumno.userId, reporteId))) return { ok: false, error: 'Ese reporte no es tuyo.' };
  const propios = (refs ?? []).filter(
    (r) => typeof r === 'string' && r.startsWith(`reportes/imagenes/${reporteId}/`),
  );
  if (propios.length === 0) return { ok: true, datos: { urls: {} } };
  try {
    const res = await fetch(`${apiBase()}/reportes/imagenes/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: propios }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar la lectura (HTTP ${res.status}).` };
    const d = (await res.json()) as { urls: Record<string, string> };
    return { ok: true, datos: { urls: d.urls ?? {} } };
  } catch (e) {
    console.error('[firmarLecturaImagenes] fallo:', e);
    return { ok: false, error: 'No se pudo firmar la lectura de imágenes (apps/api).' };
  }
}

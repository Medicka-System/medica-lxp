'use server';

import { getSesionAlumno } from '@/lib/session';

/**
 * Server actions de MEDIA de la lección del alumno (§2/§6/§10) — puente al DOMINIO para
 * firmar la LECTURA de imágenes de contenido (bloque de imagen de teoría). NO es proxy de
 * CRUD: la firma de la URL en object storage la hace el `api` (único firmante). Gateado por
 * la sesión del alumno + `acceso_activo` (mismo candado que el resto del campus).
 *
 * La imagen ya está REDACTADA (§10) en su clave final `media/imagenes/…` (el diseñador la
 * subió por el flujo de autoría); aquí solo se firma su lectura de vida corta.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoUrlImagen = { ok: true; url: string } | { ok: false; error: string };

/** Firma la lectura de UNA imagen de contenido (por su ref de storage). */
export async function firmarLecturaImagenAlumno(ref: string): Promise<ResultadoUrlImagen> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  if (typeof ref !== 'string' || !ref.startsWith('media/imagenes/')) {
    return { ok: false, error: 'Referencia de imagen inválida.' };
  }
  try {
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: [ref] }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar la imagen (HTTP ${res.status}).` };
    const datos = (await res.json()) as { urls: Record<string, string> };
    const url = datos.urls?.[ref];
    return url ? { ok: true, url } : { ok: false, error: 'La imagen no está disponible.' };
  } catch (e) {
    console.error('[firmarLecturaImagenAlumno] fallo:', e);
    return { ok: false, error: 'No se pudo obtener la imagen (servicio de media).' };
  }
}

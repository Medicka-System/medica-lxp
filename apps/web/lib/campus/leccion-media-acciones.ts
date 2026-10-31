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

/**
 * Firma la REPRODUCCIÓN de la narración TTS de un bloque de texto (§3/§5C). El bloque
 * guarda el `audioId` de `lxp.tts_audios`; aquí se pide al `api` (`GET /tts/:id`) el estado
 * + la URL firmada de vida corta (el `api` lee con service_role, así que no depende de la
 * RLS de `tts_audios`). Si aún no está `listo` (render en curso) o falló, devuelve error —
 * el reproductor cae a su estado "pendiente". Gateado por sesión del alumno + acceso_activo.
 */
export async function firmarNarracionAlumno(audioId: string): Promise<ResultadoUrlImagen> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  if (typeof audioId !== 'string' || !audioId.trim()) {
    return { ok: false, error: 'Referencia de narración inválida.' };
  }
  try {
    const res = await fetch(`${apiBase()}/tts/${encodeURIComponent(audioId)}`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `No se pudo obtener la narración (HTTP ${res.status}).` };
    const datos = (await res.json()) as { estado?: string; urlReproduccion?: string };
    if (datos.urlReproduccion) return { ok: true, url: datos.urlReproduccion };
    return {
      ok: false,
      error: datos.estado === 'procesando' ? 'La narración se está generando.' : 'La narración no está disponible.',
    };
  } catch (e) {
    console.error('[firmarNarracionAlumno] fallo:', e);
    return { ok: false, error: 'No se pudo obtener la narración (servicio de TTS).' };
  }
}

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

/**
 * Firma la lectura de UN documento de contenido (PDF/Word/PPT · `media/archivos/…`) para el
 * lector del alumno. Espejo de `firmarLecturaImagenAlumno` contra el endpoint ya existente
 * `POST /media/archivos/firmar-lectura`; gateado por la sesión del alumno + `acceso_activo`.
 * El enlace directo (src) no pasa por aquí; esto solo resuelve las subidas (ref).
 */
export async function firmarLecturaArchivoAlumno(ref: string): Promise<ResultadoUrlImagen> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  if (typeof ref !== 'string' || !ref.startsWith('media/archivos/')) {
    return { ok: false, error: 'Referencia de documento inválida.' };
  }
  try {
    const res = await fetch(`${apiBase()}/media/archivos/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: [ref] }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar el documento (HTTP ${res.status}).` };
    const datos = (await res.json()) as { urls: Record<string, string> };
    const url = datos.urls?.[ref];
    return url ? { ok: true, url } : { ok: false, error: 'El documento no está disponible.' };
  } catch (e) {
    console.error('[firmarLecturaArchivoAlumno] fallo:', e);
    return { ok: false, error: 'No se pudo obtener el documento (servicio de media).' };
  }
}

'use server';

import { getSesionAlumno } from '@/lib/session';
import { marcarLeccionCompletada } from './leccion-acciones';
import { emitirEventoLeccion } from './xapi-leccion';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions de la lección VIDEO del alumno (§2/§6/§7).
 *
 * Dos puentes al DOMINIO (`apps/api`) — NO son proxy de CRUD (§2): firmar la
 * reproducción del binario en object storage y encolar xAPI al LRS son orquestación
 * que ya vive en el `api` (Sprint 6/7). Ambos se CONSUMEN por contrato:
 *   · POST /media/videos/:id/reproducir  → { urlReproduccion }   (firma corta)
 *   · POST /xapi/statements              → 202 (encola en `envio-xapi`, retry)
 *
 * El progreso local (marcar como vista) es CRUD directo web→Supabase bajo RLS y se
 * reutiliza de `marcarLeccionCompletada`.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoUrl = { ok: true; url: string } | { ok: false; error: string };

/**
 * Firma una URL de reproducción de vida corta para el video de la lección. Guardado
 * por la sesión del alumno + `acceso_activo` (mismo candado que el resto del campus).
 * Consume el endpoint de media ya existente (Sprint 6).
 */
export async function firmarReproduccionAlumno(
  videotecaId: string,
): Promise<ResultadoUrl> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  try {
    const res = await fetch(
      `${apiBase()}/media/videos/${encodeURIComponent(videotecaId)}/reproducir`,
      { method: 'POST', cache: 'no-store' },
    );
    if (!res.ok) {
      return { ok: false, error: `No se pudo firmar la reproducción (HTTP ${res.status}).` };
    }
    const datos = (await res.json()) as { urlReproduccion: string };
    return { ok: true, url: datos.urlReproduccion };
  } catch (e) {
    console.error('[firmarReproduccionAlumno] fallo:', e);
    return { ok: false, error: 'No se pudo obtener el video (servicio de media).' };
  }
}

/**
 * Registra que el alumno EXPERIMENTÓ (abrió/reprodujo) la lección de video. xAPI de
 * progreso — best-effort, no bloquea. Se llama una vez al montar la lección.
 */
export async function registrarVistaVideo(
  leccionId: string,
  tituloLeccion: string,
): Promise<void> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return;
  await emitirEventoLeccion(alumno.userId, alumno.nombre, leccionId, tituloLeccion, 'experimento');
}

/**
 * Marca la lección de video como VISTA: persiste el progreso local (CRUD bajo RLS,
 * reutilizado) y emite xAPI `completó` al LRS. La calificación/competencia la deriva
 * el dominio a partir del statement (§7/§8), no esta acción.
 */
export async function marcarVideoVisto(
  leccionId: string,
  tituloLeccion: string,
): Promise<ResultadoAccion> {
  // El progreso leccion-keyed y el xAPI `completó` los hace marcarLeccionCompletada.
  return marcarLeccionCompletada(leccionId, tituloLeccion);
}

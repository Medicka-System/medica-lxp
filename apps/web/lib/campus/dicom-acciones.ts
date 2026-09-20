'use server';

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';

/**
 * Puente del Campus hacia el DOMINIO de ingesta DICOM (§2/§8/§9 · Sprint 4.7). NO es
 * proxy de CRUD (§2): firmar la subida/lectura del estudio a object storage y encolar
 * la anonimización bloqueante es orquestación que YA vive en `apps/api` (`dicom`). El
 * binario `.dcm` NUNCA pasa por el `api` ni por el web:
 *
 *   1) solicitar   POST /dicom/casos/:id/ingesta/solicitar  → { urlSubida, refCrudo }
 *   2) el CLIENTE  PUT  urlSubida (browser → MinIO)          — binario directo, no aquí
 *   3) confirmar   POST /dicom/casos/:id/ingesta/confirmar   → encola procesar-dicom
 *   4) estado      (CRUD directo web→Supabase, RLS)          → estudio_estado
 *   5) lectura     POST /dicom/casos/:id/ingesta/estudio     → { urlLectura, series }
 *
 * La propiedad del caso se comprueba bajo RLS (`comoAlumno`): un alumno solo puede
 * ingerir/leer estudios de SUS casos (policy bitacora_select · 0010).
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoDicom<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Estados del pipeline (espejo del enum `lxp.estudio_dicom_estado`). */
export type EstudioEstadoPipeline =
  | 'pendiente'
  | 'recibido'
  | 'procesando'
  | 'anonimizado'
  | 'error'
  | null;

/** Comprueba que el caso existe y es del alumno (bajo RLS). */
async function esMiCaso(userId: string, casoId: string): Promise<boolean> {
  const rows = await comoAlumno(userId, (sql) =>
    sql<{ id: string }[]>`select id from lxp.bitacora_casos where id = ${casoId} limit 1`,
  );
  return rows.length > 0;
}

/** Paso 1: firma el PUT del `.dcm` crudo (el cliente sube directo a MinIO). */
export async function solicitarSubidaDicom(
  casoId: string,
): Promise<ResultadoDicom<{ urlSubida: string; refCrudo: string }>> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  if (!(await esMiCaso(alumno.userId, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(`${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/solicitar`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio DICOM rechazó la solicitud (HTTP ${res.status}).` };
    const d = (await res.json()) as { urlSubida: string; refCrudo: string };
    return { ok: true, datos: { urlSubida: d.urlSubida, refCrudo: d.refCrudo } };
  } catch (e) {
    console.error('[solicitarSubidaDicom] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio DICOM (apps/api). ¿Está levantada la API?' };
  }
}

/** Paso 3: confirma que el binario ya está en storage y encola la anonimización. */
export async function confirmarSubidaDicom(
  casoId: string,
): Promise<ResultadoDicom<{ jobId: string }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiCaso(alumno.userId, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(`${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/confirmar`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo confirmar la subida (HTTP ${res.status}).` };
    const d = (await res.json()) as { jobId: string };
    return { ok: true, datos: { jobId: d.jobId } };
  } catch (e) {
    console.error('[confirmarSubidaDicom] fallo:', e);
    return { ok: false, error: 'No se pudo confirmar la subida del estudio (apps/api).' };
  }
}

/** Paso 4: estado del pipeline (CRUD directo web→Supabase bajo RLS · §2). */
export async function estadoEstudioDicom(
  casoId: string,
): Promise<ResultadoDicom<{ estado: EstudioEstadoPipeline }>> {
  const alumno = await getSesionAlumno();
  try {
    const rows = await comoAlumno(alumno.userId, (sql) =>
      sql<{ estudio_estado: EstudioEstadoPipeline }[]>`
        select estudio_estado::text as estudio_estado
        from lxp.bitacora_casos where id = ${casoId} limit 1`,
    );
    if (rows.length === 0) return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
    return { ok: true, datos: { estado: rows[0]!.estudio_estado } };
  } catch (e) {
    console.error('[estadoEstudioDicom] fallo:', e);
    return { ok: false, error: 'No se pudo consultar el estado del estudio.' };
  }
}

/** Serie del estudio anonimizado que el visor necesita para armar los frames. */
export interface SerieVisor {
  series_uid: string;
  modalidad: string;
  frames: number;
}

/** Paso 5: firma la lectura del `.dcm` anonimizado para el visor Cornerstone3D. */
export async function lecturaEstudioDicom(
  casoId: string,
): Promise<ResultadoDicom<{ urlLectura: string; series: SerieVisor[] }>> {
  const alumno = await getSesionAlumno();
  if (!(await esMiCaso(alumno.userId, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(`${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/estudio`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (res.status === 409) return { ok: false, error: 'El estudio aún no está listo para verse.' };
    if (!res.ok) return { ok: false, error: `No se pudo abrir el estudio (HTTP ${res.status}).` };
    const d = (await res.json()) as { urlLectura: string; series: SerieVisor[] };
    return { ok: true, datos: { urlLectura: d.urlLectura, series: d.series ?? [] } };
  } catch (e) {
    console.error('[lecturaEstudioDicom] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio DICOM (apps/api).' };
  }
}

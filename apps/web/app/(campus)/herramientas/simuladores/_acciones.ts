'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import type { ResultadoEnvio, ResultadoSesion, SeccionEnvio } from './_contrato';

/**
 * Acciones de sesión de simulador. La EVALUACIÓN es dominio (juicio de Eco · §7A) y
 * vive en `apps/api` (`src/ai/simuladores`): estas acciones solo la DISPARAN y devuelven
 * el feedback — NO son proxy de CRUD (§2). El catálogo/historial se leen directo
 * `web → Supabase` bajo RLS (ver `_datos.ts`).
 *
 * `alumnoId` viaja en el cuerpo (mismo patrón que Eco/validación · Sprint 5); en el
 * Sprint 9 el `api` lo tomará del JWT verificado.
 */

const REVALIDAR = '/herramientas/simuladores';

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

async function postSesion(ruta: string, cuerpo: object): Promise<ResultadoEnvio> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para entrenar.' };
  }
  try {
    const res = await fetch(`${apiBase()}/ai/simulador/${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alumnoId: alumno.userId, ...cuerpo }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalle = await res.json().catch(() => null);
      const msg = (detalle as { message?: string } | null)?.message;
      return { ok: false, error: msg ?? `El tutor no pudo evaluar la sesión (HTTP ${res.status}).` };
    }
    const resultado = (await res.json()) as ResultadoSesion;
    // El historial/progreso cambió: repinta el catálogo al volver.
    revalidatePath(REVALIDAR);
    return { ok: true, resultado };
  } catch {
    return {
      ok: false,
      error: 'No se pudo contactar al tutor (apps/api). ¿Está levantada la API?',
    };
  }
}

/** Envía una sesión de INTERPRETACIÓN (hallazgos + impresión) a evaluación de Eco. */
export async function enviarInterpretacion(input: {
  casoId: string;
  hallazgos: string;
  impresion: string;
  seguridad?: string;
}): Promise<ResultadoEnvio> {
  return postSesion('interpretacion', {
    casoId: input.casoId,
    hallazgos: input.hallazgos,
    impresion: input.impresion,
    seguridad: input.seguridad,
  });
}

/** Envía una sesión de REPORTE (secciones redactadas) a revisión de Eco. */
export async function enviarReporte(input: {
  casoId: string;
  secciones: SeccionEnvio[];
}): Promise<ResultadoEnvio> {
  return postSesion('reporte', { casoId: input.casoId, secciones: input.secciones });
}

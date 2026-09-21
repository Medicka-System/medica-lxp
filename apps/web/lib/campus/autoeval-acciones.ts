'use server';

import { revalidatePath } from 'next/cache';
import type { RespuestasAutoeval, ResultadoAutoeval } from '@campus/shared';
import { getSesionAlumno } from '@/lib/session';

/**
 * Server action del MOTOR de autoevaluación (§2/§7A). La autocalificación + el
 * registro (entrega, xAPICompetencia al LRS) son DOMINIO: viven en el `api`, no aquí.
 * Esta action solo autentica al alumno (getSesionAlumno + acceso_activo) y reenvía las
 * respuestas al `api` con su `alumnoId` (mismo patrón server→api que /notificaciones y
 * /competencia; el guard JWT del `api` está pendiente · memoria). NO califica en `web`:
 * la verdad (clave correcta) nunca sale del servidor de dominio.
 */

/** Resultado que ve el alumno: el agregado del motor + el estado de la entrega. */
export type ResultadoAutoevalAlumno = ResultadoAutoeval & {
  estado: 'calificada' | 'enviada';
};

export type RespuestaCalificar =
  | { ok: true; resultado: ResultadoAutoevalAlumno }
  | { ok: false; error: string };

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export async function calificarAutoevaluacion(
  leccionId: string,
  respuestas: RespuestasAutoeval,
): Promise<RespuestaCalificar> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/autoevaluacion/calificar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ leccionId, alumnoId: alumno.userId, respuestas }),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[calificarAutoevaluacion] no se pudo contactar al dominio:', e);
    return { ok: false, error: 'No se pudo calificar tu autoevaluación. Revisa tu conexión e inténtalo de nuevo.' };
  }

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    console.error('[calificarAutoevaluacion] api respondió', res.status, detalle.slice(0, 200));
    return { ok: false, error: 'No se pudo calificar tu autoevaluación. Inténtalo de nuevo.' };
  }

  const resultado = (await res.json()) as ResultadoAutoevalAlumno;
  revalidatePath(`/leccion/${leccionId}`);
  return { ok: true, resultado };
}

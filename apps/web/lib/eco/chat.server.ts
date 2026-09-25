'use server';

import { getSesionStaff } from '@/lib/studio/session';
import type { FuenteEco, RespuestaEco, SurfaceEco, TurnoEco } from './tipos';

/**
 * Puente del web hacia Eco CONVERSACIONAL (§7A · §2). NO es proxy de CRUD: es
 * orquestación de IA (loop tool-use) que vive en `apps/api` (`src/ai/eco-chat`); el web
 * solo la DISPARA con la identidad del staff de la sesión. El historial es TRANSITORIO
 * (vive en el cliente y viaja en cada llamada) — no se persiste (§7A: Eco informa).
 *
 * Superficie-agnóstica: `surface` fija la entidad en foco (`alumno` → alumnoId, `grupo`
 * → grupoId, `escuela` → centinela `'escuela'`); todas reusan esta misma acción.
 */

function apiBase(): string {
  return (
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  ).replace(/\/$/, '');
}

/**
 * Pregunta a Eco sobre una entidad (hoy: un alumno). Resuelve al staff de la sesión y
 * envía la identidad al `api` (que valida el rol y corre las tools bajo RLS · doble
 * candado §10). Devuelve la respuesta completa (sin streaming en v1).
 */
export async function preguntarAEco(input: {
  surface: SurfaceEco;
  entidadId: string;
  mensajes: TurnoEco[];
}): Promise<RespuestaEco> {
  const staff = await getSesionStaff();
  if (!input.entidadId) return { ok: false, error: 'Falta la entidad sobre la que preguntar.' };
  if (!input.mensajes?.length) return { ok: false, error: 'No hay ninguna pregunta que enviar.' };

  try {
    const res = await fetch(`${apiBase()}/ai/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        surface: input.surface,
        entidadId: input.entidadId,
        usuarioId: staff.userId,
        mensajes: input.mensajes,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `Eco no pudo responder (HTTP ${res.status}).` };
    }
    const r = (await res.json()) as {
      texto: string;
      fuentes: FuenteEco[];
      toolsUsados: string[];
      modelo: string;
    };
    return {
      ok: true,
      texto: r.texto ?? '',
      fuentes: r.fuentes ?? [],
      toolsUsados: r.toolsUsados ?? [],
      modelo: r.modelo ?? '',
    };
  } catch {
    return {
      ok: false,
      error: 'No se pudo contactar a Eco (apps/api). ¿Está levantada la API?',
    };
  }
}

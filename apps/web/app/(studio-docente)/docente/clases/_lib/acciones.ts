'use server';

import { revalidatePath } from 'next/cache';
import { comoStaff } from '@/lib/db.server';
import { requireDocente } from '../../../_lib/session';
import type { ResultadoAccion } from '../../../_lib/acciones';

/**
 * Server actions de Clases del DOCENTE (§9 · Sprint 6, REUSANDO el backend existente).
 *
 * Reparto según la Regla de Oro (§2):
 *  · PROGRAMAR e INICIAR hablan con Zoom → pasan por `apps/api` (dominio). Zoom está en
 *    STUB (sin credenciales): `ZoomService` devuelve enlaces de prueba; MiCo+ solo se
 *    enlaza/agenda. NO se reconstruye nada del Sprint 6.
 *  · LIGAR una grabación a una lección es CRUD simple → web→Supabase bajo RLS
 *    (`videoteca_write` exige `es_staff`). No pasa por Nest.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ProgramarClaseInput = {
  grupoId: string;
  tipo: 'zoom' | 'mico';
  tema: string;
  /** Inicio en ISO con offset (lo exige el api · z.datetime({offset:true})). */
  inicioISO: string;
  duracionMin: number;
  leccionId?: string | null;
  /** MiCo+: URL/deep-link de la sesión en el equipo Mindray (opcional). */
  enlace?: string | null;
};

/**
 * Agenda una clase (Zoom o MiCo+) vía `POST /clases` del api. Zoom crea la reunión
 * (stub); MiCo+ solo registra el enlace externo. El aviso a los alumnos del grupo lo
 * hará el api/worker cuando la integración esté completa (§9 · hoy no bloquea).
 */
export async function programarClase(input: ProgramarClaseInput): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  const tema = input.tema.trim();
  if (!tema) return { ok: false, error: 'Ponle un tema a la clase.' };
  if (!input.grupoId) return { ok: false, error: 'Elige el grupo de la clase.' };

  const body = {
    grupoId: input.grupoId,
    docenteId: userId,
    plataforma: input.tipo === 'mico' ? 'mico_plus' : 'zoom',
    titulo: tema,
    inicioProgramado: input.inicioISO,
    duracionMin: input.duracionMin,
    ...(input.leccionId ? { leccionId: input.leccionId } : {}),
    ...(input.tipo === 'mico' && input.enlace?.trim() ? { enlaceExterno: input.enlace.trim() } : {}),
  };

  try {
    const res = await fetch(`${apiBase()}/clases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `El servicio de clases rechazó la solicitud (HTTP ${res.status}).` };
    }
  } catch (e) {
    console.error('[programarClase] fallo:', e);
    return {
      ok: false,
      error: 'No se pudo contactar el servicio de clases (apps/api). ¿Está levantada la API?',
    };
  }
  revalidatePath('/docente/clases');
  return { ok: true };
}

/**
 * "Iniciar clase": el api marca la clase `en_curso` y devuelve el enlace de inicio del
 * host (start_url · sensible §6). Se devuelve al cliente para abrir Zoom en otra pestaña
 * (el video corre en Zoom, sin SDK embebido · §9).
 */
export async function iniciarClase(
  claseId: string,
): Promise<{ ok: true; enlaceInicio: string } | { ok: false; error: string }> {
  await requireDocente();
  try {
    const res = await fetch(`${apiBase()}/clases/${claseId}/iniciar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `No se pudo iniciar la clase (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as { enlaceInicio: string };
    revalidatePath('/docente/clases');
    return { ok: true, enlaceInicio: data.enlaceInicio };
  } catch (e) {
    console.error('[iniciarClase] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de clases (apps/api).' };
  }
}

/**
 * Firma una URL de reproducción de vida corta para ver la grabación (§3: el binario
 * vive en object storage; el `api` es el único firmante · POST /media/videos/:id/
 * reproducir). Devuelve la URL para abrir el reproductor en otra pestaña.
 */
export async function verGrabacion(
  grabacionId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireDocente();
  try {
    const res = await fetch(`${apiBase()}/media/videos/${grabacionId}/reproducir`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `No se pudo abrir la grabación (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as { urlReproduccion: string };
    return { ok: true, url: data.urlReproduccion };
  } catch (e) {
    console.error('[verGrabacion] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de media (apps/api).' };
  }
}

/**
 * Liga una grabación a una lección: cae en la videoteca del grupo/lección (la del
 * alumno se lee de `lxp.videoteca` · getGrabacionesClase). CRUD directo bajo RLS
 * (`videoteca_write` = `es_staff`). Verifica que la lección pertenezca a un grupo del
 * docente antes de ligar (segundo candado sobre la RLS).
 */
export async function ligarGrabacion(input: {
  grabacionId: string;
  leccionId: string;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  if (!input.leccionId) return { ok: false, error: 'Elige la lección a la que ligar la grabación.' };
  try {
    const error = await comoStaff(userId, async (sql) => {
      // La lección debe ser de un programa de SUS grupos (evita ligar fuera de su alcance).
      const ok = (
        await sql<{ n: number }[]>`
          select count(*)::int as n
          from lxp.lecciones l
          join lxp.modulos m on m.id = l.modulo_id
          join lxp.grupos  g on g.programa_id = m.programa_id
          where l.id = ${input.leccionId} and g.docente_id = ${userId}`
      )[0]?.n;
      if (!ok) return 'Esa lección no pertenece a tus grupos.';
      await sql`
        update lxp.videoteca
        set leccion_id = ${input.leccionId}
        where id = ${input.grabacionId} and origen in ('zoom', 'stream')`;
      return null;
    });
    if (error) return { ok: false, error };
  } catch (e) {
    console.error('[ligarGrabacion] fallo:', e);
    return { ok: false, error: 'No se pudo ligar la grabación. Inténtalo de nuevo.' };
  }
  revalidatePath('/docente/clases');
  return { ok: true };
}

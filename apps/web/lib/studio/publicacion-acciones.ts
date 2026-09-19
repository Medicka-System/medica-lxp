'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';

/**
 * Puente del Studio hacia la PUBLICACIÓN CON VERSIONADO (§2/§5B · Sprint 4.5).
 *
 * NO es proxy de CRUD (§2): la máquina de estados (borrador → revisión →
 * publicado → archivado), el snapshot inmutable de cada versión y el historial son
 * DOMINIO y ya viven en `apps/api` (módulo `publicacion`). El web solo los DISPARA
 * y los LEE — se ajusta a las rutas que el `api` expone hoy:
 *
 *   • GET  /publicacion/programas/:id/estado             → estado + acciones posibles
 *   • POST /publicacion/programas/:id/transicion         → aplica una transición
 *   • GET  /publicacion/programas/:id/historial          → versiones publicadas (meta)
 *   • GET  /publicacion/programas/:id/versiones/:version  → snapshot congelado
 *
 * La edición del árbol (módulos/lecciones/bloques) SÍ va directa `web → Supabase`
 * bajo RLS (ver `acciones.ts`). Aquí no se toca el árbol, solo su ciclo de vida.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return (
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  );
}

const BASE = (programaId: string) =>
  `${apiBase()}/publicacion/programas/${encodeURIComponent(programaId)}`;

/** Estados de la máquina de publicación del `api` (versionado.logic). */
export type EstadoPublicacion = 'borrador' | 'revision' | 'publicado' | 'archivado';
export type AccionPublicacion =
  | 'enviar_a_revision'
  | 'devolver'
  | 'publicar'
  | 'reabrir'
  | 'archivar'
  | 'reactivar';

type EstadoResp = {
  programa_id: string;
  nombre: string;
  estado: EstadoPublicacion;
  version: number;
  acciones: AccionPublicacion[];
  visible_para_alumno: boolean;
};

/** Metadatos de una versión publicada (historial). */
export type VersionHistorial = {
  version: number;
  notas: string | null;
  publicadoPor: string | null;
  publicadoEn: string;
};

export type ResultadoPublicacion =
  | { ok: true; estado: EstadoPublicacion; version: number }
  | { ok: false; error: string };

function refrescar(programaId: string) {
  revalidatePath('/studio/programas');
  revalidatePath(`/studio/programas/${programaId}`);
}

async function leerEstado(programaId: string): Promise<EstadoResp> {
  const res = await fetch(`${BASE(programaId)}/estado`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`estado HTTP ${res.status}`);
  return (await res.json()) as EstadoResp;
}

async function transicionar(
  programaId: string,
  accion: AccionPublicacion,
  actorId: string,
): Promise<EstadoPublicacion> {
  const res = await fetch(`${BASE(programaId)}/transicion`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accion, actorId }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`transicion '${accion}' HTTP ${res.status}`);
  const r = (await res.json()) as { estado: EstadoPublicacion };
  return r.estado;
}

/**
 * Publica o despublica un programa a través del dominio (§2).
 *
 * `publicar=true`: avanza la máquina de estados hasta `publicado`. Desde `borrador`
 * son dos pasos (enviar_a_revision → publicar); el Studio ofrece un solo botón, así
 * que aquí se recorren en orden. Al publicar, el `api` congela el snapshot de versión.
 *
 * `publicar=false`: reabre el programa publicado a `borrador` (deja de verlo el
 * alumno; el `api` abre una nueva versión de trabajo para no pisar el snapshot).
 *
 * Fija bug: antes el web hacía `update programas set publicado=true` directo, pero
 * el trigger `programas_sync_publicado` (mig 0013) lo revertía porque `estado`
 * seguía en 'borrador'. La fuente de verdad es `estado`, y solo el `api` la mueve.
 */
export async function publicarPrograma(
  programaId: string,
  publicar: boolean,
): Promise<ResultadoPublicacion> {
  const { userId } = await requireAutoria();
  try {
    let actual = await leerEstado(programaId);

    if (publicar) {
      // Avanza hasta 'publicado' (máx. 2 saltos: borrador→revisión→publicado).
      let saltos = 0;
      while (actual.estado !== 'publicado' && saltos < 3) {
        const siguiente: AccionPublicacion | null = actual.acciones.includes('publicar')
          ? 'publicar'
          : actual.acciones.includes('enviar_a_revision')
            ? 'enviar_a_revision'
            : actual.acciones.includes('reactivar')
              ? 'reactivar'
              : null;
        if (!siguiente) break;
        await transicionar(programaId, siguiente, userId);
        actual = await leerEstado(programaId);
        saltos += 1;
      }
      if (actual.estado !== 'publicado') {
        return { ok: false, error: `No se pudo publicar (estado actual: ${actual.estado}).` };
      }
    } else if (actual.estado === 'publicado') {
      // Despublicar = reabrir a borrador (el alumno deja de verlo).
      await transicionar(programaId, 'reabrir', userId);
      actual = await leerEstado(programaId);
    }

    refrescar(programaId);
    return { ok: true, estado: actual.estado, version: actual.version };
  } catch {
    return {
      ok: false,
      error: 'No se pudo contactar el dominio de publicación (apps/api). ¿Está levantada la API?',
    };
  }
}

/** Lee el historial de versiones publicadas (para el modal de historial · §5B). */
export async function obtenerHistorial(programaId: string): Promise<VersionHistorial[]> {
  await requireAutoria();
  const res = await fetch(`${BASE(programaId)}/historial`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`historial HTTP ${res.status}`);
  const rows = (await res.json()) as {
    version: number;
    notas: string | null;
    publicado_por: string | null;
    publicado_en: string;
  }[];
  return rows.map((r) => ({
    version: r.version,
    notas: r.notas,
    publicadoPor: r.publicado_por,
    publicadoEn: r.publicado_en,
  }));
}

/** Trae el snapshot congelado de una versión (para ver/seleccionar en el historial). */
export async function obtenerVersionSnapshot(
  programaId: string,
  version: number,
): Promise<unknown> {
  await requireAutoria();
  const res = await fetch(`${BASE(programaId)}/versiones/${version}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`versión ${version} HTTP ${res.status}`);
  return res.json();
}

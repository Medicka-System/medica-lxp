'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';

/**
 * Puente del Studio hacia el DOMINIO de HERENCIA/OVERRIDES de grupos (§2/§5B · Sprint 4.5).
 *
 * NO es proxy de CRUD (§2): resolver herencia, validar el patch (whitelist por entidad) y
 * sellar la versión del programa al aplicar un override son DOMINIO y ya viven en `apps/api`
 * (módulo `herencia`). El web solo DISPARA y refresca:
 *
 *   • POST   /herencia/grupos/:grupoId/overrides                 → aplica/actualiza override
 *   • DELETE /herencia/grupos/:grupoId/overrides/:entidad/:id    → revierte a heredado
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Entidades del temario que el modal personaliza (subset de EntidadOverride del api). */
export type EntidadOverrideUI = 'modulo' | 'leccion';

export type ResultadoOverride = { ok: true } | { ok: false; error: string };

function refrescar(grupoId: string) {
  revalidatePath('/studio/grupos');
  revalidatePath(`/studio/grupos/${grupoId}`);
}

/** Aplica un override (personaliza un nodo del grupo). El `patch` lo valida el dominio. */
export async function aplicarOverride(
  grupoId: string,
  input: { entidad: EntidadOverrideUI; entidadId: string; patch: Record<string, unknown> },
): Promise<ResultadoOverride> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/herencia/grupos/${encodeURIComponent(grupoId)}/overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entidad: input.entidad, entidad_id: input.entidadId, patch: input.patch }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      return {
        ok: false,
        error:
          res.status === 400
            ? 'El cambio no es válido para este nodo (el dominio rechazó el patch).'
            : `No se pudo personalizar (HTTP ${res.status}). ${detalle.slice(0, 140)}`,
      };
    }
    refrescar(grupoId);
    return { ok: true };
  } catch (e) {
    console.error('[aplicarOverride] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el dominio de herencia (apps/api). ¿Está levantada la API?' };
  }
}

/** Revierte un nodo a HEREDADO (borra su override). 404 = ya estaba heredado → OK. */
export async function revertirOverride(
  grupoId: string,
  entidad: EntidadOverrideUI,
  entidadId: string,
): Promise<ResultadoOverride> {
  await requireAutoria();
  try {
    const res = await fetch(
      `${apiBase()}/herencia/grupos/${encodeURIComponent(grupoId)}/overrides/${encodeURIComponent(entidad)}/${encodeURIComponent(entidadId)}`,
      { method: 'DELETE', cache: 'no-store' },
    );
    if (!res.ok && res.status !== 404) {
      return { ok: false, error: `No se pudo volver a heredar (HTTP ${res.status}).` };
    }
    refrescar(grupoId);
    return { ok: true };
  } catch (e) {
    console.error('[revertirOverride] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el dominio de herencia (apps/api).' };
  }
}

'use server';

import { requireSuperAdmin } from '../_guard';
import { getSesionStaff } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import {
  TTS_DEFECTO,
  type GuardarTtsConfigInput,
  type TtsConfig,
  type TtsFormato,
  type TtsProveedor,
} from './_contrato';

/**
 * Config de TTS (§3/§5C) — lectura y escritura CRUD web→Supabase bajo RLS (Regla de Oro
 * §2). La tabla `lxp.tts_config` existe (mig 0018): SELECT para `es_staff()`, escritura
 * solo `super_admin`. El motor (`apps/api` · TtsConfigService) la consume; tras guardar
 * se invalida su cache vía `POST /tts/config/invalidar`.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Normaliza el proveedor crudo de BD al union de la UI (openai/elevenlabs). */
function comoProveedor(v: string): TtsProveedor {
  return v === 'elevenlabs' ? 'elevenlabs' : 'openai';
}
function comoFormato(v: string): TtsFormato {
  return v === 'wav' || v === 'opus' ? v : 'mp3';
}

/** Lee la fila ACTIVA de `lxp.tts_config` (la RLS ya permite a staff leerla). */
export async function getTtsConfig(): Promise<TtsConfig> {
  const staff = await getSesionStaff();
  const filas = await comoStaff(staff.userId, async (sql) => {
    return sql<
      {
        id: string;
        nombre: string;
        activo: boolean;
        proveedor: string;
        modelo: string | null;
        voz: string;
        velocidad: number;
        formato: string;
      }[]
    >`
      select id, nombre, activo, proveedor, modelo, voz,
             velocidad::float8 as velocidad, formato
      from lxp.tts_config
      where activo
      order by updated_at desc
      limit 1`;
  });
  const f = filas[0];
  if (!f) return TTS_DEFECTO;
  return {
    id: f.id,
    nombre: f.nombre,
    activo: f.activo,
    proveedor: comoProveedor(f.proveedor),
    voz: f.voz,
    modelo: f.modelo,
    formato: comoFormato(f.formato),
    velocidad: Number(f.velocidad),
  };
}

export type ResultadoGuardar = { ok: true } | { ok: false; error: string };

/**
 * Persiste la config de TTS (solo súper admin · RLS lo exige por partida doble). Tras
 * el UPDATE invalida la cache del motor para que la próxima síntesis use la voz nueva.
 */
export async function guardarTtsConfig(input: GuardarTtsConfigInput): Promise<ResultadoGuardar> {
  const staff = await requireSuperAdmin();

  const velocidad = Number(input.velocidad);
  if (!Number.isFinite(velocidad) || velocidad < 0.25 || velocidad > 4) {
    return { ok: false, error: 'La velocidad debe estar entre 0.25 y 4.' };
  }
  if (!input.voz?.trim()) return { ok: false, error: 'Elige una voz.' };
  // `lxp.tts_config.modelo` es NOT NULL; si lo dejan vacío, cae al default del §3.
  const modelo = input.modelo?.trim() || 'tts-1';

  try {
    const filas = await comoStaff(staff.userId, async (sql) => {
      return sql<{ id: string }[]>`
        update lxp.tts_config
        set proveedor = ${input.proveedor},
            voz       = ${input.voz.trim()},
            modelo    = ${modelo},
            formato   = ${input.formato},
            velocidad = ${velocidad}
        where id = ${input.id}
        returning id`;
    });
    if (filas.length === 0) {
      return { ok: false, error: 'No se pudo guardar (¿fila inexistente o sin permiso?).' };
    }
  } catch (e) {
    console.error('[guardarTtsConfig] fallo al escribir lxp.tts_config:', e);
    return { ok: false, error: 'No se pudo guardar la configuración de TTS.' };
  }

  // Refresca la cache del motor (best-effort: la config YA quedó persistida).
  try {
    const res = await fetch(`${apiBase()}/tts/config/invalidar`, { method: 'POST', cache: 'no-store' });
    if (!res.ok) console.warn(`[guardarTtsConfig] invalidar respondió ${res.status}.`);
  } catch (e) {
    console.warn('[guardarTtsConfig] no se pudo invalidar la cache del motor (¿api arriba?):', (e as Error).message);
  }

  return { ok: true };
}

import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type { EcoConfig, EcoModeloPaso, EcoModelos } from './_eco-contrato';

/**
 * Lecturas de la Configuración del sistema (§5B). Corren bajo RLS vía `comoStaff`:
 * la policy `eco_config_select` deja LEER a todo el staff (`es_staff()`), pero solo
 * el súper admin ESCRIBE (`eco_config_write`, ver `_acciones.ts`). Sin lógica de
 * dominio (§2): la config es un dato editable, Eco la consume en `apps/api`.
 *
 * Esta capa NO hardcodea nada de Eco: TODO (prompts, parámetros, umbral y el modelo
 * por paso del pipeline) vive en `lxp.eco_config` (migración 0016) y se edita desde
 * la UI (§7A). Cambiar de proveedor de LLM = editar el jsonb `modelos`, sin tocar código.
 * Los tipos y el orden del pipeline viven en `_eco-contrato.ts` (client-safe).
 */

// ── Fallback seguro del jsonb `modelos` (si una fila vieja llega incompleta) ────
const MODELOS_FALLBACK: EcoModelos = {
  clasificador: { proveedor: 'anthropic', modelo: 'claude-haiku-4-5' },
  juicio: { proveedor: 'anthropic', modelo: 'claude-sonnet-4-6' },
  excepcion: { proveedor: 'anthropic', modelo: 'claude-opus-4-8' },
};

function normalizarPaso(v: unknown, fallback: EcoModeloPaso): EcoModeloPaso {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return {
      proveedor: typeof o.proveedor === 'string' ? o.proveedor : fallback.proveedor,
      modelo: typeof o.modelo === 'string' ? o.modelo : fallback.modelo,
    };
  }
  return fallback;
}

function normalizarModelos(v: unknown): EcoModelos {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    clasificador: normalizarPaso(o.clasificador, MODELOS_FALLBACK.clasificador),
    juicio: normalizarPaso(o.juicio, MODELOS_FALLBACK.juicio),
    excepcion: normalizarPaso(o.excepcion, MODELOS_FALLBACK.excepcion),
  };
}

type FilaEcoConfig = {
  id: string;
  nombre: string;
  activo: boolean;
  system_prompt: string;
  user_prompt_template: string;
  temperatura: string | number;
  max_tokens: number;
  umbral_confianza: string | number;
  modelos: unknown;
  version: number;
  updated_at: Date;
};

function mapear(f: FilaEcoConfig): EcoConfig {
  return {
    id: f.id,
    nombre: f.nombre,
    activo: f.activo,
    systemPrompt: f.system_prompt,
    userPromptTemplate: f.user_prompt_template,
    temperatura: Number(f.temperatura),
    maxTokens: f.max_tokens,
    umbralConfianza: Number(f.umbral_confianza),
    modelos: normalizarModelos(f.modelos),
    version: f.version,
    actualizado: f.updated_at,
  };
}

/**
 * Config ACTIVA de Eco (la que carga por defecto · una fila `activo` a la vez,
 * garantizado por `eco_config_activa_uidx`). Es la que la UI del súper admin edita.
 */
export async function getEcoConfigActiva(userId: string): Promise<EcoConfig | null> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<FilaEcoConfig[]>`
      select id, nombre, activo, system_prompt, user_prompt_template,
             temperatura, max_tokens, umbral_confianza, modelos, version, updated_at
      from lxp.eco_config
      where activo
      order by updated_at desc
      limit 1`;
    return rows[0] ? mapear(rows[0]) : null;
  });
}

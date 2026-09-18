'use server';

import { revalidatePath } from 'next/cache';
import { comoStaff } from '@/lib/db.server';
import { requireSuperAdmin } from './_guard';
import type { EcoModelos } from './_eco-contrato';

/**
 * Server actions de la Configuración del sistema (§5B). CRUD simple `web → Supabase`
 * bajo RLS (Regla de Oro §2 — NO pasan por NestJS): la config es un dato editable,
 * no lógica de dominio. Doble candado (§10): `requireSuperAdmin` filtra en la UI y
 * la policy `eco_config_write` (`rol_actual() = 'super_admin'`) filtra en la BD.
 *
 * Editar aquí es lo que hace a Eco configurable SIN tocar código (§7A): prompts,
 * parámetros, umbral de confianza y el modelo por paso del pipeline.
 */

// ── Helpers de saneo (mismo espíritu que lib/studio/acciones.ts: sin zod) ───────
function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function limpiarPaso(v: { proveedor?: unknown; modelo?: unknown }): {
  proveedor: string;
  modelo: string;
} {
  const proveedor = typeof v.proveedor === 'string' ? v.proveedor.trim() : '';
  const modelo = typeof v.modelo === 'string' ? v.modelo.trim() : '';
  return { proveedor, modelo };
}

export type GuardarEcoConfigInput = {
  id: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperatura: number;
  maxTokens: number;
  umbralConfianza: number;
  modelos: EcoModelos;
};

export type ResultadoGuardado = { ok: true } | { ok: false; error: string };

/**
 * Guarda la config de Eco. Valida en el borde (prompts no vacíos, parámetros en
 * rango, modelo de cada paso completo) y persiste bajo RLS. Sube `version` en cada
 * revisión (la columna existe justo para eso · 0016). No asienta nada de Eco: solo
 * edita su configuración.
 */
export async function guardarEcoConfig(
  entrada: GuardarEcoConfigInput,
): Promise<ResultadoGuardado> {
  const { userId } = await requireSuperAdmin();

  const systemPrompt = entrada.systemPrompt.trim();
  const userPromptTemplate = entrada.userPromptTemplate.trim();
  if (!systemPrompt) return { ok: false, error: 'El system prompt no puede quedar vacío.' };
  if (!userPromptTemplate)
    return { ok: false, error: 'El user prompt (template) no puede quedar vacío.' };
  // El template interpola variables {{...}}: sin al menos la respuesta del alumno,
  // Eco no tendría qué evaluar. Un aviso suave, no un bloqueo duro.
  if (!userPromptTemplate.includes('{{'))
    return {
      ok: false,
      error: 'El template debería incluir al menos una variable, p. ej. {{respuesta}}.',
    };

  const temperatura = clamp(entrada.temperatura, 0, 2);
  const maxTokens = Math.round(clamp(entrada.maxTokens, 1, 8192));
  const umbralConfianza = clamp(entrada.umbralConfianza, 0, 1);

  const modelos: EcoModelos = {
    clasificador: limpiarPaso(entrada.modelos.clasificador),
    juicio: limpiarPaso(entrada.modelos.juicio),
    excepcion: limpiarPaso(entrada.modelos.excepcion),
  };
  for (const [paso, m] of Object.entries(modelos)) {
    if (!m.proveedor || !m.modelo)
      return { ok: false, error: `Falta proveedor o modelo en el paso «${paso}».` };
  }

  await comoStaff(userId, async (sql) => {
    await sql`
      update lxp.eco_config set
        system_prompt        = ${systemPrompt},
        user_prompt_template = ${userPromptTemplate},
        temperatura          = ${temperatura},
        max_tokens           = ${maxTokens},
        umbral_confianza     = ${umbralConfianza},
        modelos              = ${sql.json(modelos)},
        version              = version + 1
      where id = ${entrada.id}`;
  });

  revalidatePath('/configuracion/ia');
  revalidatePath('/configuracion');
  return { ok: true };
}

/**
 * Forma de la configuración de Eco (§7A) leída de `lxp.eco_config`. Validada con
 * zod en el borde: si la fila de BD viene malformada, fallamos claro en vez de
 * mandar `undefined` al pipeline. Todo lo que Eco necesita para operar sale de aquí
 * — prompts, parámetros y QUÉ MODELO usa cada paso. Nada hardcodeado.
 */
import { z } from 'zod';

/** Pasos del pipeline que pueden mapear a un modelo distinto (§7A). */
export const PASOS_MODELO = ['clasificador', 'juicio', 'excepcion'] as const;
export type PasoModelo = (typeof PASOS_MODELO)[number];

/** Referencia model-agnóstica: proveedor + id de modelo. */
export const modeloRefSchema = z.object({
  proveedor: z.string().min(1),
  modelo: z.string().min(1),
});
export type ModeloRef = z.infer<typeof modeloRefSchema>;

export const ecoConfigSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  activo: z.boolean(),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  temperatura: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  umbralConfianza: z.number().min(0).max(1),
  modelos: z.object({
    clasificador: modeloRefSchema,
    juicio: modeloRefSchema,
    excepcion: modeloRefSchema,
  }),
  version: z.number().int().nonnegative(),
});

export type EcoConfig = z.infer<typeof ecoConfigSchema>;

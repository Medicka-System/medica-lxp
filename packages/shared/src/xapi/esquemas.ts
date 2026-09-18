/**
 * Esquemas zod del perfil xAPI (§5/§7) + builders del objeto y del actor.
 * Validan la forma de los statements en el borde (api/worker) y tipan el front.
 * Subconjunto práctico de xAPI 1.0.3 (lo que el LXP realmente emite).
 */
import { z } from 'zod';
import {
  TIPOS_ACTIVIDAD,
  VERBOS,
  XAPI_BASE_IRI,
  type TipoActividadClave,
  type VerboClave,
} from './perfil';

/** Mapa de idioma → texto (LanguageMap de xAPI). */
const mapaIdioma = z.record(z.string());

export const verboSchema = z.object({
  id: z.string().url(),
  display: mapaIdioma.optional(),
});

/** Actor = Agent identificado por `account` (homePage del campus + user_id). */
export const actorSchema = z.object({
  objectType: z.literal('Agent').optional(),
  name: z.string().optional(),
  mbox: z.string().email().transform((e) => `mailto:${e}`).optional(),
  account: z
    .object({ homePage: z.string().url(), name: z.string() })
    .optional(),
});

export const actividadSchema = z.object({
  objectType: z.literal('Activity').optional(),
  id: z.string().url(),
  definition: z
    .object({
      type: z.string().url().optional(),
      name: mapaIdioma.optional(),
      description: mapaIdioma.optional(),
    })
    .optional(),
});

export const scoreSchema = z.object({
  scaled: z.number().min(-1).max(1).optional(),
  raw: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const resultSchema = z.object({
  success: z.boolean().optional(),
  completion: z.boolean().optional(),
  score: scoreSchema.optional(),
  response: z.string().optional(),
  duration: z.string().optional(), // ISO 8601 duration
});

export const statementSchema = z.object({
  id: z.string().uuid().optional(),
  actor: actorSchema,
  verb: verboSchema,
  object: actividadSchema,
  result: resultSchema.optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  context: z.record(z.unknown()).optional(),
});

export type Actor = z.infer<typeof actorSchema>;
export type Verbo = z.infer<typeof verboSchema>;
export type Actividad = z.infer<typeof actividadSchema>;
export type Result = z.infer<typeof resultSchema>;
export type Statement = z.infer<typeof statementSchema>;

// ── Builders ────────────────────────────────────────────────────────────────

/** Actor a partir del `user_id` de Supabase (identidad compartida · §10). */
export function actorDeUsuario(userId: string, nombre?: string): Actor {
  return {
    objectType: 'Agent',
    ...(nombre ? { name: nombre } : {}),
    account: { homePage: `${XAPI_BASE_IRI}/usuarios`, name: userId },
  };
}

/** Verbo del perfil por su clave (`aprobo`, `subio`, …). */
export function verbo(clave: VerboClave): Verbo {
  return VERBOS[clave];
}

/**
 * Objeto Activity del perfil. `localId` es el id de dominio (uuid de la lección,
 * caso, clase o dominio I-AIM); se compone con el IRI base para dar una IRI válida.
 */
export function actividad(
  tipo: TipoActividadClave,
  localId: string,
  nombre?: string,
): Actividad {
  return {
    objectType: 'Activity',
    id: `${XAPI_BASE_IRI}/${tipo}/${localId}`,
    definition: {
      type: TIPOS_ACTIVIDAD[tipo],
      ...(nombre ? { name: { 'es-MX': nombre } } : {}),
    },
  };
}

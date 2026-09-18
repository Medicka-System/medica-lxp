/**
 * Lectura de la config de Eco desde `lxp.eco_config` (§7A). Devuelve la fila ya
 * mapeada y VALIDADA (zod) al tipo `EcoConfig`, para que el resto del engine no
 * conozca la forma de la tabla. Solo lectura: la escritura (editar la config) la
 * hará la UI del súper admin (5.5) directo bajo RLS, no este repositorio.
 */
import type { Sql } from '@campus/db';
import { ecoConfigSchema, type EcoConfig } from './eco-config.tipos';

interface FilaEcoConfig {
  id: string;
  nombre: string;
  activo: boolean;
  system_prompt: string;
  user_prompt_template: string;
  temperatura: number;
  max_tokens: number;
  umbral_confianza: number;
  modelos: unknown;
  version: number;
}

function mapear(f: FilaEcoConfig): EcoConfig {
  return ecoConfigSchema.parse({
    id: f.id,
    nombre: f.nombre,
    activo: f.activo,
    systemPrompt: f.system_prompt,
    userPromptTemplate: f.user_prompt_template,
    temperatura: Number(f.temperatura),
    maxTokens: f.max_tokens,
    umbralConfianza: Number(f.umbral_confianza),
    modelos: f.modelos,
    version: f.version,
  });
}

/** Config ACTIVA (la que Eco usa por defecto). `null` si no hay ninguna. */
export async function cargarConfigActiva(sql: Sql): Promise<EcoConfig | null> {
  const rows = await sql<FilaEcoConfig[]>`
    select id, nombre, activo, system_prompt, user_prompt_template,
           temperatura::float8 as temperatura, max_tokens,
           umbral_confianza::float8 as umbral_confianza, modelos, version
    from lxp.eco_config
    where activo
    order by updated_at desc
    limit 1`;
  return rows[0] ? mapear(rows[0]) : null;
}

/** Config por nombre (para pruebas A/B o pipelines especializados). */
export async function cargarConfigPorNombre(
  sql: Sql,
  nombre: string,
): Promise<EcoConfig | null> {
  const rows = await sql<FilaEcoConfig[]>`
    select id, nombre, activo, system_prompt, user_prompt_template,
           temperatura::float8 as temperatura, max_tokens,
           umbral_confianza::float8 as umbral_confianza, modelos, version
    from lxp.eco_config
    where nombre = ${nombre}
    limit 1`;
  return rows[0] ? mapear(rows[0]) : null;
}

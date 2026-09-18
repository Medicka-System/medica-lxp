/**
 * Contrato de la config de Eco (espejo de `lxp.eco_config` · 0016). Client-safe: SIN
 * `server-only`, para que el editor (client component) y las lecturas de servidor
 * compartan los mismos tipos y el orden del pipeline, sin duplicar la forma (§5).
 *
 * TODO lo de Eco es editable desde aquí (§7A): prompts, parámetros, umbral y el modelo
 * por paso — nada hardcodeado. La lectura vive en `_datos.ts`; el guardado en `_acciones.ts`.
 */

/** Un paso del pipeline apunta a {proveedor, modelo}: model-agnóstico (§3/§7A). */
export type EcoModeloPaso = { proveedor: string; modelo: string };

/**
 * Modelo por PASO del pipeline (§7A): clasificador (Haiku, recopila/normaliza),
 * juicio (Sonnet, compara contra verdad+rúbrica), excepcion (Opus, casos límite).
 */
export type PasoPipeline = 'clasificador' | 'juicio' | 'excepcion';
export type EcoModelos = Record<PasoPipeline, EcoModeloPaso>;

export type EcoConfig = {
  id: string;
  nombre: string;
  activo: boolean;
  systemPrompt: string;
  userPromptTemplate: string;
  temperatura: number;
  maxTokens: number;
  umbralConfianza: number;
  modelos: EcoModelos;
  version: number;
  actualizado: Date;
};

/** Orden y etiqueta de los pasos del pipeline para la UI (§7A · tools-first). */
export const PASOS_PIPELINE: {
  clave: PasoPipeline;
  titulo: string;
  descripcion: string;
}[] = [
  {
    clave: 'clasificador',
    titulo: 'Clasificador',
    descripcion:
      'Normaliza y resume texto libre a campos comparables. Modelo chico (Haiku). Se salta si la respuesta ya viene estructurada.',
  },
  {
    clave: 'juicio',
    titulo: 'Juicio',
    descripcion:
      'Compara la respuesta contra la verdad del caso y la rúbrica, sugiere nota y redacta el borrador de feedback (Sonnet).',
  },
  {
    clave: 'excepcion',
    titulo: 'Excepción',
    descripcion: 'Solo casos límite que el juicio no resuelve con confianza (Opus).',
  },
];

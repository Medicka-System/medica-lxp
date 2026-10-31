/**
 * Contrato de la configuración de TTS (§3/§5C · narración de la teoría).
 *
 * La fila vive en `lxp.tts_config` (mig 0018), UNA activa a la vez (índice parcial
 * `where activo`, como `eco_config_activa_uidx`). RLS: SELECT para `es_staff()`,
 * escritura solo `rol_actual() = 'super_admin'`. La lee `getTtsConfig` y la escribe
 * `guardarTtsConfig` (`_acciones.ts`); el motor la consume en `apps/api` (TtsConfigService).
 *
 * Patrón intercambiable (igual que los modelos de Eco · §7A): el proveedor de voz es
 * una pieza reemplazable por config, no cableada. OpenAI para arrancar, ElevenLabs
 * como upgrade — cambiar de proveedor = editar estos campos, sin tocar código.
 *
 * Columnas reales de `lxp.tts_config`: id, nombre, activo, proveedor, modelo, voz,
 * velocidad (numeric 0.25..4.0), formato. Estos campos mapean 1:1 con la UI.
 */

export type TtsProveedor = 'openai' | 'elevenlabs';
export type TtsFormato = 'mp3' | 'wav' | 'opus';

export type TtsConfig = {
  id: string;
  nombre: string;
  activo: boolean;
  proveedor: TtsProveedor;
  voz: string;
  modelo: string | null;
  formato: TtsFormato;
  /** 0.5 .. 2.0 (1 = velocidad natural). */
  velocidad: number;
};

/** Forma que acepta la server action `guardarTtsConfig` (columnas editables). */
export type GuardarTtsConfigInput = {
  id: string;
  proveedor: TtsProveedor;
  voz: string;
  modelo: string | null;
  formato: TtsFormato;
  velocidad: number;
};

/**
 * Catálogo de arranque por proveedor (voces conocidas para el selector). No es dato
 * de BD: es referencia de UI mientras cb-api expone el catálogo real por proveedor.
 */
export const VOCES_POR_PROVEEDOR: Record<TtsProveedor, { id: string; etiqueta: string }[]> = {
  openai: [
    { id: 'alloy', etiqueta: 'Alloy · neutra' },
    { id: 'nova', etiqueta: 'Nova · cálida' },
    { id: 'shimmer', etiqueta: 'Shimmer · suave' },
    { id: 'onyx', etiqueta: 'Onyx · grave' },
  ],
  elevenlabs: [{ id: 'multilingual', etiqueta: 'Multilingüe (definir en cb-api)' }],
};

/**
 * Fallback de UI si no hay fila activa en `lxp.tts_config` (no debería pasar: 0018
 * siembra `tts-default`). Refleja la decisión del §3: OpenAI para arrancar.
 */
export const TTS_DEFECTO: TtsConfig = {
  id: 'pendiente-de-api',
  nombre: 'narracion-default',
  activo: true,
  proveedor: 'openai',
  voz: 'nova',
  modelo: 'tts-1',
  formato: 'mp3',
  velocidad: 1.0,
};

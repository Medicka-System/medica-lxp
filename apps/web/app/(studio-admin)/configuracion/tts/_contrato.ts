/**
 * Contrato PROPUESTO de la configuración de TTS (§3/§5C · narración de la teoría).
 *
 * ⚠️ PENDIENTE DE API. El backend del TTS lo construye otro agente (cb-api): la tabla
 * y la server action que persiste esto AÚN NO EXISTEN. Este archivo fija la FORMA
 * EXACTA que la UI espera, para que al aterrizar el backend solo se conecten los
 * cables (leer/escribir bajo RLS de súper admin, mismo patrón que `eco_config`).
 *
 * Patrón intercambiable (igual que los modelos de Eco · §7A): el proveedor de voz es
 * una pieza reemplazable por config, no cableada. OpenAI para arrancar, ElevenLabs
 * como upgrade — cambiar de proveedor = editar estos campos, sin tocar código.
 *
 * Forma sugerida en BD (a confirmar con cb-api): `lxp.tts_config`, UNA fila activa a
 * la vez (índice parcial `where activo`, como `eco_config_activa_uidx`), RLS:
 * SELECT para `es_staff()`, escritura solo `rol_actual() = 'super_admin'`.
 *
 *   create table lxp.tts_config (
 *     id            uuid primary key default gen_random_uuid(),
 *     nombre        text not null unique,
 *     activo        boolean not null default true,
 *     proveedor     text not null,            -- 'openai' | 'elevenlabs' | …
 *     voz           text not null,            -- id de voz del proveedor
 *     modelo        text,                     -- p. ej. 'tts-1' / 'eleven_multilingual_v2'
 *     formato       text not null default 'mp3',   -- 'mp3' | 'wav' | 'opus'
 *     velocidad     numeric(3,2) not null default 1.00,  -- 0.5 .. 2.0
 *     version       integer not null default 1,
 *     created_at    timestamptz not null default now(),
 *     updated_at    timestamptz not null default now()
 *   );
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
  version: number;
};

/** Forma EXACTA que la futura server action `guardarTtsConfig` debe aceptar. */
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
 * Valor de arranque para pintar la UI antes de que exista la fila real. Refleja la
 * decisión del §3: OpenAI para arrancar. El backend reemplazará esto por la fila activa.
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
  version: 1,
};

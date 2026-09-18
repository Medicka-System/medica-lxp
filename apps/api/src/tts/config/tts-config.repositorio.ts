import type { Sql } from '@campus/db';
import { ttsConfigSchema, type TtsConfig } from './tts-config.tipos';

interface FilaTtsConfig {
  id: string;
  nombre: string;
  activo: boolean;
  proveedor: string;
  modelo: string;
  voz: string;
  velocidad: number;
  formato: string;
}

function mapear(f: FilaTtsConfig): TtsConfig {
  return ttsConfigSchema.parse({
    id: f.id,
    nombre: f.nombre,
    activo: f.activo,
    proveedor: f.proveedor,
    modelo: f.modelo,
    voz: f.voz,
    velocidad: Number(f.velocidad),
    formato: f.formato,
  });
}

/** Config de TTS ACTIVA (la que el servicio usa por defecto). `null` si no hay. */
export async function cargarTtsConfigActiva(sql: Sql): Promise<TtsConfig | null> {
  const rows = await sql<FilaTtsConfig[]>`
    select id, nombre, activo, proveedor, modelo, voz,
           velocidad::float8 as velocidad, formato
    from lxp.tts_config
    where activo
    order by updated_at desc
    limit 1`;
  return rows[0] ? mapear(rows[0]) : null;
}

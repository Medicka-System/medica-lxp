/**
 * Acceso a `lxp.tts_audios` (funciones puras · patrón repositorio del repo). El
 * binario del audio vive en object storage; aquí solo el registro/estado.
 */
import type { Sql } from '@campus/db';

export interface FilaAudio {
  id: string;
  contenido_id: string | null;
  texto: string;
  proveedor: string;
  modelo: string;
  voz: string;
  velocidad: number;
  formato: string;
  estado: 'procesando' | 'listo' | 'error';
  recurso_ref: string | null;
  duracion_seg: number | null;
  error: string | null;
}

export interface DatosAudioNuevo {
  contenidoId?: string | null;
  texto: string;
  proveedor: string;
  modelo: string;
  voz: string;
  velocidad: number;
  formato: string;
  creadoPor?: string | null;
}

/** Pre-registra el audio en estado `procesando` (antes de encolar el render). */
export async function insertarAudioProcesando(
  sql: Sql,
  d: DatosAudioNuevo,
): Promise<FilaAudio> {
  const rows = await sql<FilaAudio[]>`
    insert into lxp.tts_audios
      (contenido_id, texto, proveedor, modelo, voz, velocidad, formato, estado, creado_por)
    values (
      ${d.contenidoId ?? null}, ${d.texto}, ${d.proveedor}, ${d.modelo}, ${d.voz},
      ${d.velocidad}, ${d.formato}, 'procesando', ${d.creadoPor ?? null}
    )
    returning id, contenido_id, texto, proveedor, modelo, voz,
              velocidad::float8 as velocidad, formato, estado, recurso_ref,
              duracion_seg, error`;
  return rows[0];
}

/** Carga un audio por id (para renderizar o reproducir). */
export async function cargarAudio(sql: Sql, id: string): Promise<FilaAudio | null> {
  const rows = await sql<FilaAudio[]>`
    select id, contenido_id, texto, proveedor, modelo, voz,
           velocidad::float8 as velocidad, formato, estado, recurso_ref,
           duracion_seg, error
    from lxp.tts_audios
    where id = ${id}`;
  return rows[0] ?? null;
}

/** Marca el audio `listo` con la clave del binario en object storage. */
export async function marcarAudioListo(
  sql: Sql,
  id: string,
  recursoRef: string,
): Promise<FilaAudio | null> {
  const rows = await sql<FilaAudio[]>`
    update lxp.tts_audios
    set estado = 'listo', recurso_ref = ${recursoRef}, error = null
    where id = ${id}
    returning id, contenido_id, texto, proveedor, modelo, voz,
              velocidad::float8 as velocidad, formato, estado, recurso_ref,
              duracion_seg, error`;
  return rows[0] ?? null;
}

/** Marca el audio `error` con el motivo (para diagnóstico; el worker reintenta). */
export async function marcarAudioError(
  sql: Sql,
  id: string,
  motivo: string,
): Promise<void> {
  await sql`
    update lxp.tts_audios
    set estado = 'error', error = ${motivo.slice(0, 500)}
    where id = ${id}`;
}

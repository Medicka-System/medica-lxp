/**
 * Lecturas/escrituras del pipeline DICOM en `api` (§6/§8 · Sprint 4.7). Solo el
 * estado del estudio y su referencia; el binario vive en object storage.
 */
import type { Sql } from '@campus/db';

/** Serie persistida del estudio anonimizado (subconjunto de `estudio_series`). */
export interface SerieEstudio {
  series_uid: string;
  modalidad: string;
  frames: number;
}

export interface CasoEstudio {
  id: string;
  estudio_estado: string | null;
  estudio_dicom_ref: string | null;
  estudio_series: SerieEstudio[];
}

/** Caso de bitácora (id + estado/ref/series del estudio); `null` si no existe. */
export async function cargarCaso(sql: Sql, casoId: string): Promise<CasoEstudio | null> {
  const rows = await sql<CasoEstudio[]>`
    select id,
           estudio_estado::text as estudio_estado,
           estudio_dicom_ref,
           coalesce(estudio_series, '[]'::jsonb) as estudio_series
    from lxp.bitacora_casos where id = ${casoId}`;
  return rows[0] ?? null;
}

/** Marca el estado del pipeline del estudio de un caso. */
export async function marcarEstado(
  sql: Sql,
  casoId: string,
  estado: 'pendiente' | 'recibido',
): Promise<void> {
  await sql`
    update lxp.bitacora_casos
    set estudio_estado = ${estado}::lxp.estudio_dicom_estado
    where id = ${casoId}`;
}

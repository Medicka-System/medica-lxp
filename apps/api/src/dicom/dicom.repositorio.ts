/**
 * Lecturas/escrituras del pipeline DICOM en `api` (§6/§8 · rediseño multi-serie).
 * Solo el estado del estudio y sus series; el binario vive en object storage.
 *
 * El estudio es TRANSVERSAL: pertenece a `bitacora_casos` (alumno) o a
 * `casos_biblioteca` (banco curado) — ambas tablas tienen el MISMO modelo de series
 * (0014 + 0024). El nombre de tabla no se puede parametrizar en un tagged template,
 * así que se ramifica por `tabla` con consultas explícitas (sin `unsafe`).
 */
import type { Sql } from '@campus/db';
import type { TablaEstudioDicom } from '@campus/shared';

/** Serie persistida del estudio anonimizado (subconjunto de `estudio_series`). */
export type SerieEstudio = {
  series_uid: string;
  modalidad: string;
  frames: number;
  /** `dicom` (loader wadouri) o `imagen` (JPG/PNG · web loader). Ausente = `dicom`. */
  tipo?: 'dicom' | 'imagen';
  /** Clave del binario anonimizado de esta serie en object storage. */
  ref?: string;
  /** Espaciado físico `[row, col]` mm (aspect ratio USG); `null`/ausente = píxel cuadrado. */
  pixel_spacing?: [number, number] | null;
  /** Caja `[x0,y0,x1,y1]` px de la región de ultrasonido (auto-encuadre); `null`/ausente = sin región. */
  region?: [number, number, number, number] | null;
};

export interface CasoEstudio {
  id: string;
  estudio_estado: string | null;
  estudio_dicom_ref: string | null;
  estudio_series: SerieEstudio[];
}

/** Caso (bitácora o banco) con estado/ref/series del estudio; `null` si no existe. */
export async function cargarCaso(
  sql: Sql,
  casoId: string,
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<CasoEstudio | null> {
  const rows =
    tabla === 'casos_biblioteca'
      ? await sql<CasoEstudio[]>`
          select id,
                 estudio_estado::text as estudio_estado,
                 -- casos_biblioteca usa dicom_ref (no estudio_dicom_ref, que vive en
                 -- bitacora_casos) — sin este alias la lectura del curado da 500.
                 dicom_ref as estudio_dicom_ref,
                 coalesce(estudio_series, '[]'::jsonb) as estudio_series
          from lxp.casos_biblioteca where id = ${casoId}`
      : await sql<CasoEstudio[]>`
          select id,
                 estudio_estado::text as estudio_estado,
                 estudio_dicom_ref,
                 coalesce(estudio_series, '[]'::jsonb) as estudio_series
          from lxp.bitacora_casos where id = ${casoId}`;
  return rows[0] ?? null;
}

/** Marca el estado del pipeline del estudio de un caso (en la tabla dueña). */
export async function marcarEstado(
  sql: Sql,
  casoId: string,
  estado: 'pendiente' | 'recibido',
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<void> {
  if (tabla === 'casos_biblioteca') {
    await sql`
      update lxp.casos_biblioteca
      set estudio_estado = ${estado}::lxp.estudio_dicom_estado
      where id = ${casoId}`;
  } else {
    await sql`
      update lxp.bitacora_casos
      set estudio_estado = ${estado}::lxp.estudio_dicom_estado
      where id = ${casoId}`;
  }
}

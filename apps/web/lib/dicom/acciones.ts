'use server';

import type { TablaEstudioDicom } from '@campus/shared';
import { getSesionAlumno } from '@/lib/session';
import { getSesionStaff } from '@/lib/studio/session';
import { comoAlumno, comoStaff } from '@/lib/db.server';

/**
 * Puente del web hacia el DOMINIO de ingesta DICOM MULTI-SERIE (§2/§8/§9). NO es
 * proxy de CRUD (§2): firmar la subida/lectura del estudio y encolar la anonimización
 * bloqueante es orquestación que vive en `apps/api` (`dicom`). El binario `.dcm`/`.zip`
 * NUNCA pasa por el `api` ni por el web — va cliente → object storage directo.
 *
 * TRANSVERSAL: el mismo flujo sirve la bitácora del alumno (`bitacora_casos`) y el
 * banco curado del staff (`casos_biblioteca`). El chequeo de propiedad se hace bajo
 * RLS con la sesión que corresponde a la tabla:
 *   • bitacora_casos  → alumno (policy bitacora_select: id_alumno = auth.uid()).
 *   • casos_biblioteca → staff (policy casos_biblioteca_write: es_staff()).
 *
 *   1) solicitar   POST /dicom/casos/:id/ingesta/solicitar  → { items: [{urlSubida…}] }
 *   2) el CLIENTE  PUT  urlSubida (browser → object storage) — binario directo, no aquí
 *   3) confirmar   POST /dicom/casos/:id/ingesta/confirmar   → encola procesar-dicom
 *   4) estado      (CRUD directo web→Supabase, RLS)          → estudio_estado
 *   5) lectura     POST /dicom/casos/:id/ingesta/estudio     → { series:[{urlLectura…}] }
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoDicom<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Estados del pipeline (espejo del enum `lxp.estudio_dicom_estado`). */
export type EstudioEstadoPipeline =
  | 'pendiente'
  | 'recibido'
  | 'procesando'
  | 'anonimizado'
  // Cuarentena §10: el redactor no pudo garantizar la redacción de PII quemada → el estudio
  // NO se publica y espera revisión humana (el visor no lo expone).
  | 'revision_manual'
  | 'error'
  | null;

/** Fuente a subir: un `.dcm` suelto (una serie) o un `.zip` (varias series). */
export interface ArchivoFuente {
  indice: number;
  esZip: boolean;
}

/** Item firmado para subir una fuente cruda directo al storage. */
export interface ItemSubida {
  indice: number;
  refCrudo: string;
  urlSubida: string;
  esZip: boolean;
}

/** Serie del estudio anonimizado con su URL firmada de lectura (para el visor). */
export interface SerieLectura {
  series_uid: string;
  modalidad: string;
  frames: number;
  urlLectura: string;
  /** `dicom` (loader wadouri) o `imagen` (JPG/PNG · web loader). Default `dicom`. */
  tipo?: 'dicom' | 'imagen';
  /** Espaciado físico `[row, col]` mm (aspect ratio USG); `null` si píxel cuadrado. */
  pixelSpacing?: [number, number] | null;
  /** Caja `[x0,y0,x1,y1]` px de la región de ultrasonido (auto-encuadre); `null` si no hay. */
  region?: [number, number, number, number] | null;
}

/** Comprueba que el caso existe y es accesible bajo RLS con la sesión de la tabla. */
async function esMiCaso(tabla: TablaEstudioDicom, casoId: string): Promise<boolean> {
  if (tabla === 'casos_biblioteca') {
    const staff = await getSesionStaff();
    const rows = await comoStaff(staff.userId, (sql) =>
      sql<{ id: string }[]>`select id from lxp.casos_biblioteca where id = ${casoId} limit 1`,
    );
    return rows.length > 0;
  }
  const alumno = await getSesionAlumno();
  const rows = await comoAlumno(alumno.userId, (sql) =>
    sql<{ id: string }[]>`select id from lxp.bitacora_casos where id = ${casoId} limit 1`,
  );
  return rows.length > 0;
}

/** Paso 1: firma un PUT por fuente (el cliente sube cada una directo al storage). */
export async function solicitarSubidaDicom(
  casoId: string,
  archivos: ArchivoFuente[],
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<ResultadoDicom<{ items: ItemSubida[] }>> {
  if (tabla === 'bitacora_casos') {
    const alumno = await getSesionAlumno();
    if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  }
  if (!(await esMiCaso(tabla, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(
      `${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/solicitar`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla, archivos }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { ok: false, error: `El servicio DICOM rechazó la solicitud (HTTP ${res.status}).` };
    const d = (await res.json()) as { items: ItemSubida[] };
    return { ok: true, datos: { items: d.items ?? [] } };
  } catch (e) {
    console.error('[solicitarSubidaDicom] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio DICOM (apps/api). ¿Está levantada la API?' };
  }
}

/** Paso 3: confirma que los crudos ya están en storage y encola la anonimización.
 *  `anexar` = añadir estas series al estudio existente (editar); default reemplaza. */
export async function confirmarSubidaDicom(
  casoId: string,
  archivos: ArchivoFuente[],
  tabla: TablaEstudioDicom = 'bitacora_casos',
  anexar = false,
): Promise<ResultadoDicom<{ jobId: string }>> {
  if (!(await esMiCaso(tabla, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(
      `${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/confirmar`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla, archivos, anexar }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { ok: false, error: `No se pudo confirmar la subida (HTTP ${res.status}).` };
    const d = (await res.json()) as { jobId: string };
    return { ok: true, datos: { jobId: d.jobId } };
  } catch (e) {
    console.error('[confirmarSubidaDicom] fallo:', e);
    return { ok: false, error: 'No se pudo confirmar la subida del estudio (apps/api).' };
  }
}

/** Quita UNA serie del estudio (editar caso). Gatea propiedad bajo RLS y delega el
 *  borrado del binario + splice al `api` (único firmante). */
export async function quitarSerieDicom(
  casoId: string,
  indice: number,
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<ResultadoDicom<{ series: number }>> {
  if (!(await esMiCaso(tabla, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(
      `${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/quitar-serie`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla, indice }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { ok: false, error: `No se pudo quitar la serie (HTTP ${res.status}).` };
    const d = (await res.json()) as { series: number };
    return { ok: true, datos: { series: d.series } };
  } catch (e) {
    console.error('[quitarSerieDicom] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio DICOM (apps/api).' };
  }
}

/** Paso 4: estado del pipeline (CRUD directo web→Supabase bajo RLS · §2). */
export async function estadoEstudioDicom(
  casoId: string,
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<ResultadoDicom<{ estado: EstudioEstadoPipeline }>> {
  try {
    if (tabla === 'casos_biblioteca') {
      const staff = await getSesionStaff();
      const rows = await comoStaff(staff.userId, (sql) =>
        sql<{ estudio_estado: EstudioEstadoPipeline }[]>`
          select estudio_estado::text as estudio_estado
          from lxp.casos_biblioteca where id = ${casoId} limit 1`,
      );
      if (rows.length === 0) return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
      return { ok: true, datos: { estado: rows[0]!.estudio_estado } };
    }
    const alumno = await getSesionAlumno();
    const rows = await comoAlumno(alumno.userId, (sql) =>
      sql<{ estudio_estado: EstudioEstadoPipeline }[]>`
        select estudio_estado::text as estudio_estado
        from lxp.bitacora_casos where id = ${casoId} limit 1`,
    );
    if (rows.length === 0) return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
    return { ok: true, datos: { estado: rows[0]!.estudio_estado } };
  } catch (e) {
    console.error('[estadoEstudioDicom] fallo:', e);
    return { ok: false, error: 'No se pudo consultar el estado del estudio.' };
  }
}

/** Paso 5: firma la lectura de CADA serie anonimizada para el visor Cornerstone3D. */
export async function lecturaEstudioDicom(
  casoId: string,
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<ResultadoDicom<{ series: SerieLectura[] }>> {
  if (!(await esMiCaso(tabla, casoId))) {
    return { ok: false, error: 'Ese caso no existe o no es tuyo.' };
  }
  try {
    const res = await fetch(
      `${apiBase()}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/estudio`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla }),
        cache: 'no-store',
      },
    );
    if (res.status === 409) return { ok: false, error: 'El estudio aún no está listo para verse.' };
    if (!res.ok) return { ok: false, error: `No se pudo abrir el estudio (HTTP ${res.status}).` };
    const d = (await res.json()) as { series: SerieLectura[] };
    return { ok: true, datos: { series: d.series ?? [] } };
  } catch (e) {
    console.error('[lecturaEstudioDicom] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio DICOM (apps/api).' };
  }
}

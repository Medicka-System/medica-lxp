'use server';

/**
 * Server actions de la BIBLIOTECA DE CONTENIDO (§5B/§5C). Reparto según la Regla de
 * Oro (§2):
 *   · La fila `lxp.recursos` es CRUD simple → va directo `web → Supabase` bajo RLS
 *     (`comoStaff` + policy `lxp.es_autoria()`). NO pasa por NestJS.
 *   · La SUBIDA del binario y la ingesta de paquetes SÍ es dominio → vive en `apps/api`
 *     (media/archivos, media/imagenes, media/videos, paquetes, h5p). El binario nunca
 *     pasa por el `api` ni por el web: se firma un PUT y el navegador sube directo.
 *
 * Flujo de "Subir recurso": (1) el api firma/ingiere el artefacto → (2) el navegador
 * sube el binario (si aplica) → (3) esta acción crea la fila `lxp.recursos` que la
 * biblioteca lista y las lecciones referencian.
 */

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import type { TipoRecurso } from '@/lib/studio/contenido-contrato';

export type ResultadoAccion<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

type MetaRecurso = Record<string, string | number | boolean | undefined>;

/* ───────────────────────── Firmar subidas (dominio · api) ───────────────────────── */

export type SubidaFirmada = { id: string; ext: string; ref: string; urlSubida: string; urlLectura: string };

/** Firma la subida DIRECTA de un DOCUMENTO (PDF/Word/PPT) a object storage. */
export async function firmarSubidaMediaArchivo(ext: string): Promise<ResultadoAccion<SubidaFirmada>> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/archivos/firmar-subida`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio de documentos rechazó la solicitud (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as SubidaFirmada };
  } catch (e) {
    console.error('[firmarSubidaMediaArchivo] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de media (apps/api). ¿Está levantada la API?' };
  }
}

export type IngestaPaqueteBiblioteca = {
  contenidoId: string;
  tipo: string; // 'scorm' | 'xapi'
  titulo: string;
  entryPoint: string | null;
  recursoRef: string;
};

/** Ingesta un paquete SCORM/xAPI (.zip) en modo Biblioteca (sin lección). Valida el
 *  manifiesto + guarda el .zip; devuelve la ref para crear el lxp.recursos. */
export async function ingestarPaqueteBiblioteca(
  formData: FormData,
): Promise<ResultadoAccion<IngestaPaqueteBiblioteca>> {
  await requireAutoria();
  const archivo = formData.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: 'Falta el archivo .zip del paquete.' };
  }
  try {
    const res = await fetch(`${apiBase()}/paquetes`, { method: 'POST', body: formData, cache: 'no-store' });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      return {
        ok: false,
        error:
          res.status === 400
            ? 'El paquete no es un .zip SCORM/xAPI válido (revisa el manifiesto).'
            : `La ingesta del paquete falló (HTTP ${res.status}). ${detalle.slice(0, 160)}`,
      };
    }
    return { ok: true, datos: (await res.json()) as IngestaPaqueteBiblioteca };
  } catch (e) {
    console.error('[ingestarPaqueteBiblioteca] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el dominio de paquetes (apps/api).' };
  }
}

export type IngestaH5pBiblioteca = { contentId: string; titulo: string };

/** Sube un paquete .h5p en modo Biblioteca: instala librerías + guarda el contenido. */
export async function subirH5pBiblioteca(
  formData: FormData,
): Promise<ResultadoAccion<IngestaH5pBiblioteca>> {
  const { userId } = await requireAutoria();
  const archivo = formData.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: 'Falta el archivo .h5p.' };
  }
  try {
    const res = await fetch(`${apiBase()}/h5p/paquete`, {
      method: 'POST',
      body: formData,
      headers: { 'x-user-id': userId },
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      return {
        ok: false,
        error:
          res.status === 400
            ? 'El archivo no es un paquete .h5p válido.'
            : `La subida del H5P falló (HTTP ${res.status}). ${detalle.slice(0, 160)}`,
      };
    }
    return { ok: true, datos: (await res.json()) as IngestaH5pBiblioteca };
  } catch (e) {
    console.error('[subirH5pBiblioteca] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el H5P server (apps/api).' };
  }
}

/* ───────────────────────── CRUD de la fila (web → Supabase · §2) ───────────────────────── */

export type NuevoRecurso = {
  tipo: TipoRecurso;
  nombre: string;
  storageKey?: string;
  meta?: MetaRecurso;
  reproduccion?: string;
  etiquetas?: string[];
};

/** Crea la fila `lxp.recursos` (tras firmar/ingerir el artefacto en el api). */
export async function crearRecurso(input: NuevoRecurso): Promise<ResultadoAccion<{ id: string }>> {
  const { userId } = await requireAutoria();
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: 'El recurso necesita un nombre.' };
  try {
    const id = await comoStaff(userId, async (sql) => {
      const rows = await sql<{ id: string }[]>`
        insert into lxp.recursos (tipo, nombre, storage_key, meta, reproduccion, etiquetas, created_by)
        values (
          ${input.tipo}::lxp.recurso_tipo, ${nombre}, ${input.storageKey ?? null},
          ${sql.json((input.meta ?? {}) as never)}, ${input.reproduccion ?? null},
          ${sql.array(input.etiquetas ?? [])}, ${userId}
        )
        returning id`;
      return rows[0]!.id;
    });
    revalidatePath('/studio/contenido');
    return { ok: true, datos: { id } };
  } catch (e) {
    console.error('[crearRecurso] fallo:', e);
    return { ok: false, error: 'No se pudo guardar el recurso en la biblioteca.' };
  }
}

/** Renombra y/o reetiqueta un recurso (edición simple). */
export async function actualizarRecurso(
  id: string,
  cambios: { nombre?: string; etiquetas?: string[] },
): Promise<ResultadoAccion<null>> {
  const { userId } = await requireAutoria();
  const nombre = cambios.nombre?.trim();
  try {
    await comoStaff(userId, async (sql) => {
      if (typeof nombre === 'string' && nombre) {
        await sql`update lxp.recursos set nombre = ${nombre} where id = ${id}`;
      }
      if (cambios.etiquetas) {
        await sql`update lxp.recursos set etiquetas = ${sql.array(cambios.etiquetas)} where id = ${id}`;
      }
    });
    revalidatePath('/studio/contenido');
    revalidatePath(`/studio/contenido/${id}`);
    return { ok: true, datos: null };
  } catch (e) {
    console.error('[actualizarRecurso] fallo:', e);
    return { ok: false, error: 'No se pudo actualizar el recurso.' };
  }
}

/**
 * Reemplaza el ARCHIVO de un recurso: apunta al nuevo binario/artefacto y sube la
 * versión. Como el recurso vive una sola vez, TODAS las lecciones que lo referencian
 * sirven el nuevo (no se copian). El artefacto ya se firmó/ingirió en el api.
 */
export async function reemplazarArchivoRecurso(
  id: string,
  nuevo: { storageKey: string; meta?: MetaRecurso; reproduccion?: string },
): Promise<ResultadoAccion<{ version: number }>> {
  const { userId } = await requireAutoria();
  try {
    const version = await comoStaff(userId, async (sql) => {
      const rows = await sql<{ version: number }[]>`
        update lxp.recursos
        set storage_key = ${nuevo.storageKey},
            version = version + 1,
            meta = meta || ${sql.json((nuevo.meta ?? {}) as never)},
            reproduccion = coalesce(${nuevo.reproduccion ?? null}, reproduccion)
        where id = ${id}
        returning version`;
      if (rows.length === 0) throw new Error('recurso inexistente o sin permiso');
      return rows[0]!.version;
    });
    revalidatePath('/studio/contenido');
    revalidatePath(`/studio/contenido/${id}`);
    return { ok: true, datos: { version } };
  } catch (e) {
    console.error('[reemplazarArchivoRecurso] fallo:', e);
    return { ok: false, error: 'No se pudo reemplazar el archivo del recurso.' };
  }
}

/**
 * Elimina un recurso. Si sigue referenciado por lecciones (usos>0) NO lo borra: avisa
 * el alcance para que el diseñador lo quite/reemplace primero (evita "huecos" en la
 * lección). `forzar` lo borra de todos modos (queda el hueco declarado en la UI).
 */
export async function eliminarRecurso(
  id: string,
  opts?: { forzar?: boolean },
): Promise<ResultadoAccion<{ eliminado: boolean; usos: number }>> {
  const { userId } = await requireAutoria();
  try {
    const resultado = await comoStaff(userId, async (sql) => {
      const usos = Number(
        (
          await sql<{ n: number }[]>`
            select count(distinct b.leccion_id)::int as n
            from lxp.bloques b where b.config->>'recursoId' = ${id}`
        )[0]?.n ?? 0,
      );
      if (usos > 0 && !opts?.forzar) return { eliminado: false, usos };
      await sql`delete from lxp.recursos where id = ${id}`;
      return { eliminado: true, usos };
    });
    if (resultado.eliminado) revalidatePath('/studio/contenido');
    return { ok: true, datos: resultado };
  } catch (e) {
    console.error('[eliminarRecurso] fallo:', e);
    return { ok: false, error: 'No se pudo eliminar el recurso.' };
  }
}

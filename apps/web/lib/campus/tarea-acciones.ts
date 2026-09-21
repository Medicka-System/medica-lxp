'use server';

import { revalidatePath } from 'next/cache';
import type postgres from 'postgres';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { comoTareaConfig } from '@/lib/studio/tarea-contrato';
import type { ResultadoAccion } from './resultado';

type Sql = ReturnType<typeof postgres>;

/**
 * Server actions de la TAREA del alumno (§5C). La ENTREGA es CRUD simple `web →
 * Supabase` bajo RLS (Regla de Oro §2): corre con `comoAlumno`, así que la policy
 * `entregas_insert` (id_alumno = auth.uid() + acceso_activo) es el segundo candado.
 * Reutiliza el flujo de `entregas`/validación existente: al entregar queda `enviada`,
 * pendiente de la revisión del docente (Eco asiste · §7A).
 *
 * El BINARIO del archivo adjunto nunca pasa por el web ni por Postgres (§3): el `api`
 * (único firmante) emite una URL firmada, el navegador sube directo a object storage y
 * la entrega solo guarda la referencia — mismo patrón que media/DICOM.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Referencia de un archivo ya subido a object storage (lo devuelve el paso de subida). */
export type ArchivoEntrega = { key: string; nombre: string; tipo: string | null };

type Contenido = { texto?: string; archivo?: ArchivoEntrega | null };

/** Resuelve el ancla (actividad de respaldo) y el grupo destino de la tarea (server-side). */
async function anclaTarea(
  sql: Sql,
  leccionId: string,
): Promise<{ actividadId: string | null; grupoId: string | null; formato: string } | null> {
  const cab = (
    await sql<{ config: Record<string, unknown> | null; programa_id: string }[]>`
      select l.config, m.programa_id
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where l.id = ${leccionId} and l.tipo = 'tarea' and pr.publicado
      limit 1`
  )[0];
  if (!cab) return null;
  const cfg = comoTareaConfig(cab.config);
  let actividadId = cfg.actividadId ?? null;
  if (!actividadId) {
    actividadId =
      (
        await sql<{ id: string }[]>`
          select id from lxp.actividades
          where leccion_id = ${leccionId} and tipo = 'tarea'
          order by orden, created_at limit 1`
      )[0]?.id ?? null;
  }
  const grupoId =
    (
      await sql<{ id: string }[]>`
        select id from lxp.grupos where programa_id = ${cab.programa_id}
        order by created_at limit 1`
    )[0]?.id ?? null;
  return { actividadId, grupoId, formato: cfg.entrega ?? 'archivo' };
}

/**
 * Entrega (o reenvía) la tarea del alumno. Upsert por `(actividad_id, id_alumno)`:
 * si ya había una entrega la actualiza y la vuelve a poner `enviada` (salvo que ya
 * esté `calificada`, en cuyo caso se bloquea el reenvío). Ancla por lección Y por
 * actividad (mig 0026 + respaldo NOT NULL).
 */
export async function entregarTarea(
  leccionId: string,
  datos: Contenido,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };

  const texto = (datos.texto ?? '').trim();
  const archivo = datos.archivo ?? null;
  if (!texto && !archivo) {
    return { ok: false, error: 'Escribe tu respuesta o adjunta un archivo antes de entregar.' };
  }

  try {
    const error = await comoAlumno(alumno.userId, async (sql) => {
      const ancla = await anclaTarea(sql, leccionId);
      if (!ancla) return 'No se encontró la tarea.';
      if (!ancla.actividadId) {
        return 'Esta tarea aún no está lista para recibir entregas. Avisa a tu docente.';
      }
      // Respeta el formato que fijó el diseñador (segundo candado tras la UI).
      if (ancla.formato === 'archivo' && !archivo) {
        return 'Esta tarea se entrega con un archivo adjunto.';
      }
      if (ancla.formato === 'texto' && !texto) {
        return 'Esta tarea se entrega como texto en línea.';
      }

      // No se reenvía una entrega ya calificada (§7A · la nota está asentada).
      const previa = (
        await sql<{ estado: string }[]>`
          select estado::text as estado from lxp.entregas
          where actividad_id = ${ancla.actividadId} and id_alumno = ${alumno.userId}
          limit 1`
      )[0];
      if (previa?.estado === 'calificada') {
        return 'Esta entrega ya fue calificada; no se puede reenviar.';
      }

      const contenido: Contenido = {};
      if (texto) contenido.texto = texto;
      if (archivo) contenido.archivo = archivo;

      await sql`
        insert into lxp.entregas (actividad_id, leccion_id, grupo_id, id_alumno, contenido, estado)
        values (${ancla.actividadId}, ${leccionId}, ${ancla.grupoId}, ${alumno.userId},
                ${sql.json(contenido as never)}, 'enviada'::lxp.entrega_estado)
        on conflict (actividad_id, id_alumno) do update
          set contenido = excluded.contenido,
              leccion_id = excluded.leccion_id,
              grupo_id = excluded.grupo_id,
              estado = 'enviada'::lxp.entrega_estado,
              updated_at = now()`;
      return null;
    });
    if (error) return { ok: false, error };
  } catch (e) {
    console.error('[entregarTarea] fallo:', e);
    return { ok: false, error: 'No se pudo enviar la entrega. Inténtalo de nuevo.' };
  }
  revalidatePath(`/tarea/${leccionId}`);
  return { ok: true };
}

export type SolicitudArchivo = { key: string; urlSubida: string };
export type ResultadoArchivo<T> = { ok: true; datos: T } | { ok: false; error: string };

/**
 * Paso 1 del adjunto: pide al `api` una URL firmada para subir el archivo directo a
 * object storage (el binario no pasa por aquí). Devuelve la `key` que luego se guarda
 * en la entrega. El `api` es el único firmante (§3).
 */
export async function solicitarSubidaArchivo(input: {
  leccionId: string;
  nombre: string;
  tipo?: string;
}): Promise<ResultadoArchivo<SolicitudArchivo>> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    const res = await fetch(`${apiBase()}/entregas/archivo/solicitar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        leccionId: input.leccionId,
        alumnoId: alumno.userId,
        nombre: input.nombre,
        tipo: input.tipo,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `El servicio de archivos rechazó la solicitud (HTTP ${res.status}).` };
    }
    return { ok: true, datos: (await res.json()) as SolicitudArchivo };
  } catch (e) {
    console.error('[solicitarSubidaArchivo] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de archivos (apps/api). ¿Está levantada la API?' };
  }
}

/**
 * Firma una URL de LECTURA de vida corta para que el alumno descargue/vea el archivo
 * que entregó. Solo la key propia (la entrega es del alumno bajo RLS · el `api` solo
 * firma la lectura del objeto).
 */
export async function urlLecturaArchivo(
  key: string,
): Promise<ResultadoArchivo<{ url: string }>> {
  await getSesionAlumno();
  try {
    const res = await fetch(`${apiBase()}/entregas/archivo/leer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar la lectura (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as { url: string } };
  } catch (e) {
    console.error('[urlLecturaArchivo] fallo:', e);
    return { ok: false, error: 'No se pudo obtener el archivo (apps/api).' };
  }
}

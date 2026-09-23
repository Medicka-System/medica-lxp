'use server';

/**
 * Persistencia de MEDICIONES y ANOTACIONES del visor DICOM (§4.7 · FASE 2).
 *
 * CRUD directo web→Supabase bajo RLS (Regla de Oro §2 — NO pasa por NestJS): es una CAPA
 * de datos del estudio (JSON de Cornerstone), no dominio. Se guarda con AUTOR y fecha,
 * ubicada por (serie, frame) para re-ligarse al `imageId` firmado al abrir. La RLS
 * (mig 0035) gobierna QUIÉN: el autor edita lo suyo; los curados (`casos_biblioteca`)
 * están CONGELADOS (nadie escribe por el visor).
 */

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { TablaEstudioDicom } from '@campus/shared';

/** Una anotación guardada del estudio, tal como la consume el visor. */
export interface AnotacionGuardada {
  id: string;
  serie: number;
  frame: number;
  tipo: string;
  datos: Record<string, unknown>;
  valor: string | null;
  autorId: string;
  autorNombre: string;
  /** true si la anotación es del usuario actual (puede editarla/borrarla). */
  esMia: boolean;
  fecha: string;
}

/** Anotación a guardar (reemplaza el set del autor para el caso). */
export interface AnotacionAGuardar {
  serie: number;
  frame: number;
  tipo: string;
  datos: Record<string, unknown>;
  valor: string | null;
}

export type ResultadoAnotaciones<T> = { ok: true; datos: T } | { ok: false; error: string };

/**
 * Lee TODAS las anotaciones del estudio (de todos los autores) bajo RLS. `esMia` marca
 * las del usuario actual. Los curados son visibles a todos (solo-lectura).
 */
export async function getAnotaciones(
  casoId: string,
  tabla: TablaEstudioDicom = 'bitacora_casos',
): Promise<ResultadoAnotaciones<AnotacionGuardada[]>> {
  const alumno = await getSesionAlumno();
  try {
    const filas = await comoAlumno(alumno.userId, (sql) =>
      sql<
        {
          id: string;
          serie: number;
          frame: number;
          tipo: string;
          datos: Record<string, unknown>;
          valor: string | null;
          autor_id: string;
          autor_nombre: string;
          created_at: Date;
        }[]
      >`
        select id, serie, frame, tipo, datos, valor, autor_id, autor_nombre, created_at
        from lxp.anotaciones_dicom
        where tabla = ${tabla} and caso_id = ${casoId}
        order by created_at asc`,
    );
    return {
      ok: true,
      datos: filas.map((f) => ({
        id: f.id,
        serie: f.serie,
        frame: f.frame,
        tipo: f.tipo,
        datos: f.datos,
        valor: f.valor,
        autorId: f.autor_id,
        autorNombre: f.autor_nombre,
        esMia: f.autor_id === alumno.userId,
        fecha: f.created_at.toISOString(),
      })),
    };
  } catch (e) {
    console.error('[getAnotaciones] fallo:', e);
    return { ok: false, error: 'No se pudieron cargar las mediciones.' };
  }
}

/**
 * Reemplaza el set de anotaciones del AUTOR actual para este estudio (borra las suyas +
 * inserta las nuevas, atómico). No toca las de otros autores. En curados (`casos_biblioteca`)
 * no se guarda: están congelados (la RLS lo bloquea; aquí se corta antes por claridad).
 */
export async function guardarAnotaciones(
  casoId: string,
  tabla: TablaEstudioDicom,
  items: AnotacionAGuardar[],
): Promise<ResultadoAnotaciones<{ guardadas: number }>> {
  if (tabla === 'casos_biblioteca') {
    return { ok: false, error: 'Los estudios curados están congelados: no se guardan mediciones nuevas.' };
  }
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa.' };
  }
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        delete from lxp.anotaciones_dicom
        where tabla = ${tabla} and caso_id = ${casoId} and autor_id = ${alumno.userId}`;
      for (const a of items) {
        await sql`
          insert into lxp.anotaciones_dicom
            (caso_id, tabla, serie, frame, autor_id, autor_nombre, tipo, datos, valor)
          values (
            ${casoId}, ${tabla}, ${a.serie}, ${a.frame}, ${alumno.userId}, ${alumno.nombre},
            ${a.tipo}, ${sql.json(a.datos as never)}, ${a.valor}
          )`;
      }
    });
    return { ok: true, datos: { guardadas: items.length } };
  } catch (e) {
    console.error('[guardarAnotaciones] fallo:', e);
    return { ok: false, error: 'No se pudieron guardar las mediciones.' };
  }
}

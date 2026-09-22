'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import {
  comoAutoevalConfig,
  normalizarReactivo,
  nuevoId,
  type AutoevalConfig,
  type ReactivoConfig,
} from '@/lib/studio/autoeval-contrato';

/**
 * Server actions del editor de lección `autoevaluacion` (§5C · course builder).
 *
 * El examen (banco de reactivos + ajustes) es un tipo `config-backed`: se guarda en
 * `lxp.lecciones.config` con CRUD directo `web → Supabase` bajo RLS (Regla de Oro §2
 * · `comoStaff` → policy `es_autoria`). El editor maneja el estado localmente y
 * persiste el objeto entero con `guardarAutoeval`.
 *
 * DOS integraciones sí van al `api` (dominio · §2), porque no son CRUD:
 *   · Eco PROPONE examen  → POST /ai/proponer-examen (devuelve reactivos borrador).
 *   · IMPORTAR reactivos  → POST /reactivos/importar (parseo server-side de CSV/Excel).
 * Ambas DEVUELVEN los reactivos al cliente (no escriben el banco): el editor los
 * agrega a su estado y el guardado normal los persiste. Así el estado local es la
 * única fuente de verdad y no hay carrera que pise las ediciones sin guardar.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

function refrescar(programaId: string) {
  revalidatePath('/studio/programas');
  revalidatePath(`/studio/programas/${programaId}`);
}

/** Lee el `config` actual de la lección (normalizado). */
async function leerConfig(userId: string, leccionId: string): Promise<AutoevalConfig> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<{ config: Record<string, unknown> }[]>`
      select config from lxp.lecciones where id = ${leccionId} limit 1`;
    return comoAutoevalConfig(rows[0]?.config ?? {});
  });
}

/**
 * Guarda el examen completo (reactivos + ajustes). El editor maneja el estado
 * localmente y persiste el objeto entero — un solo jsonb, sin acciones granulares.
 * Preserva `actividadId` (el puente de scratch del import) leyéndolo de la BD.
 */
export async function guardarAutoeval(
  programaId: string,
  leccionId: string,
  config: AutoevalConfig,
): Promise<void> {
  const { userId } = await requireAutoria();
  const reactivos = (config.reactivos ?? [])
    .map(normalizarReactivo)
    .filter((r): r is ReactivoConfig => r !== null);
  const actual = await leerConfig(userId, leccionId);
  const entero = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
  const limpio: AutoevalConfig = {
    reactivos,
    descripcion: config.descripcion?.trim() || undefined,
    intentos: entero(config.intentos),
    barajar: config.barajar === true,
    mostrarRetro: config.mostrarRetro !== false,
    minutos: entero(config.minutos),
    umbral:
      typeof config.umbral === 'number' && config.umbral >= 0
        ? Math.min(100, Math.floor(config.umbral))
        : undefined,
    fechaApertura: config.fechaApertura?.trim() || undefined,
    fechaCierre: config.fechaCierre?.trim() || undefined,
    cuentaParaCalificacion: config.cuentaParaCalificacion === true,
    actividadId: actual.actividadId, // preserva el puente de scratch (lo fija el import)
  };
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.lecciones set config = ${sql.json(limpio as never)} where id = ${leccionId}`;
  });
  refrescar(programaId);
}

/**
 * Eco PROPONE un examen (§7A). Llama al dominio (`/ai/proponer-examen`), que devuelve
 * reactivos borrador. Los normaliza (origen `eco`) y los DEVUELVE al cliente; nada se
 * asienta aquí — el diseñador los revisa y el guardado normal los persiste.
 */
export async function proponerExamenAutoeval(datos: {
  tema: string;
  cantidad?: number;
  dominio?: string;
}): Promise<{ reactivos: ReactivoConfig[]; aviso?: string; error?: string }> {
  await requireAutoria();
  const tema = datos.tema?.trim();
  if (!tema) return { reactivos: [], error: 'Escribe un tema para que Eco proponga el examen.' };

  let respuesta: { reactivos?: unknown[]; aviso?: string };
  try {
    const res = await fetch(`${apiBase()}/ai/proponer-examen`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tema, cantidad: datos.cantidad, dominio: datos.dominio }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`proponer-examen HTTP ${res.status}`);
    respuesta = (await res.json()) as { reactivos?: unknown[]; aviso?: string };
  } catch (e) {
    // §5: no tragar la excepción; log server + mensaje amable.
    console.error('[proponerExamenAutoeval] fallo al contactar el dominio:', e);
    return { reactivos: [], error: 'No se pudo contactar a Eco (apps/api). ¿Está levantada la API?' };
  }

  const reactivos = (respuesta.reactivos ?? [])
    .map((r) => normalizarReactivo({ ...(r as object), id: nuevoId(), origen: 'eco', puntaje: 1 }))
    .filter((r): r is ReactivoConfig => r !== null);
  const salida: { reactivos: ReactivoConfig[]; aviso?: string } = { reactivos };
  if (respuesta.aviso) salida.aviso = respuesta.aviso;
  return salida;
}

/**
 * IMPORTA reactivos de un CSV/Excel reutilizando el parseo server-side del `api`
 * (`/reactivos/importar`). Ese endpoint escribe en `lxp.reactivos` atado a una
 * actividad; aquí se usa una actividad-puente de scratch (persistida en
 * `config.actividadId`), y tras el import se LEEN los reactivos ya parseados y se
 * DEVUELVEN al cliente para que los agregue al banco de `config`.
 */
export async function importarReactivosAutoeval(
  programaId: string,
  leccionId: string,
  form: FormData,
): Promise<{ reactivos: ReactivoConfig[]; importados: number; errores: string[]; error?: string }> {
  const { userId } = await requireAutoria();
  const archivo = form.get('archivo');
  if (!(archivo instanceof Blob) || archivo.size === 0) {
    return { reactivos: [], importados: 0, errores: [], error: 'Adjunta un archivo CSV o Excel.' };
  }

  // 1) Asegura la actividad-puente de scratch (una por lección, reutilizable).
  const config = await leerConfig(userId, leccionId);
  const actividadId = await asegurarActividadScratch(userId, leccionId, config.actividadId, programaId);

  // 2) Reenvía el multipart al dominio (parseo + validación · exceljs).
  let resultado: { importados?: number; errores?: string[] };
  try {
    const reenvio = new FormData();
    reenvio.append('archivo', archivo, (archivo as File).name || 'reactivos.csv');
    reenvio.append('actividadId', actividadId);
    const res = await fetch(`${apiBase()}/reactivos/importar`, {
      method: 'POST',
      body: reenvio,
      cache: 'no-store',
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`reactivos/importar HTTP ${res.status} ${detalle.slice(0, 200)}`);
    }
    resultado = (await res.json()) as { importados?: number; errores?: string[] };
  } catch (e) {
    console.error('[importarReactivosAutoeval] fallo al importar:', e);
    return {
      reactivos: [],
      importados: 0,
      errores: [],
      error: 'No se pudo importar (apps/api). Revisa el formato del archivo o si la API está arriba.',
    };
  }

  // 3) Lee los reactivos ya parseados de la actividad-puente y los devuelve.
  const filas = await comoStaff(userId, async (sql) => {
    return sql<
      {
        orden: number;
        tipo: string;
        enunciado: string;
        opciones: unknown;
        correcta: unknown;
        puntaje: number;
        dominio_iaim: string | null;
        retro: string | null;
      }[]
    >`
      select orden, tipo::text as tipo, enunciado, opciones, correcta, puntaje,
             dominio_iaim, retro
      from lxp.reactivos where actividad_id = ${actividadId} order by orden`;
  });

  const reactivos = filas
    .map((r) =>
      normalizarReactivo({
        id: nuevoId(),
        tipo: r.tipo,
        enunciado: r.enunciado,
        opciones: r.opciones,
        correcta: r.correcta,
        puntaje: r.puntaje,
        dominio: r.dominio_iaim ?? undefined,
        retro: r.retro ?? undefined,
        origen: 'import',
      }),
    )
    .filter((r): r is ReactivoConfig => r !== null);

  return {
    reactivos,
    importados: resultado.importados ?? reactivos.length,
    errores: resultado.errores ?? [],
  };
}

/**
 * Devuelve el id de la actividad-puente de scratch de la lección; la crea si no
 * existe (o si la referenciada ya no está) y fija `config.actividadId` con un merge
 * jsonb (sin tocar el banco de reactivos de `config`). Es una actividad
 * `autoevaluacion` normal (RLS es_autoria); solo sirve de landing del parseo.
 */
async function asegurarActividadScratch(
  userId: string,
  leccionId: string,
  actividadId: string | undefined,
  programaId: string,
): Promise<string> {
  return comoStaff(userId, async (sql) => {
    if (actividadId) {
      const existe = await sql<{ id: string }[]>`
        select id from lxp.actividades where id = ${actividadId} and leccion_id = ${leccionId} limit 1`;
      if (existe[0]) return existe[0].id;
    }
    const rows = await sql<{ id: string }[]>`
      insert into lxp.actividades (leccion_id, tipo, titulo, orden)
      values (${leccionId}, 'autoevaluacion'::lxp.actividad_tipo, 'Import de reactivos (scratch)', 0)
      returning id`;
    const nuevo = rows[0]!.id;
    // Merge del puntero al config sin pisar `reactivos` ni los ajustes.
    await sql`
      update lxp.lecciones
      set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('actividadId', ${nuevo}::text)
      where id = ${leccionId}`;
    revalidatePath(`/studio/programas/${programaId}`);
    return nuevo;
  });
}

'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from '@/lib/campus/resultado';
import type { EstructuraPlantilla } from '@/lib/reportes/estructura';
import { contenidoVacio, type ContenidoReporte, type DatosPaciente, type EstadoReporte } from './_contrato';
import { getReporte } from './_datos';

/**
 * Server actions del generador de reportes. CRUD simple `web → Supabase` bajo RLS
 * (Regla de Oro §2 — NO pasa por NestJS): corren con `comoAlumno`, así que la policy
 * `reportes_insert/update` (id_medico = auth.uid()) es el segundo candado.
 *
 * FASE 1: el reporte apunta a una plantilla real (`plantilla_id`) y guarda los VALORES
 * de sus campos en `contenido.valores` (jsonb).
 *
 * FRONTERA DE DOMINIO (PENDIENTE DE API · §2/§6.5/§8/§10):
 *   · generarPdf   → servicio de PDF en `apps/api`.
 *   · enviarReporte → envío por correo en `apps/api`/`worker`.
 *   · guardarComoCaso → la ANONIMIZACIÓN (quitar PII) es bloqueante y es dominio (worker).
 */

const REVALIDAR = '/herramientas/reportes';

type ResultadoCrear = { ok: true; id: string } | { ok: false; error: string };

/** Genera un expediente de 6 dígitos ÚNICO entre los reportes existentes. */
async function expedienteUnico(
  sql: Parameters<Parameters<typeof comoAlumno>[1]>[0],
): Promise<string> {
  for (let intento = 0; intento < 20; intento++) {
    const candidato = String(Math.floor(100000 + Math.random() * 900000));
    const [existe] = await sql<{ x: number }[]>`
      select 1 as x from lxp.reportes where datos_paciente->>'expediente' = ${candidato} limit 1`;
    if (!existe) return candidato;
  }
  // Fallback improbable: sufijo por tiempo para no colisionar.
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Crea un reporte en borrador para la plantilla elegida (publicada) y devuelve su id. */
export async function crearReporte(plantillaId: string): Promise<ResultadoCrear> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para crear reportes.' };
  }
  try {
    const id = await comoAlumno(alumno.userId, async (sql) => {
      // La plantilla debe existir y estar publicada (RLS select ya lo restringe al alumno).
      const [pl] = await sql<{ id: string; estructura: unknown; version: number }[]>`
        select id, estructura, version from lxp.plantillas_reporte where id = ${plantillaId} and publicado limit 1`;
      if (!pl) throw new Error('plantilla no disponible');

      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from lxp.reportes where id_medico = ${alumno.userId}`;
      const folio = `RPT-${String(n + 1).padStart(4, '0')}`;

      // Boilerplate de la plantilla (Familia A · Fase 2): precarga los campos con su texto
      // predeterminado (los `xx` intactos que el médico rellena) + la impresión sugerida.
      const { normalizarEstructura, inicialesDesde } = await import('@/lib/reportes/estructura');
      const estructura = normalizarEstructura(pl.estructura);
      const iniciales = inicialesDesde(estructura);

      const contenido = contenidoVacio(folio, plantillaId);
      contenido.valores = iniciales.valores;
      // Si la plantilla EXCLUYE la impresión, no se siembra (así no fluye al PDF ni al caso).
      contenido.impresion = estructura.incluyeImpresion !== false ? (estructura.impresionDefecto ?? '') : '';

      // SNAPSHOT (§6.5): se CONGELA la estructura de la plantilla + su versión DENTRO de `contenido`
      // al crear el reporte. A partir de aquí el reporte es autocontenido: aunque la plantilla se
      // edite después, este reporte renderiza con su snapshot. NUNCA se re-copia (ver guardarBorrador).
      const contenidoConSnapshot = { ...contenido, estructuraSnapshot: estructura, plantillaVersion: pl.version };

      // Encabezado autollenado: expediente ÚNICO + médico solicitante = usuario logueado.
      const expediente = await expedienteUnico(sql);
      const datosPaciente = { ...iniciales.datosPaciente, expediente, solicitante: alumno.nombre ?? '' };

      // jsonb: pasar el OBJETO vía `sql.json` — NO `JSON.stringify(x)::jsonb` (postgres.js
      // vuelve a serializar el string y lo guarda DOBLE-CODIFICADO como texto JSON, dejando
      // `valores`/`impresion` inalcanzables → el PDF salía vacío).
      const [row] = await sql<{ id: string }[]>`
        insert into lxp.reportes (id_medico, plantilla_id, datos_paciente, contenido, estado)
        values (${alumno.userId}, ${plantillaId}, ${sql.json(datosPaciente)},
                ${sql.json(contenidoConSnapshot as Parameters<typeof sql.json>[0])}, 'borrador')
        returning id`;
      return row.id;
    });
    revalidatePath(REVALIDAR);
    return { ok: true, id };
  } catch {
    return { ok: false, error: 'No se pudo crear el reporte. La plantilla no está disponible.' };
  }
}

/** Guarda el borrador: datos de paciente + cuerpo del reporte (valores jsonb). */
export async function guardarBorrador(
  id: string,
  datosPaciente: DatosPaciente,
  contenido: ContenidoReporte,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      // jsonb vía `sql.json` (objeto), no `JSON.stringify(x)::jsonb` — ver crearReporte.
      // SNAPSHOT (§6.5): el `estructuraSnapshot`/`plantillaVersion` YA congelados se PRESERVAN
      // server-side (se re-mezclan desde la fila actual, `||` con precedencia derecha). El cliente
      // no los envía ni los puede pisar → una vez seteados al crear, NUNCA se re-copian.
      await sql`
        update lxp.reportes
        set datos_paciente = ${sql.json(datosPaciente as Parameters<typeof sql.json>[0])},
            contenido = ${sql.json(contenido as Parameters<typeof sql.json>[0])}::jsonb
              || jsonb_build_object(
                   'estructuraSnapshot', contenido -> 'estructuraSnapshot',
                   'plantillaVersion', contenido -> 'plantillaVersion'
                 )
        where id = ${id} and id_medico = ${alumno.userId}`;
    });
    revalidatePath(REVALIDAR);
    revalidatePath(`${REVALIDAR}/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo guardar el borrador.' };
  }
}

async function cambiarEstado(id: string, estado: EstadoReporte): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.reportes set estado = ${estado}
        where id = ${id} and id_medico = ${alumno.userId}`;
    });
    revalidatePath(REVALIDAR);
    revalidatePath(`${REVALIDAR}/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo actualizar el reporte.' };
  }
}

/** Finaliza el reporte (deja de ser borrador). El PDF/envío son pasos aparte. */
export async function finalizarReporte(id: string): Promise<ResultadoAccion> {
  return cambiarEstado(id, 'finalizado');
}

/**
 * Reabre un reporte finalizado para editarlo (estado → borrador). No hay versionado: al
 * volver a finalizar se SOBRESCRIBE la misma versión. RLS (id_medico) sigue siendo el candado.
 */
export async function reabrirReporte(id: string): Promise<ResultadoAccion> {
  return cambiarEstado(id, 'borrador');
}

/**
 * Marca el reporte como enviado al paciente. El ENVÍO POR CORREO real es dominio
 * (`apps/api`/`worker`) — PENDIENTE DE API. Aquí solo se refleja el estado.
 */
export async function enviarReporte(id: string): Promise<ResultadoAccion> {
  return cambiarEstado(id, 'enviado');
}

export type ImagenDicomReporte = { campoId: string; pngBase64: string };
/** Imagen `.dcm` de una GALERÍA, rasterizada en el cliente (PNG) e indexada por su `ref`. */
export type ImagenGaleriaDicomReporte = { ref: string; pngBase64: string };
export type ResultadoPdf =
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; error: string };

/**
 * Genera el PDF del reporte (DOMINIO §2 — el servicio de PDF vive en `apps/api`). Gatea la
 * propiedad bajo RLS (`comoAlumno`, id_medico = auth.uid()) ANTES de llamar y pasa el userId
 * como candado que el `api` revalida (mismo filtro que `getReporte`). Las imágenes DICOM las
 * rasteriza el cliente (visor Cornerstone) y viajan en el body. Devuelve el PDF en base64 para
 * que el navegador lo descargue/imprima como blob.
 */
export async function generarPdf(
  id: string,
  imagenesDicom: ImagenDicomReporte[] = [],
  imagenesGaleriaDicom: ImagenGaleriaDicomReporte[] = [],
): Promise<ResultadoPdf> {
  const alumno = await getSesionAlumno();
  const propio = await comoAlumno(alumno.userId, (sql) =>
    sql<{ folio: string | null }[]>`
      select contenido->>'folio' as folio
      from lxp.reportes where id = ${id} and id_medico = ${alumno.userId} limit 1`,
  );
  if (propio.length === 0) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/${encodeURIComponent(id)}/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: alumno.userId, imagenesDicom, imagenesGaleriaDicom }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo generar el PDF (HTTP ${res.status}).` };
    const bytes = Buffer.from(await res.arrayBuffer());
    const folio = (propio[0]?.folio ?? 'reporte').replace(/[^a-zA-Z0-9._-]/g, '') || 'reporte';
    return { ok: true, pdfBase64: bytes.toString('base64'), filename: `${folio}.pdf` };
  } catch {
    return { ok: false, error: 'No se pudo contactar el servicio de PDF (apps/api).' };
  }
}

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type DatosReportePdf =
  | { ok: true; estructura: EstructuraPlantilla; valores: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Estructura + valores de un reporte del médico (RLS: solo el dueño, vía `getReporte`), para que
 * el CLIENTE rasterice las imágenes DICOM offscreen y arme el PDF DESDE EL LISTADO (sin abrir el
 * editor). No expone nada que el dueño no pueda ya ver en el editor.
 */
export async function datosReportePdf(id: string): Promise<DatosReportePdf> {
  const alumno = await getSesionAlumno();
  const rep = await getReporte(alumno.userId, id);
  if (!rep) return { ok: false, error: 'Ese reporte no es tuyo o no existe.' };
  const estructura = rep.plantilla?.estructura ?? { secciones: [] };
  return { ok: true, estructura, valores: rep.contenido.valores };
}

export type ResultadoCaso =
  | { ok: true; casoId: string; yaExistia: boolean; conEstudio: boolean }
  | { ok: false; error: string };

/**
 * "Guardar como caso": deriva del reporte un caso educativo ANONIMIZADO en la bitácora del
 * médico (§6/§10). Es DOMINIO (§2 — NO web): el puente vive en `apps/api` (`reportes`), que
 * aplana el contenido, infiere órgano/dominio y REUSA `procesar-dicom` para limpiar TAGS
 * (dcmjs) + PÍXELES (Presidio) + escribir la traza §10. Aquí solo se gatea propiedad (RLS) y
 * se dispara. El docente decide luego qué curar (bitácora→validación→biblioteca).
 */
export async function guardarComoCaso(id: string): Promise<ResultadoCaso> {
  const alumno = await getSesionAlumno();
  const propio = await comoAlumno(alumno.userId, (sql) =>
    sql<{ id: string }[]>`select id from lxp.reportes where id = ${id} and id_medico = ${alumno.userId} limit 1`,
  );
  if (propio.length === 0) return { ok: false, error: 'Ese reporte no es tuyo.' };
  try {
    const res = await fetch(`${apiBase()}/reportes/${encodeURIComponent(id)}/generar-caso`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo generar el caso (HTTP ${res.status}).` };
    const d = (await res.json()) as { casoId: string; yaExistia: boolean; conEstudio: boolean };
    revalidatePath(REVALIDAR);
    revalidatePath('/bitacora');
    return { ok: true, casoId: d.casoId, yaExistia: !!d.yaExistia, conEstudio: !!d.conEstudio };
  } catch {
    return { ok: false, error: 'No se pudo contactar el servicio de dominio (apps/api).' };
  }
}

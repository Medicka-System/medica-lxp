'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from '@/lib/campus/resultado';
import {
  plantillaDe,
  piezasPorDefecto,
  type ContenidoReporte,
  type DatosPaciente,
  type EstadoReporte,
  type TipoEstudio,
} from './_contrato';

/**
 * Server actions del generador de reportes. CRUD simple `web → Supabase` bajo RLS
 * (Regla de Oro §2 — NO pasa por NestJS): corren con `comoAlumno`, así que la policy
 * `reportes_insert/update` (id_medico = auth.uid()) es el segundo candado.
 *
 * FRONTERA DE DOMINIO (PENDIENTE DE API · §2/§6.5/§8/§10):
 *   · generarPdf   → el servicio de PDF vive en `apps/api` (aquí solo se dispara).
 *   · enviarReporte → el envío por correo al paciente vive en `apps/api`/`worker`.
 *   · guardarComoCaso → la ANONIMIZACIÓN (quitar PII) es bloqueante y es dominio
 *     (worker `procesar-dicom`/pipeline). El caso educativo NUNCA se crea aquí con
 *     datos de paciente (§10). Se deja como stub hasta cablear el contrato con `api`.
 */

const REVALIDAR = '/herramientas/reportes';

type ResultadoCrear = { ok: true; id: string } | { ok: false; error: string };

/** Crea un reporte en borrador para el tipo de estudio elegido y devuelve su id. */
export async function crearReporte(tipo: TipoEstudio): Promise<ResultadoCrear> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para crear reportes.' };
  }

  const plantilla = plantillaDe(tipo);
  try {
    const id = await comoAlumno(alumno.userId, async (sql) => {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from lxp.reportes where id_medico = ${alumno.userId}`;
      const folio = `RPT-${String(n + 1).padStart(4, '0')}`;
      const contenido: ContenidoReporte = {
        folio,
        tipo,
        secciones: plantilla.secciones.map((titulo, i) => ({
          id: `s${i + 1}`,
          titulo,
          texto: '',
          imagenesInsertadas: 0,
        })),
        impresion: '',
        piezas: piezasPorDefecto(),
      };
      const [row] = await sql<{ id: string }[]>`
        insert into lxp.reportes (id_medico, datos_paciente, contenido, estado)
        values (${alumno.userId}, '{}'::jsonb, ${JSON.stringify(contenido)}::jsonb, 'borrador')
        returning id`;
      return row.id;
    });
    revalidatePath(REVALIDAR);
    return { ok: true, id };
  } catch {
    return { ok: false, error: 'No se pudo crear el reporte. Inténtalo de nuevo.' };
  }
}

/** Guarda el borrador: datos de paciente + cuerpo del reporte (jsonb). */
export async function guardarBorrador(
  id: string,
  datosPaciente: DatosPaciente,
  contenido: ContenidoReporte,
): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa.' };
  }
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.reportes
        set datos_paciente = ${JSON.stringify(datosPaciente)}::jsonb,
            contenido = ${JSON.stringify(contenido)}::jsonb
        where id = ${id} and id_medico = ${alumno.userId}`;
    });
    revalidatePath(REVALIDAR);
    revalidatePath(`${REVALIDAR}/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo guardar el borrador.' };
  }
}

/** Cambia el estado del reporte (borrador → finalizado → enviado). */
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
 * Marca el reporte como enviado al paciente. El ENVÍO POR CORREO real es dominio
 * (`apps/api`/`worker`) — PENDIENTE DE API. Aquí solo se refleja el estado.
 */
export async function enviarReporte(id: string): Promise<ResultadoAccion> {
  // PENDIENTE DE API: encolar correo al paciente con el PDF adjunto (§9).
  return cambiarEstado(id, 'enviado');
}

/**
 * STUB — genera el PDF del reporte. El servicio de PDF vive en `apps/api` (§6.5).
 * No se implementa en web; se deja el punto de enganche.
 */
export async function generarPdf(_id: string): Promise<ResultadoAccion> {
  // PENDIENTE DE API: llamar al servicio de reportes (render → object storage → pdf_ref).
  return { ok: false, error: 'La generación de PDF se conecta con el servicio de dominio (pendiente).' };
}

/**
 * STUB — "Guardar como caso": deriva una versión ANONIMIZADA del estudio hacia
 * `lxp.bitacora_casos` (§6). La anonimización (quitar nombre/expediente/fechas) es
 * BLOQUEANTE y es dominio (worker, §8/§10): NO se hace en web. Contrato PENDIENTE DE API.
 */
export async function guardarComoCaso(_id: string): Promise<ResultadoAccion> {
  // PENDIENTE DE API: enviar a `api` → anonimizar → insertar bitacora_casos →
  // enlazar reportes.caso_generado_id. Nunca crear el caso con PII desde el cliente.
  return {
    ok: false,
    error: 'Guardar como caso anonimizado se conecta con el dominio de anonimización (pendiente).',
  };
}

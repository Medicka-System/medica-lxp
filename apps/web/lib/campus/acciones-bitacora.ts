'use server';

import { revalidatePath } from 'next/cache';
import { aplanarContenidoCaso, type ContenidoEstructuradoCaso } from '@campus/shared';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { cuerpoCasoInicial } from '@/lib/reportes/plantilla-caso-defecto';
import type { DominioIaim } from './bitacora-contrato';

/** Resultado de `subirCaso`: devuelve el id para adjuntarle el estudio DICOM. */
export type ResultadoSubirCaso = { ok: true; casoId: string } | { ok: false; error: string };
export type ResultadoAccion = { ok: true } | { ok: false; error: string };

/**
 * Datos capturables del caso (mig 0025 · rediseño sobre el motor de reportes). La metadata
 * es opcional; la viñeta y el diagnóstico presuntivo (bloque pedagógico) son OBLIGATORIOS.
 * El CUERPO (`contenidoEstructurado`) es la verdad del estudio: de él se DERIVA el texto
 * `hallazgos` (índice para card/búsqueda/Eco/Ateneo · `aplanarContenidoCaso`). Si no llega
 * cuerpo, se usa la plantilla por defecto.
 */
export type DatosCaso = {
  moduloId?: string;
  organo?: string;
  patologia?: string;
  dominio?: DominioIaim | null;
  tecnica?: string;
  equipo?: string;
  docenteId?: string | null;
  etiquetas?: string[];
  vineta?: string;
  presuntivo?: string;
  contenidoEstructurado?: ContenidoEstructuradoCaso;
};

/**
 * Valida el bloque pedagógico (obligatorio) y deriva el `hallazgos` del cuerpo estructurado.
 * Devuelve el cuerpo a persistir, el hallazgos derivado, la viñeta y el presuntivo limpios;
 * o un mensaje de error si algo falta.
 */
function prepararCaso(
  datos: DatosCaso,
):
  | { ok: true; cuerpo: ContenidoEstructuradoCaso; hallazgos: string; vineta: string; presuntivo: string }
  | { ok: false; error: string } {
  const vineta = (datos.vineta ?? '').trim();
  if (!vineta) return { ok: false, error: 'Escribe la viñeta clínica (contexto del caso) antes de guardar.' };
  const presuntivo = (datos.presuntivo ?? '').trim();
  if (!presuntivo) return { ok: false, error: 'Escribe tu diagnóstico presuntivo antes de guardar.' };
  const cuerpo = datos.contenidoEstructurado ?? cuerpoCasoInicial();
  const hallazgos = aplanarContenidoCaso(cuerpo).trim();
  if (!hallazgos) return { ok: false, error: 'Describe los hallazgos del estudio antes de guardar el caso.' };
  return { ok: true, cuerpo, hallazgos, vineta, presuntivo };
}

/**
 * Server actions de la bitácora. CRUD simple `web → Supabase` bajo RLS (Regla de Oro
 * §2 — NO pasa por NestJS): corre con `comoAlumno`, así que las policies bitacora_*
 * (id_alumno = auth.uid() + acceso_activo) son el segundo candado. La validación, la
 * competencia y el xAPI son dominio y NO viven aquí (ver bitacora-contrato · PENDIENTE).
 */

/** Normaliza etiquetas: recorta, quita vacías y duplicados, máx 12. */
function normalizarEtiquetas(v: string[] | undefined): string[] {
  if (!Array.isArray(v)) return [];
  const limpio = v.map((t) => t.trim().replace(/^#+/, '')).filter(Boolean);
  return [...new Set(limpio)].slice(0, 12);
}

/**
 * Sube un caso heredando el MÓDULO del contexto (y sus horas), con la ficha completa
 * (§6 · mig 0025). El caso nace `pendiente` con `estudio_estado` 'pendiente'. El CHECK
 * de 0014 impide fijar `estudio_dicom_ref` sin traza de anonimización; el estudio se
 * adjunta DESPUÉS con el `casoId` devuelto (ver lib/dicom/acciones · multi-serie).
 */
export async function subirCaso(datos: DatosCaso): Promise<ResultadoSubirCaso> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para subir casos.' };
  }
  const prep = prepararCaso(datos);
  if (!prep.ok) return prep;
  const etiquetas = normalizarEtiquetas(datos.etiquetas);

  let casoId: string;
  try {
    casoId = await comoAlumno(alumno.userId, async (sql) => {
      const rows = await sql<{ id: string }[]>`
        insert into lxp.bitacora_casos
          (id_alumno, modulo_id, organo, patologia, dominio_iaim, tecnica, equipo,
           docente_id, etiquetas, vineta, hallazgos, diagnostico_presuntivo,
           contenido_estructurado, origen, estado_validacion, estudio_estado)
        values (
          ${alumno.userId},
          ${datos.moduloId || null},
          ${datos.organo?.trim() || null},
          ${datos.patologia?.trim() || null},
          ${datos.dominio ?? null}::lxp.dominio_iaim,
          ${datos.tecnica?.trim() || null},
          ${datos.equipo?.trim() || null},
          ${datos.docenteId || null},
          ${sql.json(etiquetas)},
          ${prep.vineta},
          ${prep.hallazgos},
          ${prep.presuntivo},
          ${sql.json(prep.cuerpo as never)},
          'alumno'::lxp.origen_caso,
          'pendiente'::lxp.estado_validacion,
          'pendiente'::lxp.estudio_dicom_estado
        )
        returning id`;
      return rows[0]!.id;
    });
  } catch {
    return { ok: false, error: 'No se pudo subir el caso. Inténtalo de nuevo.' };
  }
  // PENDIENTE DE API: encolar xAPI `subió` en `envio-xapi` (§7). Ver contrato.
  revalidatePath('/bitacora');
  return { ok: true, casoId };
}

/**
 * Edita la ficha de un caso del alumno. Solo mientras esté EN REVISIÓN (pendiente):
 * un caso ya acreditado/rechazado no se edita (se refleja lo que validó el docente).
 * CRUD directo bajo RLS (bitacora_update: id_alumno = auth.uid() + acceso_activo); el
 * guard de estado es un candado extra en dominio.
 */
export async function actualizarCaso(casoId: string, datos: DatosCaso): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const prep = prepararCaso(datos);
  if (!prep.ok) return prep;
  const etiquetas = normalizarEtiquetas(datos.etiquetas);

  try {
    const n = await comoAlumno(alumno.userId, async (sql) => {
      const rows = await sql`
        update lxp.bitacora_casos set
          organo = ${datos.organo?.trim() || null},
          patologia = ${datos.patologia?.trim() || null},
          dominio_iaim = ${datos.dominio ?? null}::lxp.dominio_iaim,
          tecnica = ${datos.tecnica?.trim() || null},
          equipo = ${datos.equipo?.trim() || null},
          docente_id = ${datos.docenteId || null},
          etiquetas = ${sql.json(etiquetas)},
          vineta = ${prep.vineta},
          hallazgos = ${prep.hallazgos},
          diagnostico_presuntivo = ${prep.presuntivo},
          contenido_estructurado = ${sql.json(prep.cuerpo as never)}
        where id = ${casoId}
          and id_alumno = ${alumno.userId}
          and estado_validacion = 'pendiente'`;
      return rows.count;
    });
    if (n === 0) {
      return { ok: false, error: 'No se pudo editar: el caso ya no está en revisión o no es tuyo.' };
    }
  } catch {
    return { ok: false, error: 'No se pudo guardar el caso. Inténtalo de nuevo.' };
  }
  revalidatePath('/bitacora');
  revalidatePath(`/bitacora/${casoId}`);
  return { ok: true };
}

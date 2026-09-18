'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';
import type { DominioIaim } from './bitacora-contrato';

/**
 * Server action de la bitácora. CRUD simple `web → Supabase` bajo RLS (Regla de Oro
 * §2 — NO pasa por NestJS): corre con `comoAlumno`, así que la policy bitacora_insert
 * (id_alumno = auth.uid() + acceso_activo) es el segundo candado. La validación, la
 * competencia y el xAPI son dominio y NO viven aquí (ver bitacora-contrato · PENDIENTE).
 */

/**
 * Sube un caso heredando el MÓDULO del contexto (y sus horas). El estudio DICOM NO
 * se adjunta aquí: el caso nace `pendiente` con `estudio_estado` 'pendiente' (a la
 * espera del pipeline de ingesta · 4.7). El CHECK de 0014 impide fijar
 * `estudio_dicom_ref` sin traza de anonimización, así que no se toca.
 */
export async function subirCaso(datos: {
  moduloId: string;
  organo: string;
  dominio: DominioIaim | null;
  hallazgos: string;
  presuntivo: string;
}): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para subir casos.' };
  }
  const hallazgos = datos.hallazgos.trim();
  if (!hallazgos) return { ok: false, error: 'Describe al menos un hallazgo antes de subir el caso.' };

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.bitacora_casos
          (id_alumno, modulo_id, organo, dominio_iaim, hallazgos, diagnostico_presuntivo,
           origen, estado_validacion, estudio_estado)
        values (
          ${alumno.userId},
          ${datos.moduloId || null},
          ${datos.organo.trim() || null},
          ${datos.dominio ?? null}::lxp.dominio_iaim,
          ${hallazgos},
          ${datos.presuntivo.trim() || null},
          'alumno'::lxp.origen_caso,
          'pendiente'::lxp.estado_validacion,
          'pendiente'::lxp.estudio_dicom_estado
        )`;
    });
  } catch {
    return { ok: false, error: 'No se pudo subir el caso. Inténtalo de nuevo.' };
  }
  // PENDIENTE DE API: encolar xAPI `subió` en `envio-xapi` (§7). Ver contrato.
  revalidatePath('/bitacora');
  return { ok: true };
}

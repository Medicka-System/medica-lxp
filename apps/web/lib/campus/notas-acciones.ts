'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { AnclaNota, Nota, NotaTipo, NuevaNota } from './notas-contrato';
import type { ResultadoAccion } from './resultado';

/**
 * Server actions de las NOTAS del alumno (§5A · mig 0027). CRUD simple web→Supabase
 * bajo RLS (Regla de Oro §2 — NO pasa por NestJS): corre con `comoAlumno`, así que la
 * policy notas_* (alumno_id = auth.uid()) es el segundo candado. El acceso en pausa
 * (pago vencido · §10) bloquea la escritura.
 */

const TIPOS: readonly NotaTipo[] = [
  'texto_seleccionado',
  'nota_libre',
  'subrayado',
  'marcador_video',
];

type CrearResultado = { ok: true; nota: Nota } | { ok: false; error: string };

/** Crea una nota del alumno y la devuelve (para insertar en la lista sin recargar). */
export async function crearNota(input: NuevaNota): Promise<CrearResultado> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  if (!TIPOS.includes(input.tipo)) {
    return { ok: false, error: 'Tipo de nota no válido.' };
  }
  const contenido = input.contenido.trim();
  const ancla: AnclaNota = input.ancla ?? {};
  // Una nota libre necesita texto; las ancladas (subrayado/cita/marcador) pueden no
  // traer contenido escrito (el texto/tiempo va en el ancla).
  if (input.tipo === 'nota_libre' && !contenido) {
    return { ok: false, error: 'Escribe algo antes de guardar la nota.' };
  }

  try {
    return await comoAlumno(alumno.userId, async (sql) => {
      const filas = await sql<
        { id: string; tipo: NotaTipo; contenido: string; ancla: AnclaNota | null; created_at: string }[]
      >`
        insert into lxp.notas (alumno_id, leccion_id, modulo_id, tipo, contenido, ancla)
        values (
          ${alumno.userId},
          ${input.leccionId},
          ${input.moduloId ?? null},
          ${input.tipo}::lxp.nota_tipo,
          ${contenido},
          ${JSON.stringify(ancla)}::jsonb
        )
        returning id, tipo, contenido, ancla, created_at`;
      const f = filas[0]!;
      revalidatePath(`/leccion/${input.leccionId}`);
      return {
        ok: true as const,
        nota: {
          id: f.id,
          tipo: f.tipo,
          contenido: f.contenido,
          ancla: (f.ancla ?? {}) as AnclaNota,
          creadoEn: f.created_at,
        },
      };
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar la nota. Inténtalo de nuevo.' };
  }
}

/** Edita el texto de una nota (solo del propio alumno · RLS). */
export async function editarNota(id: string, contenido: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  const texto = contenido.trim();
  if (!texto) return { ok: false, error: 'La nota no puede quedar vacía.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`update lxp.notas set contenido = ${texto} where id = ${id}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo actualizar la nota.' };
  }
  return { ok: true };
}

/** Borra una nota (solo del propio alumno · RLS). */
export async function borrarNota(id: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`delete from lxp.notas where id = ${id}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo borrar la nota.' };
  }
  return { ok: true };
}

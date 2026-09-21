'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { marcarLeccionCompletada } from './leccion-acciones';
import type { ResultadoAccion } from './resultado';

/**
 * Reporte de progreso de las lecciones INTERACTIVAS del alumno (h5p / paquete xAPI ·
 * §5C · §7). A diferencia de `marcarLeccionCompletada` (CRUD directo web→Supabase, sin
 * LRS), aquí el progreso pasa por el DOMINIO (`apps/api` · POST /players/progreso)
 * porque además EMITE al LRS: no puede vivir en el cliente ni en una policy (§2/§7).
 * El player nuevo lee su contenido de `lecciones.config`, pero el ancla de progreso es
 * la fila `lxp.contenidos` compat (su uuid lo exige el endpoint y la FK de
 * reproduccion_progreso).
 *
 * Resiliencia: si el `api` no responde (o no hay ancla de contenido), se cae al CRUD
 * directo para no perder el avance del alumno — la emisión al LRS quedará pendiente.
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export async function reportarProgresoInteractivo(input: {
  leccionId: string;
  /** Ancla uuid de `lxp.contenidos` (data layer). Sin ella, se persiste local. */
  contenidoId: string | null;
  completado: boolean;
  posicionSeg?: number;
  duracionSeg?: number;
  titulo?: string;
}): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }

  // Sin ancla de contenido no podemos reportar al LRS (players/progreso exige un uuid
  // con FK a lxp.contenidos): persistimos el avance local para no perderlo.
  if (!input.contenidoId) {
    return marcarLeccionCompletada(input.leccionId);
  }

  try {
    const res = await fetch(`${apiBase()}/players/progreso`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alumnoId: alumno.userId,
        contenidoId: input.contenidoId,
        leccionId: input.leccionId,
        posicionSeg: input.posicionSeg ?? 0,
        ...(input.duracionSeg ? { duracionSeg: input.duracionSeg } : {}),
        completado: input.completado,
        ...(input.titulo ? { titulo: input.titulo } : {}),
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      // El dominio no respondió bien: persistimos el avance localmente (sin LRS).
      return marcarLeccionCompletada(input.leccionId);
    }
    revalidatePath('/cursos');
    revalidatePath(`/leccion/${input.leccionId}`);
    return { ok: true };
  } catch (e) {
    console.error('[reportarProgresoInteractivo] fallo:', e);
    return marcarLeccionCompletada(input.leccionId);
  }
}

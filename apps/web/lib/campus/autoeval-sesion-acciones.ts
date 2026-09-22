'use server';

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';

/**
 * Server actions de la SESIÓN de intento de autoevaluación (timer persistido · mig
 * 0029). CRUD simple del alumno bajo RLS (Regla de Oro §2 — NO pasa por NestJS):
 * corre con `comoAlumno`, así que la policy autoeval_sesiones_* (alumno_id =
 * auth.uid()) es el segundo candado. El acceso en pausa (pago vencido · §10) bloquea.
 *
 * El `iniciado_en` se fija UNA vez (on conflict do nothing): recargar no reinicia el
 * reloj. El motor la borra al enviar (`finalizarSesionAutoeval`), de modo que el
 * siguiente intento arranca su propio tiempo.
 */

export type IniciarResultado =
  | { ok: true; iniciadoEn: string }
  | { ok: false; error: string };

/** Abre (o recupera) la sesión de intento y devuelve su `iniciado_en`. */
export async function iniciarAutoevaluacion(leccionId: string): Promise<IniciarResultado> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) {
    return { ok: false, error: 'Tu acceso está en pausa. Regulariza tu pago para continuar.' };
  }
  try {
    return await comoAlumno(alumno.userId, async (sql) => {
      // `do nothing` preserva el inicio original si ya había una sesión abierta.
      await sql`
        insert into lxp.autoeval_sesiones (leccion_id, alumno_id)
        values (${leccionId}, ${alumno.userId})
        on conflict (leccion_id, alumno_id) do nothing`;
      const filas = await sql<{ iniciado_en: string }[]>`
        select iniciado_en from lxp.autoeval_sesiones
        where leccion_id = ${leccionId} and alumno_id = ${alumno.userId}`;
      const iniciadoEn = filas[0]?.iniciado_en;
      if (!iniciadoEn) {
        return { ok: false as const, error: 'No se pudo abrir la autoevaluación. Inténtalo de nuevo.' };
      }
      return { ok: true as const, iniciadoEn };
    });
  } catch (e) {
    console.error('[iniciarAutoevaluacion] error abriendo la sesión:', e);
    return { ok: false, error: 'No se pudo abrir la autoevaluación. Inténtalo de nuevo.' };
  }
}

/** Cierra la sesión de intento (se llama al enviar). Idempotente. */
export async function finalizarSesionAutoeval(leccionId: string): Promise<void> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        delete from lxp.autoeval_sesiones
        where leccion_id = ${leccionId} and alumno_id = ${alumno.userId}`;
    });
  } catch (e) {
    // No es fatal: la sesión caduca sola por el reloj; no bloquea el resultado.
    console.error('[finalizarSesionAutoeval] no se pudo limpiar la sesión:', e);
  }
}

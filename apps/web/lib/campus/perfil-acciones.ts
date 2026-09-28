'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { Contacto, PreferenciasGuardables } from '@/app/(campus)/cuenta/_components/tipos';

/**
 * Server actions de Mi perfil y Ajustes. CRUD simple web→Supabase bajo RLS (Regla
 * de Oro §2 — NO pasa por NestJS): corre con `comoAlumno`, así que la policy
 * `perfiles_update` (user_id = auth.uid()) es el segundo candado. El acceso en
 * pausa (pago vencido · §10) bloquea la escritura. Los datos de CORA (matrícula/
 * programa/grupo) NO se tocan aquí: son solo lectura (§10).
 */

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResultadoContacto =
  | { ok: true; verificacionCorreo: boolean }
  | { ok: false; error: string };

export type ResultadoPerfil = { ok: true } | { ok: false; error: string };

const EN_PAUSA = 'Tu acceso está en pausa. Regulariza tu pago para continuar.';

/** Guarda la bio y los intereses (visibles en el Ateneo). */
export async function guardarSobreMi(texto: string, intereses: string[]): Promise<ResultadoPerfil> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: EN_PAUSA };

  const bio = texto.trim().slice(0, 280);
  // Normaliza tags: #minúsculas, sin duplicados, máx 8.
  const tags = Array.from(
    new Set(
      intereses
        .map((t) => ('#' + t.replace(/^#/, '').trim()).toLowerCase())
        .filter((t) => t.length > 1),
    ),
  ).slice(0, 8);

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.perfiles
        set sobre_mi = ${bio}, intereses = ${sql.array(tags)}
        where user_id = ${alumno.userId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
  }
  revalidatePath('/perfil');
  return { ok: true };
}

/**
 * Guarda los datos de contacto. Nombre/especialidad/WhatsApp se aplican al momento.
 * El correo, por seguridad, NO se cambia en caliente: se dispara la verificación
 * (stub · Sprint 11 con Supabase auth.updateUser) y se aplica al confirmar.
 */
export async function guardarContacto(contacto: Contacto): Promise<ResultadoContacto> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: EN_PAUSA };

  const nombre = contacto.nombre.trim();
  const especialidad = contacto.especialidad.trim();
  const whatsapp = contacto.whatsapp.trim();
  const correo = contacto.correo.trim();
  if (!nombre) return { ok: false, error: 'El nombre no puede quedar vacío.' };
  if (!RE_CORREO.test(correo)) return { ok: false, error: 'Escribe un correo válido.' };

  try {
    const correoActual = await comoAlumno(alumno.userId, async (sql) => {
      const filas = await sql<{ email: string | null }[]>`
        select email from lxp.perfiles where user_id = ${alumno.userId}`;
      const actual = filas[0]?.email ?? alumno.email;
      await sql`
        update lxp.perfiles
        set nombre = ${nombre}, especialidad = ${especialidad}, whatsapp = ${whatsapp}
        where user_id = ${alumno.userId}`;
      return actual;
    });

    const cambiaCorreo = correo !== correoActual;
    // STUB: verificación de correo. En producción (Sprint 11) llamaría a
    // supabase.auth.updateUser({ email }) → Supabase envía el enlace de confirmación
    // y `lxp.perfiles.email` se sincroniza al confirmar. Aquí NO se persiste el correo.
    if (cambiaCorreo) {
      await solicitarVerificacionCorreo(correo);
    }
    revalidatePath('/perfil');
    return { ok: true, verificacionCorreo: cambiaCorreo };
  } catch {
    return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
  }
}

/** STUB de verificación de correo (Sprint 11). Documentado y no-op por ahora. */
async function solicitarVerificacionCorreo(_correo: string): Promise<void> {
  // Sprint 11: supabase.auth.updateUser({ email: _correo }) con redirect de confirmación.
  return;
}

/** Persiste las preferencias de Ajustes (sin `cuenta`, que es de auth · Sprint 11). */
export async function guardarPreferencias(prefs: PreferenciasGuardables): Promise<ResultadoPerfil> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: EN_PAUSA };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        update lxp.perfiles
        set preferencias = ${sql.json(prefs as Parameters<typeof sql.json>[0])}
        where user_id = ${alumno.userId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar el ajuste.' };
  }
  return { ok: true };
}

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

// ══ Foto y portada (uploader público de media · §2, mismo patrón que el Ateneo) ══

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type ResultadoFirma =
  | { ok: true; ref: string; urlSubida: string }
  | { ok: false; error: string };

/**
 * Firma la SUBIDA (PUT directo del navegador) de una imagen de perfil contra el
 * endpoint público del `api` (STORAGE_ENDPOINT_PUBLICO · §2). El `api` es el único
 * firmante S3; aquí solo se consume. Devuelve la `ref` a persistir y la `urlSubida`.
 */
export async function firmarSubidaPerfil(ext: string): Promise<ResultadoFirma> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: EN_PAUSA };
  try {
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-subida`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio de media rechazó la solicitud (HTTP ${res.status}).` };
    const d = (await res.json()) as { ref: string; urlSubida: string };
    return { ok: true, ref: d.ref, urlSubida: d.urlSubida };
  } catch {
    return { ok: false, error: 'No se pudo contactar el servicio de media (apps/api).' };
  }
}

/** Persiste la ref de la foto de perfil (avatar) ya subida al storage. */
export async function guardarAvatar(ref: string): Promise<ResultadoPerfil> {
  return guardarRefImagen('avatar_url', ref);
}

/** Persiste la ref de la portada ya subida al storage. */
export async function guardarPortada(ref: string): Promise<ResultadoPerfil> {
  return guardarRefImagen('portada_url', ref);
}

async function guardarRefImagen(columna: 'avatar_url' | 'portada_url', ref: string): Promise<ResultadoPerfil> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: EN_PAUSA };
  // Solo aceptamos refs del uploader de imágenes (evita inyectar URLs arbitrarias).
  if (!ref.startsWith('media/imagenes/')) return { ok: false, error: 'Referencia de imagen no válida.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      // `columna` es un literal cerrado (no viene del cliente) → seguro interpolarla.
      await sql`
        update lxp.perfiles
        set ${sql(columna)} = ${ref}
        where user_id = ${alumno.userId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar la imagen.' };
  }
  revalidatePath('/perfil');
  return { ok: true };
}

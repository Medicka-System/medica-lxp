'use server';

import { revalidatePath } from 'next/cache';
import { getSesionStaff } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';
import { ALCANCE_POR_ROL, type TipoAlcance, type Canal, type Prioridad } from './contrato';

/**
 * Server action: crear un anuncio (comunicación oficial · §6). Escritura REAL a
 * `lxp.anuncios` bajo RLS (`comoStaff`): la policy `anuncios_write` exige
 * `es_docente_o_mas()`, que admin y súper admin cumplen (§10). El rol acota el
 * alcance que puede segmentar (§5B). In-app siempre va; la caducidad es obligatoria
 * (al vencer, el anuncio sale solo del home). CRUD simple = web→Supabase (Regla de Oro §2).
 */
export type EstadoForm = { ok: boolean; error?: string };

const PRIORIDADES: Prioridad[] = ['normal', 'importante', 'urgente'];

export async function crearAnuncio(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const staff = await getSesionStaff();
  if (staff.rol !== 'admin' && staff.rol !== 'super_admin') {
    return { ok: false, error: 'No tiene permiso para publicar anuncios.' };
  }

  const titulo = String(formData.get('titulo') ?? '').trim();
  const cuerpo = String(formData.get('cuerpo') ?? '').trim();
  const alcanceTipo = String(formData.get('alcance') ?? 'comunidad') as TipoAlcance;
  const prioridad = String(formData.get('prioridad') ?? 'normal') as Prioridad;
  const vigenteHasta = String(formData.get('vigenteHasta') ?? '').trim();
  const canalesRaw = String(formData.get('canales') ?? 'in_app');

  if (titulo.length < 3 || titulo.length > 90) {
    return { ok: false, error: 'El título debe tener entre 3 y 90 caracteres.' };
  }
  if (cuerpo.length < 3) return { ok: false, error: 'Escriba el cuerpo del anuncio.' };

  const permitidos = ALCANCE_POR_ROL[staff.rol];
  if (!permitidos.includes(alcanceTipo)) {
    return { ok: false, error: 'Ese alcance no está permitido para su rol.' };
  }
  if (!PRIORIDADES.includes(prioridad)) return { ok: false, error: 'Prioridad inválida.' };

  if (!vigenteHasta) return { ok: false, error: 'La caducidad es obligatoria.' };
  const hasta = new Date(`${vigenteHasta}T23:59:59`);
  if (Number.isNaN(hasta.getTime()) || hasta.getTime() <= Date.now()) {
    return { ok: false, error: 'La fecha de caducidad debe ser futura.' };
  }

  // In-app siempre va; correo/whatsapp los elige quien publica.
  const elegidos = new Set(canalesRaw.split(',').map((c) => c.trim()));
  const canales: Canal[] = ['in_app'];
  if (elegidos.has('correo')) canales.push('correo');
  if (elegidos.has('whatsapp')) canales.push('whatsapp');

  const alcance = { tipo: alcanceTipo, prioridad };

  let anuncioId: string;
  let destinatarios: string[];
  try {
    ({ anuncioId, destinatarios } = await comoStaff(staff.userId, async (sql) => {
      const filas = await sql<{ id: string }[]>`
        insert into lxp.anuncios (autor_id, titulo, cuerpo, alcance, canales, vigente_desde, vigente_hasta)
        values (${staff.userId}, ${titulo}, ${cuerpo}, ${sql.json(alcance)}, ${canales}, now(), ${hasta})
        returning id`;
      // Audiencia por alcance (LXP real, bajo RLS): comunidad = todos; alumnos/staff por rol.
      const audiencia = await sql<{ user_id: string }[]>`
        select user_id from lxp.perfiles
        where ${
          alcanceTipo === 'alumnos'
            ? sql`rol = 'alumno'`
            : alcanceTipo === 'staff'
              ? sql`rol <> 'alumno'`
              : sql`true`
        }`;
      return { anuncioId: filas[0]!.id, destinatarios: audiencia.map((r) => r.user_id) };
    }));
  } catch {
    return { ok: false, error: 'No se pudo publicar el anuncio. Intente de nuevo.' };
  }

  // Canal (fan-out): el in-app es real (lxp.notificaciones vía worker); correo/WhatsApp
  // salen por adaptador mock/stub (entrega diferida honesta · §9). BEST-EFFORT: el anuncio
  // YA quedó creado; si el api/worker/Redis no responden, se loggea y no se rompe (§2).
  await encolarAnuncio({ userIds: destinatarios, titulo, cuerpo, entidadId: anuncioId });

  revalidatePath('/admin/anuncios');
  return { ok: true };
}

/**
 * Encola el fan-out del anuncio al motor de notificaciones (`POST /notificaciones/anuncio`,
 * §8 job #12). BEST-EFFORT: nunca lanza — la publicación no depende de que el api esté arriba.
 */
async function encolarAnuncio(payload: {
  userIds: string[];
  titulo: string;
  cuerpo: string;
  entidadId: string;
}): Promise<void> {
  if (payload.userIds.length === 0) return;
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/notificaciones/anuncio`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[anuncios] api respondió ${res.status} al encolar el fan-out.`);
    }
  } catch (e) {
    console.warn('[anuncios] no se pudo encolar el fan-out (¿api arriba?):', (e as Error).message);
  }
}

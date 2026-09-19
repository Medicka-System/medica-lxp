'use server';

import { revalidatePath } from 'next/cache';
import { requireAutoria } from '@/lib/studio/session';
import { comoStaff } from '@/lib/db.server';

/**
 * Server actions del bloque de TEORÍA (§5B). CRUD simple `web → Supabase` bajo RLS
 * (Regla de Oro §2): guardan el cuerpo HTML y el título del `lxp.contenidos`. El
 * candado real es la policy `contenidos` (`lxp.es_autoria()`), igual que en prod.
 *
 * PENDIENTE DE API (dominio · §2, §7A) — NARRACIÓN TTS:
 * La generación de audio a partir del cuerpo NO vive aquí (es un job de fondo con
 * integración de voz). Contrato propuesto para `apps/api` / worker:
 *   POST /contenidos/:id/narracion            → encola la síntesis del cuerpo actual
 *   worker `narrar-teoria`: cuerpo(HTML→texto) → TTS → audio en object storage →
 *     registra la pista (url, duración, voz, hash del cuerpo) ligada al contenido.
 *   GET  /contenidos/:id/narracion            → estado + url del audio vigente
 * El editor solo deja el gancho (botón deshabilitado + nota); no sintetiza voz.
 */

/** Guarda el cuerpo HTML de la teoría. `programaId` (opcional) refresca el builder. */
export async function guardarTeoriaCuerpo(
  contenidoId: string,
  cuerpo: string,
  programaId?: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.contenidos set cuerpo = ${cuerpo || null} where id = ${contenidoId}`;
  });
  revalidatePath(`/studio/teoria/${contenidoId}`);
  if (programaId) revalidatePath(`/studio/programas/${programaId}`);
}

/** Renombra el bloque de teoría (título del contenido). */
export async function renombrarTeoria(
  contenidoId: string,
  titulo: string,
  programaId?: string,
): Promise<void> {
  const { userId } = await requireAutoria();
  const limpio = titulo.trim();
  if (!limpio) return;
  await comoStaff(userId, async (sql) => {
    await sql`update lxp.contenidos set titulo = ${limpio} where id = ${contenidoId}`;
  });
  revalidatePath(`/studio/teoria/${contenidoId}`);
  if (programaId) revalidatePath(`/studio/programas/${programaId}`);
}

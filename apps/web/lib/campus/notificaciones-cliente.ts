import 'server-only';
import type { NotificacionJob } from '@campus/shared';

/**
 * Dispara un evento de notificación hacia el `api` (motor §8 job #12) desde un flujo
 * web-originado (ej. una consulta 1:1 nueva). No es proxy de CRUD (§2): el CRUD ya fue
 * directo a Supabase; esto solo encola el side-effect de fondo.
 *
 * BEST-EFFORT: si el `api` no está arriba (dev sin worker/api), no rompe la acción del
 * usuario — se loggea y sigue. La notificación in-app es "nice to have" aquí; el dato
 * (la consulta/mensaje) ya quedó persistido bajo RLS.
 */
export async function encolarNotificacion(job: NotificacionJob): Promise<void> {
  const base = process.env.API_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/notificaciones/evento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(job),
    });
    if (!res.ok) {
      console.warn(
        `[notificaciones] api respondió ${res.status} al encolar "${job.tipo}".`,
      );
    }
  } catch (e) {
    console.warn(
      `[notificaciones] no se pudo encolar "${job.tipo}" (¿api arriba?):`,
      (e as Error).message,
    );
  }
}

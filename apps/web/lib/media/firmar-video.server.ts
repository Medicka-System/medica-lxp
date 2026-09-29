import 'server-only';

/**
 * Firma la LECTURA (vida corta) de un VIDEO de la videoteca para PREVIEW server-side (§5B).
 * Puente al dominio (§2): la firma la hace el `api` (POST /media/videos/:id/reproducir, único
 * firmante S3); aquí solo se consume. Server-only.
 *
 * Devuelve null si el video no existe o no está `listo` (el `api` responde 404/409) → el
 * detalle cae con dignidad a su marco con ícono.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Firma la reproducción de un video por su `videotecaId` (null si no está disponible). */
export async function firmarReproduccionVideo(videotecaId: string | null | undefined): Promise<string | null> {
  if (!videotecaId) return null;
  try {
    const res = await fetch(`${apiBase()}/media/videos/${encodeURIComponent(videotecaId)}/reproducir`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { urlReproduccion?: string };
    return d.urlReproduccion ?? null;
  } catch (e) {
    console.error('[firmarReproduccionVideo] fallo:', e);
    return null;
  }
}

'use server';

import { requireAutoria } from '@/lib/studio/session';

/**
 * Puente del Studio hacia el DOMINIO de media/paquetes (§2/§3/§7 · Sprint 6/course
 * builder). NO es proxy de CRUD (§2): firmar la subida/lectura de video a object
 * storage y descomprimir+validar un paquete SCORM/xAPI es orquestación que YA vive en
 * `apps/api` (`media`, `paquetes`). El binario NUNCA pasa por el `api` ni por el web:
 *
 *   1) solicitar   POST /media/videos/solicitar          → { videotecaId, recursoRef, urlSubida }
 *   2) el CLIENTE  PUT  urlSubida (browser → object storage)     — binario directo, no aquí
 *   3) confirmar   POST /media/videos/:id/confirmar       → { videotecaId, estado }
 *   4) reproducir  POST /media/videos/:id/reproducir      → { urlReproduccion }  (firma corta)
 *
 *   Paquete xAPI/SCORM  POST /paquetes (multipart `archivo`)  → { contenidoId, tipo, titulo, entryPoint }
 *
 * La CONFIG de la lección (video listo, hitos, transcripción, contenidoId del paquete)
 * se guarda por CRUD directo `web → Supabase` en `guardarConfigLeccion` (acciones.ts).
 */

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

export type SolicitudVideo = { videotecaId: string; recursoRef: string; urlSubida: string };

export type ResultadoVideo<T> = { ok: true; datos: T } | { ok: false; error: string };

/** Firma la subida de un video y pre-registra su fila en la videoteca (paso 1). */
export async function solicitarSubidaVideo(input: {
  leccionId: string;
  titulo: string;
}): Promise<ResultadoVideo<SolicitudVideo>> {
  const { userId } = await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/videos/solicitar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titulo: input.titulo,
        leccionId: input.leccionId,
        creadoPor: userId,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `El servicio de media rechazó la solicitud (HTTP ${res.status}).` };
    }
    return { ok: true, datos: (await res.json()) as SolicitudVideo };
  } catch (e) {
    console.error('[solicitarSubidaVideo] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de media (apps/api). ¿Está levantada la API?' };
  }
}

/** Confirma que el binario ya está en storage y marca el video `listo` (paso 3). */
export async function confirmarVideo(
  videotecaId: string,
  duracionSeg?: number,
): Promise<ResultadoVideo<{ videotecaId: string; estado: string }>> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/videos/${encodeURIComponent(videotecaId)}/confirmar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        typeof duracionSeg === 'number' && Number.isFinite(duracionSeg)
          ? { duracionSeg: Math.round(duracionSeg) }
          : {},
      ),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo confirmar el video (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as { videotecaId: string; estado: string } };
  } catch (e) {
    console.error('[confirmarVideo] fallo:', e);
    return { ok: false, error: 'No se pudo confirmar la subida del video (apps/api).' };
  }
}

/** Firma una URL de LECTURA de vida corta para reproducir/previsualizar el video (paso 4). */
export async function urlReproduccionVideo(
  videotecaId: string,
): Promise<ResultadoVideo<{ urlReproduccion: string }>> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/videos/${encodeURIComponent(videotecaId)}/reproducir`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar la reproducción (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as { urlReproduccion: string } };
  } catch (e) {
    console.error('[urlReproduccionVideo] fallo:', e);
    return { ok: false, error: 'No se pudo obtener la URL del video (apps/api).' };
  }
}

/* ─────────────────────────── Imágenes de contenido (§5C) ─────────────────────────── */

export type SubidaImagen = { id: string; ext: string; ref: string; urlSubida: string; urlLectura: string };

/**
 * Firma la subida DIRECTA de una imagen de bloque a object storage (el navegador la sube
 * tal cual). Es CONTENIDO educativo (diagramas/ilustraciones) → NO pasa por el redactor
 * Presidio; la anonimización (§10) vive solo en los flujos de paciente
 * (bitácora/biblioteca/reportes). Devuelve la ref final + su URL de lectura.
 */
export async function firmarSubidaImagenContenido(ext: string): Promise<ResultadoVideo<SubidaImagen>> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-subida`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio de imágenes rechazó la solicitud (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as SubidaImagen };
  } catch (e) {
    console.error('[firmarSubidaImagenContenido] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de imágenes (apps/api).' };
  }
}

/** Firma la lectura de imágenes de contenido (preview del Studio). */
export async function firmarLecturaImagenContenido(
  refs: string[],
): Promise<ResultadoVideo<{ urls: Record<string, string> }>> {
  await requireAutoria();
  try {
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `No se pudo firmar la lectura (HTTP ${res.status}).` };
    return { ok: true, datos: (await res.json()) as { urls: Record<string, string> } };
  } catch (e) {
    console.error('[firmarLecturaImagenContenido] fallo:', e);
    return { ok: false, error: 'No se pudo firmar la lectura de imágenes (apps/api).' };
  }
}

export type IngestaPaquete = {
  contenidoId: string;
  tipo: string;
  titulo: string;
  entryPoint: string | null;
};

/**
 * Sube un paquete SCORM/xAPI (.zip) al dominio para su ingesta (descompresión con
 * adm-zip + validación del manifiesto con fast-xml-parser · §7). El `FormData` viaja
 * del navegador → server action → `api` (el web nunca guarda el binario). `archivo` y
 * `leccionId` son obligatorios; `titulo` opcional (si no, se toma del manifiesto).
 */
export async function ingestarPaquete(
  formData: FormData,
): Promise<ResultadoVideo<IngestaPaquete>> {
  await requireAutoria();
  const archivo = formData.get('archivo');
  const leccionId = formData.get('leccionId');
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: 'Falta el archivo .zip del paquete.' };
  }
  if (typeof leccionId !== 'string' || !leccionId) {
    return { ok: false, error: 'Falta la lección destino del paquete.' };
  }
  try {
    const res = await fetch(`${apiBase()}/paquetes`, {
      method: 'POST',
      body: formData,
      cache: 'no-store',
    });
    if (!res.ok) {
      // El `api` devuelve 400 con el motivo (zip inválido / manifiesto ausente).
      const detalle = await res.text().catch(() => '');
      return {
        ok: false,
        error:
          res.status === 400
            ? 'El paquete no es un .zip SCORM/xAPI válido (revisa el manifiesto).'
            : `La ingesta del paquete falló (HTTP ${res.status}). ${detalle.slice(0, 160)}`,
      };
    }
    return { ok: true, datos: (await res.json()) as IngestaPaquete };
  } catch (e) {
    console.error('[ingestarPaquete] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el dominio de paquetes (apps/api). ¿Está levantada la API?' };
  }
}

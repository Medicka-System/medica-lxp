import 'server-only';

/**
 * Firma la LECTURA (vida corta) de imágenes de CONTENIDO (`media/imagenes/*`) del course
 * builder — portadas de grupo, imágenes de bloque, etc. Puente al dominio (§2): la firma
 * la hace el `api` (único firmante S3); aquí solo se consume. Server-only: lo usan las
 * lecturas de servidor (Studio y campus) para resolver una URL mostrable por ref.
 *
 * Es contenido educativo (sin PII); no pasa por Presidio (§10 solo aplica a paciente).
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Firma varias refs de una vez. Devuelve `{ ref → url }` (vacío si falla, no lanza). */
export async function firmarLecturaImagenes(refs: (string | null | undefined)[]): Promise<Record<string, string>> {
  const propios = [...new Set(refs)].filter(
    (r): r is string => typeof r === 'string' && r.startsWith('media/imagenes/'),
  );
  if (propios.length === 0) return {};
  try {
    // Sin `cache:'no-store'`: con firma ESTABLE (ventana) las URLs ya no cambian por render,
    // así que no hace falta forzar no-store aquí. El cacheo REAL que importa es el del
    // navegador sobre el `<img>` (URL estable + Cache-Control de la imagen · Fase 1 entrega).
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: propios }),
    });
    if (!res.ok) return {};
    const d = (await res.json()) as { urls?: Record<string, string> };
    return d.urls ?? {};
  } catch (e) {
    console.error('[firmarLecturaImagenes] fallo:', e);
    return {};
  }
}

/** Azúcar para una sola ref (null si no hay o no se pudo firmar). */
export async function firmarLecturaImagen(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  const urls = await firmarLecturaImagenes([ref]);
  return urls[ref] ?? null;
}

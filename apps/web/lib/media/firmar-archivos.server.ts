import 'server-only';

/**
 * Firma la LECTURA (vida corta) de DOCUMENTOS de contenido (`media/archivos/*` — PDF/Word/
 * PowerPoint de la Biblioteca · §5C). Puente al dominio (§2): la firma la hace el `api`
 * (único firmante S3); aquí solo se consume. Server-only: lo usan las lecturas de servidor
 * (Studio) para resolver una URL mostrable/descargable por ref.
 *
 * Es contenido educativo (sin PII); no pasa por Presidio (§10 solo aplica a paciente).
 * Mismo patrón que `firmar-imagenes.server.ts`.
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/** Firma varias refs de una vez. Devuelve `{ ref → url }` (vacío si falla, no lanza). */
export async function firmarLecturaArchivos(
  refs: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const propios = [...new Set(refs)].filter(
    (r): r is string => typeof r === 'string' && r.startsWith('media/archivos/'),
  );
  if (propios.length === 0) return {};
  try {
    const res = await fetch(`${apiBase()}/media/archivos/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: propios }),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const d = (await res.json()) as { urls?: Record<string, string> };
    return d.urls ?? {};
  } catch (e) {
    console.error('[firmarLecturaArchivos] fallo:', e);
    return {};
  }
}

/** Azúcar para una sola ref (null si no hay o no se pudo firmar). */
export async function firmarLecturaArchivo(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  const urls = await firmarLecturaArchivos([ref]);
  return urls[ref] ?? null;
}

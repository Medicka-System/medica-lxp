import 'server-only';
import { clavesDerivados, type TipoDerivado } from '@campus/shared';

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

/**
 * Firma varias refs de una vez. Devuelve `{ ref → url }` (vacío si falla, no lanza).
 * `usuarioId` (opcional): el `sub` de la sesión ya verificada por el BFF → se reenvía en
 * `X-Usuario-Id` para que el rate-limit del `api` cuente POR USUARIO, no por la IP interna del
 * web (si no se pasa, el api cae a IP). La firma va al bucket de firma (no al de escrituras).
 */
export async function firmarLecturaImagenes(
  refs: (string | null | undefined)[],
  usuarioId?: string,
): Promise<Record<string, string>> {
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
      headers: { 'content-type': 'application/json', ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}) },
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
export async function firmarLecturaImagen(ref: string | null | undefined, usuarioId?: string): Promise<string | null> {
  if (!ref) return null;
  const urls = await firmarLecturaImagenes([ref], usuarioId);
  return urls[ref] ?? null;
}

/** Imagen con derivados responsivos: URL del original + `srcset` de los webp por ancho. */
export type ImagenDerivada = { url: string; srcset: { w: number; url: string }[] };

/**
 * Firma, EN UN SOLO lote, el original + sus derivados (`media/imagenes/{id}/{w}.webp`) para
 * un TIPO (avatar/portada/contenido) y devuelve `ref → { url, srcset }`. Las URLs son estables
 * (Fase 1, cacheables). `srcset` solo trae los derivados cuya URL se firmó; el consumidor cae
 * al `url` (original) por `onError` si un webp falta (viejos/sin backfill). No lanza.
 */
export async function firmarDerivados(
  refs: (string | null | undefined)[],
  tipo: TipoDerivado,
  usuarioId?: string,
): Promise<Record<string, ImagenDerivada>> {
  const originales = [...new Set(refs)].filter((r): r is string => typeof r === 'string' && !!r);
  if (originales.length === 0) return {};
  const derivKeys = originales.flatMap((ref) => clavesDerivados(ref, tipo).map((d) => d.ref));
  const urls = await firmarLecturaImagenes([...originales, ...derivKeys], usuarioId);
  const out: Record<string, ImagenDerivada> = {};
  for (const ref of originales) {
    const url = urls[ref];
    if (!url) continue; // sin original firmable → no se muestra
    const srcset = clavesDerivados(ref, tipo)
      .map((d) => ({ w: d.ancho, url: urls[d.ref] }))
      .filter((x): x is { w: number; url: string } => !!x.url);
    out[ref] = { url, srcset };
  }
  return out;
}

/** Azúcar para una sola ref con derivados (null si no hay/no se pudo firmar el original). */
export async function firmarDerivado(
  ref: string | null | undefined,
  tipo: TipoDerivado,
  usuarioId?: string,
): Promise<ImagenDerivada | null> {
  if (!ref) return null;
  const m = await firmarDerivados([ref], tipo, usuarioId);
  return m[ref] ?? null;
}

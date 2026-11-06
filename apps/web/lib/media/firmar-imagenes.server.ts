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
 * Host de Supabase del PROYECTO, derivado de la env que ya usa el resto del web
 * (`NEXT_PUBLIC_SUPABASE_URL`, con `SUPABASE_URL` de respaldo). Es el ÚNICO host externo del
 * que se acepta una portada como URL absoluta: ese campo lo escribe OTRO sistema (CORA sube la
 * portada a su bucket público de Supabase), y dejar pasar un `<img src>` arbitrario sería un
 * vector de rastreo. Sin env → `null` → ninguna URL absoluta pasa (comportamiento de hoy).
 */
function hostSupabasePermitido(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

/**
 * `true` si `ref` es una URL ABSOLUTA `https://` del host de Supabase permitido → pass-through
 * SIN firmar (el bucket público ya la sirve tal cual). `http://` queda FUERA a propósito: en una
 * página https la bloquea el navegador (mixed content) y no queremos tráfico sin cifrar. El match
 * es por `hostname` exacto (ignora userinfo/puerto → `https://x@evil.com` o sufijos no colan).
 */
function esUrlSupabasePublica(ref: string): boolean {
  if (!ref.startsWith('https://')) return false;
  const host = hostSupabasePermitido();
  if (!host) return false;
  try {
    return new URL(ref).hostname === host;
  } catch {
    return false;
  }
}

/**
 * Firma varias refs de una vez. Devuelve `{ ref → url }` (vacío si falla, no lanza).
 * `usuarioId` (opcional): el `sub` de la sesión ya verificada por el BFF → se reenvía en
 * `X-Usuario-Id` para que el rate-limit del `api` cuente POR USUARIO, no por la IP interna del
 * web (si no se pasa, el api cae a IP). La firma va al bucket de firma (no al de escrituras).
 *
 * Dos clases de ref conviven: las de object storage (`media/imagenes/*`) se FIRMAN contra el
 * `api`; las URLs absolutas del bucket público de Supabase (portada que escribe CORA) se siembran
 * en el mapa de salida con su propio valor (pass-through, sin firmar). Cualquier otra ref queda
 * fuera del mapa → el consumidor la resuelve a `null` → placeholder (igual que hoy).
 */
export async function firmarLecturaImagenes(
  refs: (string | null | undefined)[],
  usuarioId?: string,
): Promise<Record<string, string>> {
  const unicas = [...new Set(refs)].filter((r): r is string => typeof r === 'string');
  // Pass-through sin firmar de las URLs absolutas del host de Supabase permitido.
  const externas: Record<string, string> = {};
  for (const r of unicas) if (esUrlSupabasePublica(r)) externas[r] = r;

  const propios = unicas.filter((r) => r.startsWith('media/imagenes/'));
  if (propios.length === 0) return externas; // nada que firmar; sobreviven solo las externas
  try {
    // Sin `cache:'no-store'`: con firma ESTABLE (ventana) las URLs ya no cambian por render,
    // así que no hace falta forzar no-store aquí. El cacheo REAL que importa es el del
    // navegador sobre el `<img>` (URL estable + Cache-Control de la imagen · Fase 1 entrega).
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-lectura`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}) },
      body: JSON.stringify({ refs: propios }),
    });
    if (!res.ok) return externas;
    const d = (await res.json()) as { urls?: Record<string, string> };
    return { ...externas, ...(d.urls ?? {}) };
  } catch (e) {
    console.error('[firmarLecturaImagenes] fallo:', e);
    return externas;
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

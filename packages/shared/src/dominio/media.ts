/**
 * Derivados responsivos de imágenes de CONTENIDO (`media/imagenes/*` · Fase 2 entrega).
 *
 * El feed del Ateneo bajaba el ORIGINAL (1–2 MB) en cada post de imagen. Generamos variantes
 * webp en 3 anchos y el `<img>` usa `srcset` → el navegador baja ~decenas de KB. El original
 * se conserva intacto (zoom/detalle y fallback).
 *
 * Clave DETERMINISTA (sin columna): el original `media/imagenes/{id}.{ext}` deriva en
 * `media/imagenes/{id}/{ancho}.webp`. El feed, el `api` (firma) y el worker (genera) calculan
 * la misma clave con estos helpers — única fuente de verdad del contrato de nombres.
 *
 * Alcance: SOLO imágenes de contenido (las pesadas del feed). Avatares/portadas (chicas) y los
 * `.dcm` anonimizados del visor (`dicom/casos/*`, §10) NO entran aquí.
 */

/** Anchos de los derivados responsivos (px). Orden ascendente. */
export const ANCHOS_DERIVADO_IMAGEN = [640, 1080, 1600] as const;

/** Calidad webp de los derivados. */
export const CALIDAD_DERIVADO_IMAGEN = 75;

/** Extensiones de imagen RÁSTER derivables (gif animado y video quedan fuera). */
const EXT_IMAGEN_DERIVABLE = new Set(['jpg', 'jpeg', 'png', 'webp']);

/**
 * `true` si `ref` es una imagen de CONTENIDO derivable: `media/imagenes/{id}.{ext}` con
 * extensión ráster, UN solo segmento (excluye `media/imagenes/casos/.../thumb.jpg` y los
 * propios derivados `media/imagenes/{id}/{w}.webp`).
 */
export function esImagenContenidoDerivable(ref: string): boolean {
  if (typeof ref !== 'string' || !ref.startsWith('media/imagenes/')) return false;
  const resto = ref.slice('media/imagenes/'.length);
  if (resto.includes('/')) return false; // subpaths (casos/…, {id}/{w}.webp) fuera
  const m = /\.([a-z0-9]+)$/i.exec(resto);
  return !!m && EXT_IMAGEN_DERIVABLE.has(m[1]!.toLowerCase());
}

/** `id` (uuid sin extensión) de una imagen de contenido, o `null` si `ref` no es derivable. */
export function idDeImagenContenido(ref: string): string | null {
  if (!esImagenContenidoDerivable(ref)) return null;
  return ref.slice('media/imagenes/'.length).replace(/\.[^.]+$/, '');
}

/** Clave del derivado `{ancho}` de `ref`, o `null` si `ref` no es una imagen de contenido. */
export function claveDerivadoImagen(ref: string, ancho: number): string | null {
  const id = idDeImagenContenido(ref);
  return id ? `media/imagenes/${id}/${ancho}.webp` : null;
}

/** Las N claves de derivados de `ref` (vacío si no es imagen de contenido). */
export function clavesDerivadosImagen(ref: string): { ancho: number; ref: string }[] {
  const id = idDeImagenContenido(ref);
  if (!id) return [];
  return ANCHOS_DERIVADO_IMAGEN.map((ancho) => ({ ancho, ref: `media/imagenes/${id}/${ancho}.webp` }));
}

/**
 * Derivados responsivos de imágenes de `media/imagenes/*` (Fase 2 + avatares/portadas).
 *
 * El feed/listas bajaban el ORIGINAL (1–2 MB) por imagen. Generamos variantes webp y el `<img>`
 * usa `srcset` → el navegador baja ~decenas de KB (o ~KB para avatares). El original se conserva
 * (zoom/detalle y fallback).
 *
 * Clave DETERMINISTA (sin columna): el original `media/imagenes/{id}.{ext}` deriva en
 * `media/imagenes/{id}/{ancho}.webp`. El feed, el `api` (firma) y el worker (genera) calculan
 * la misma clave con estos helpers — única fuente de verdad del contrato de nombres.
 *
 * PERFIL DE ANCHOS POR TIPO: los avatares se muestran a ≤96 px (→ 48/96/192, 192 cubre 2×),
 * las portadas a ~600–1280 px (→ 640/1280), el contenido del feed a ancho de columna/detalle
 * (→ 640/1080/1600). El worker es genérico: genera los anchos que trae el job (el `api` elige
 * según el tipo). Los `.dcm` anonimizados del visor (`dicom/casos/*`, §10) NO entran (subpath).
 */

/** Tipo de derivado → su set de anchos. El `api` elige el set según el tipo del upload. */
export const ANCHOS_DERIVADO = {
  avatar: [48, 96, 192],
  portada: [640, 1280],
  contenido: [640, 1080, 1600],
} as const;

export type TipoDerivado = keyof typeof ANCHOS_DERIVADO;

/** Anchos del contenido del feed (compat · = ANCHOS_DERIVADO.contenido). */
export const ANCHOS_DERIVADO_IMAGEN = ANCHOS_DERIVADO.contenido;

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

/** Las claves de derivados de `ref` para un TIPO (vacío si `ref` no es derivable). */
export function clavesDerivados(ref: string, tipo: TipoDerivado): { ancho: number; ref: string }[] {
  const id = idDeImagenContenido(ref);
  if (!id) return [];
  return ANCHOS_DERIVADO[tipo].map((ancho) => ({ ancho, ref: `media/imagenes/${id}/${ancho}.webp` }));
}

/** Claves de derivados de CONTENIDO (compat feed · = clavesDerivados(ref, 'contenido')). */
export function clavesDerivadosImagen(ref: string): { ancho: number; ref: string }[] {
  return clavesDerivados(ref, 'contenido');
}

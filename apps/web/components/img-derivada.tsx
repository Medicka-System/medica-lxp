'use client';

import { useState } from 'react';

/**
 * `<img>` con derivados responsivos (webp por ancho · Fase 2 + avatares/portadas). Usa `srcset`
 * para que el navegador baje la variante del tamaño justo (decenas de KB o ~KB para avatares) en
 * vez del original (1–2 MB). Si un derivado falta (viejos/sin backfill) → `onError` desactiva el
 * `srcset` y recae en `url` (original). Un componente cliente mínimo, reusable por el Avatar
 * (shared y ateneo) y por las portadas.
 */
export function ImgDerivada({
  url,
  srcset,
  sizes,
  alt = '',
  className = '',
  loading = 'lazy',
}: {
  /** URL firmada del ORIGINAL (fallback). */
  url: string;
  /** Derivados firmados por ancho; vacío/ausente → solo original. */
  srcset?: { w: number; url: string }[];
  /** `sizes` del `<img>` (p. ej. `"96px"` para un avatar, o el ancho de columna). */
  sizes?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [sinDeriv, setSinDeriv] = useState(false);
  const ss = !sinDeriv && srcset && srcset.length ? srcset.map((s) => `${s.url} ${s.w}w`).join(', ') : undefined;
  return (
    <img
      src={url}
      srcSet={ss}
      sizes={ss ? sizes : undefined}
      onError={() => { if (ss) setSinDeriv(true); }}
      alt={alt}
      loading={loading}
      className={className}
    />
  );
}

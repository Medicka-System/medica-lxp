'use client';

/**
 * Imagen (primer frame) del estudio como PROTAGONISTA del card (§ mock validacion/alumno).
 * El thumb se genera UNA vez en el SERVIDOR al anonimizar (del frame YA redactado · §10) y se
 * sirve con URL firmada estable (familia B) — directo, cacheable, SIN Cornerstone en la card.
 * Si el caso no tiene thumb (viejos / cuarentena) → ícono placeholder; NO se rasteriza en
 * cliente. El visor interactivo completo del caso (al abrir) sigue en Cornerstone, aparte.
 */

import { ImageOff } from 'lucide-react';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export function MiniaturaEstudio({
  titulo,
  onAbrir,
  casoId,
  thumbUrl,
}: {
  casoId: string;
  titulo: string;
  onAbrir: (id: string) => void;
  /** Thumb ESTABLE (JPEG server-side, familia B); `null` → placeholder (sin raster-cliente). */
  thumbUrl?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(casoId)}
      aria-label={`Abrir ${titulo}`}
      className={`relative block w-full overflow-hidden bg-black p-0 ${focus}`}
      style={{ aspectRatio: '755 / 570' }}
    >
      {thumbUrl ? (
        <img src={thumbUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-white/30">
          <ImageOff className="h-7 w-7" strokeWidth={1.5} />
        </span>
      )}
    </button>
  );
}

'use client';

/**
 * Imagen (primer frame) del estudio como PROTAGONISTA del card (§ mock validacion/alumno).
 * No hay miniatura de servidor: se renderiza en CLIENTE desde el `.dcm` ANONIMIZADO — se pide
 * la URL firmada de la primera serie (`lecturaEstudioDicom`, patrón §2/§3: binario cliente→
 * storage, nunca por el web/api) y Cornerstone pinta el primer frame + su proporción nativa
 * (`renderMiniaturasDetalle`). La imagen va LIMPIA: el DICOM trae texto quemado del equipo
 * (preset, transductor, escala) que NO se tapa. Skeleton mientras carga; ícono si no hay imagen.
 */

import { ImageOff } from 'lucide-react';
import { useThumbEstudio } from '@/components/casos/use-thumb-estudio';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export function MiniaturaEstudio({
  casoId,
  titulo,
  onAbrir,
  thumbUrl,
}: {
  casoId: string;
  titulo: string;
  onAbrir: (id: string) => void;
  /** Thumb ESTABLE (JPEG server-side, familia B). Si viene, se usa directo y NO se rasteriza. */
  thumbUrl?: string | null;
}) {
  // Thumb ESTABLE (JPEG server-side) por defecto: directo, cacheable, sin Cornerstone. FALLBACK
  // (fase 1): si el caso no tiene thumb estable, se rasteriza en cliente (DICOM/JPG/PNG) vía el
  // hook compartido. El hook se llama SIEMPRE (reglas de hooks) pero solo queda `activo` sin
  // thumb estable. Proporción 755/570 (≈1.32:1) por defecto; el raster mide la real al cargar.
  const estado = useThumbEstudio(casoId, 'bitacora_casos', !thumbUrl, { ancho: 768, alto: 576 });
  const url = thumbUrl ?? (estado.fase === 'listo' ? estado.url : null);

  const aspecto = !thumbUrl && estado.fase === 'listo' ? `${estado.ancho} / ${estado.alto}` : '755 / 570';

  return (
    <button
      type="button"
      onClick={() => onAbrir(casoId)}
      aria-label={`Abrir ${titulo}`}
      className={`relative block w-full overflow-hidden bg-black p-0 ${focus}`}
      style={{ aspectRatio: aspecto }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : estado.fase === 'cargando' ? (
        <span aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.06] to-white/[0.02]" />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-white/30">
          <ImageOff className="h-7 w-7" strokeWidth={1.5} />
        </span>
      )}
    </button>
  );
}

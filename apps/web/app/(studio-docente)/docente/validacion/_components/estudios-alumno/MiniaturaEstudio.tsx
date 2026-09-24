'use client';

/**
 * Imagen (primer frame) del estudio como PROTAGONISTA del card (§ mock validacion/alumno).
 * No hay miniatura de servidor: se renderiza en CLIENTE desde el `.dcm` ANONIMIZADO — se pide
 * la URL firmada de la primera serie (`lecturaEstudioDicom`, patrón §2/§3: binario cliente→
 * storage, nunca por el web/api) y Cornerstone pinta el primer frame + su proporción nativa
 * (`renderMiniaturasDetalle`). La imagen va LIMPIA: el DICOM trae texto quemado del equipo
 * (preset, transductor, escala) que NO se tapa. Skeleton mientras carga; ícono si no hay imagen.
 */

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { lecturaEstudioDicom } from '@/lib/dicom/acciones';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; url: string; ancho: number; alto: number }
  | { fase: 'vacio' };

export function MiniaturaEstudio({
  casoId,
  titulo,
  onAbrir,
}: {
  casoId: string;
  titulo: string;
  onAbrir: (id: string) => void;
}) {
  // Proporción por defecto (4/3) mientras se mide la real, para no saltar el layout.
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vivo = true;
    setEstado({ fase: 'cargando' });
    (async () => {
      try {
        const r = await lecturaEstudioDicom(casoId, 'bitacora_casos');
        if (!vivo) return;
        const serie = r.ok ? r.datos.series[0] : null;
        if (!serie) {
          setEstado({ fase: 'vacio' });
          return;
        }
        // El primer frame de la primera serie: DICOM (wadouri) o imagen web (web:).
        const esImagen = serie.tipo === 'imagen';
        const { imageIdWeb } = await import('@/components/dicom/engine/web-image-loader');
        const imageId = esImagen ? imageIdWeb(serie.urlLectura) : `wadouri:${serie.urlLectura}`;
        const { renderMiniaturasDetalle } = await import('@/components/dicom/engine/motor-cornerstone');
        const [mini] = await renderMiniaturasDetalle([imageId]);
        if (!vivo) return;
        setEstado(mini ? { fase: 'listo', url: mini.url, ancho: mini.ancho, alto: mini.alto } : { fase: 'vacio' });
      } catch {
        if (vivo) setEstado({ fase: 'vacio' });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [casoId]);

  const aspecto = estado.fase === 'listo' ? `${estado.ancho} / ${estado.alto}` : '4 / 3';

  return (
    <button
      type="button"
      onClick={() => onAbrir(casoId)}
      aria-label={`Abrir ${titulo}`}
      className={`relative block w-full overflow-hidden bg-black p-0 ${focus}`}
      style={{ aspectRatio: aspecto }}
    >
      {estado.fase === 'listo' ? (
        <img src={estado.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
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

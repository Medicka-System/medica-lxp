'use client';

/**
 * `useThumbEstudio` — miniatura (primer frame) de un estudio, renderizada en CLIENTE, para
 * casos DICOM **y** de imagen (JPG/PNG). Extrae el approach que ya usa la consola de
 * validación del docente (`MiniaturaEstudio`): pide la URL firmada de la primera serie
 * (`lecturaEstudioDicom`, binario cliente→storage · §2/§3) y deja que Cornerstone pinte el
 * primer frame a un PNG (`renderMiniaturasDetalle`) — sirve tanto `.dcm` (wadouri) como
 * imagen web (web:). Mismo pipeline, sin inventar uno nuevo; hereda sus fixes (bitmap
 * compartido / carrera decode). El caller decide el layout (aspect-ratio o alto fijo).
 */

import { useEffect, useState } from 'react';
import type { TablaEstudioDicom } from '@campus/shared';
import { lecturaEstudioDicom } from '@/lib/dicom/acciones';

export type ThumbEstudioEstado =
  | { fase: 'cargando' }
  | { fase: 'listo'; url: string; ancho: number; alto: number }
  | { fase: 'vacio' };

/**
 * Rasteriza la PRIMERA serie de un estudio a un PNG (póster). Sirve DICOM (`wadouri:`,
 * lo pinta Cornerstone) e imagen web (`web:`). Extraído para reusarse con series YA firmadas
 * por otra vía de autorización (p. ej. el caso presentado del Ateneo, firmado por visibilidad
 * del post · §10) sin depender de `casoId`. `serie=null` → `vacio`.
 */
export async function rasterizarPrimeraSerie(
  serie: { urlLectura: string; tipo?: 'dicom' | 'imagen' } | null,
  tamano?: { ancho: number; alto: number },
): Promise<ThumbEstudioEstado> {
  if (!serie) return { fase: 'vacio' };
  const esImagen = serie.tipo === 'imagen';
  const { imageIdWeb } = await import('@/components/dicom/engine/web-image-loader');
  const imageId = esImagen ? imageIdWeb(serie.urlLectura) : `wadouri:${serie.urlLectura}`;
  const { renderMiniaturasDetalle } = await import('@/components/dicom/engine/motor-cornerstone');
  const [mini] = await renderMiniaturasDetalle([imageId], tamano ? { ancho: tamano.ancho, alto: tamano.alto } : {});
  return mini ? { fase: 'listo', url: mini.url, ancho: mini.ancho, alto: mini.alto } : { fase: 'vacio' };
}

/**
 * Renderiza la miniatura del primer frame del estudio del caso. `activo=false` (p. ej. el
 * estudio aún no está anonimizado o no tiene series) deja el estado en `vacio` sin pedir nada.
 * `tamano` fija la RESOLUCIÓN del raster (canvas offscreen): omítelo para el tamaño mini
 * (tira de series / validación); pásalo ≥ contenedor (2× retina) donde la miniatura se ve grande.
 */
export function useThumbEstudio(
  casoId: string,
  tabla: TablaEstudioDicom,
  activo = true,
  tamano?: { ancho: number; alto: number },
): ThumbEstudioEstado {
  const anchoRaster = tamano?.ancho;
  const altoRaster = tamano?.alto;
  const [estado, setEstado] = useState<ThumbEstudioEstado>(
    activo ? { fase: 'cargando' } : { fase: 'vacio' },
  );

  useEffect(() => {
    if (!activo) {
      setEstado({ fase: 'vacio' });
      return;
    }
    let vivo = true;
    setEstado({ fase: 'cargando' });
    (async () => {
      try {
        const r = await lecturaEstudioDicom(casoId, tabla);
        if (!vivo) return;
        const serie = r.ok ? r.datos.series[0] ?? null : null;
        const res = await rasterizarPrimeraSerie(
          serie,
          anchoRaster && altoRaster ? { ancho: anchoRaster, alto: altoRaster } : undefined,
        );
        if (vivo) setEstado(res);
      } catch {
        if (vivo) setEstado({ fase: 'vacio' });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [casoId, tabla, activo, anchoRaster, altoRaster]);

  return estado;
}

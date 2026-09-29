"use client";

/**
 * `EstudioCaso` — el gancho visual `<Estudio>` de un caso presentado, con el PÓSTER real:
 * el primer frame del estudio rasterizado en CLIENTE con el MISMO pipeline que la bitácora y
 * la consola de validación (`useThumbEstudio` → `renderMiniaturasDetalle`). Sirve DICOM
 * (wadouri) e imagen web (web:). Mientras carga (o si el estudio no es legible bajo RLS —
 * p. ej. el caso de un colega, misma frontera que el visor del detalle) cae al placeholder
 * `<Estudio>` sin póster. NO cambia el modelo del post: el caso sigue por REFERENCIA
 * (`caso_origen_id`), la miniatura se resuelve al vuelo por `casoId`.
 *
 * Raster 768×576 (2× retina, ≥ contenedor) igual que las tarjetas de Mi Bitácora.
 */

import { Estudio } from "./ui";
import { useThumbEstudio } from "@/components/casos/use-thumb-estudio";

export function EstudioCaso({
  casoId,
  piezas,
  ratio,
  etiqueta,
  badge,
  play = true,
  tamanoPlay,
}: {
  casoId: string;
  /** Nº de series/piezas del estudio; sin piezas no hay nada que rasterizar. */
  piezas: number;
  ratio?: string;
  etiqueta?: string;
  badge?: string;
  play?: boolean;
  tamanoPlay?: number;
}) {
  const thumb = useThumbEstudio(casoId, "bitacora_casos", piezas >= 1, { ancho: 768, alto: 576 });
  const poster = thumb.fase === "listo" ? thumb.url : undefined;
  return (
    <Estudio ratio={ratio} poster={poster} etiqueta={etiqueta} badge={badge} play={play} tamanoPlay={tamanoPlay} />
  );
}

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

import { useEffect, useState } from "react";
import { Estudio } from "./ui";
import {
  rasterizarPrimeraSerie,
  useThumbEstudio,
  type ThumbEstudioEstado,
} from "@/components/casos/use-thumb-estudio";
import { lecturaEstudioPostAteneo } from "@/lib/dicom/acciones";

const RASTER = { ancho: 768, alto: 576 } as const;

/**
 * Póster por POST id (audiencia del Ateneo · §10): pide las series firmadas con
 * `lecturaEstudioPostAteneo` (autorizado por la VISIBILIDAD del post, no por ser el dueño) y
 * rasteriza el primer frame con el MISMO pipeline que la bitácora. No recibe ni usa el id de
 * bitácora — el id privado se resuelve server-side. `activo=false` no pide nada.
 */
function useThumbEstudioPresentado(postId: string | undefined, activo: boolean): ThumbEstudioEstado {
  const [estado, setEstado] = useState<ThumbEstudioEstado>(
    activo && postId ? { fase: "cargando" } : { fase: "vacio" },
  );
  useEffect(() => {
    if (!activo || !postId) {
      setEstado({ fase: "vacio" });
      return;
    }
    let vivo = true;
    setEstado({ fase: "cargando" });
    void (async () => {
      try {
        const r = await lecturaEstudioPostAteneo(postId);
        if (!vivo) return;
        const serie = r.ok ? r.datos.series[0] ?? null : null;
        const res = await rasterizarPrimeraSerie(serie, RASTER);
        if (vivo) setEstado(res);
      } catch {
        if (vivo) setEstado({ fase: "vacio" });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [postId, activo]);
  return estado;
}

export function EstudioCaso({
  casoId,
  postId,
  piezas,
  ratio,
  etiqueta,
  badge,
  play = true,
  tamanoPlay,
}: {
  /** Dueño/composer: id de bitácora (RLS propia). Omitir en el feed (usa `postId`). */
  casoId?: string;
  /** Feed/audiencia: id del POST — resuelve el estudio por visibilidad del post, sin exponer el id del caso (§10). */
  postId?: string;
  /** Nº de series/piezas del estudio; sin piezas no hay nada que rasterizar. */
  piezas: number;
  ratio?: string;
  etiqueta?: string;
  badge?: string;
  play?: boolean;
  tamanoPlay?: number;
}) {
  const porPost = !!postId;
  // Ambos hooks se llaman SIEMPRE (reglas de hooks); solo uno queda `activo` según la fuente.
  const thumbCaso = useThumbEstudio(casoId ?? "", "bitacora_casos", !porPost && !!casoId && piezas >= 1, RASTER);
  const thumbPost = useThumbEstudioPresentado(postId, porPost && piezas >= 1);
  const thumb = porPost ? thumbPost : thumbCaso;
  const poster = thumb.fase === "listo" ? thumb.url : undefined;
  return (
    <Estudio ratio={ratio} poster={poster} etiqueta={etiqueta} badge={badge} play={play} tamanoPlay={tamanoPlay} />
  );
}

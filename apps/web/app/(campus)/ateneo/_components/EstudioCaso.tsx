"use client";

/**
 * `EstudioCaso` — el gancho visual `<Estudio>` de un caso presentado, con el PÓSTER real: el
 * thumb JPEG generado UNA vez en el SERVIDOR al anonimizar (del frame YA redactado · §10),
 * servido con URL firmada estable (familia B) y resuelto server-side (feed: vía
 * `caso_presentado`; composer: del caso propio) SIN exponer el id del caso. Si no hay thumb
 * (casos viejos / cuarentena) → placeholder `<Estudio>` sin póster; NO se rasteriza en cliente.
 * El visor interactivo completo del caso (al abrir: cine, mediciones, Cornerstone) va aparte.
 */

import { Estudio } from "./ui";

export function EstudioCaso({
  thumbUrl,
  ratio,
  etiqueta,
  badge,
  play = true,
  tamanoPlay,
}: {
  /** Thumb ESTABLE (JPEG server-side, familia B) resuelto server-side. `null`/ausente → placeholder. */
  thumbUrl?: string | null;
  ratio?: string;
  etiqueta?: string;
  badge?: string;
  play?: boolean;
  tamanoPlay?: number;
}) {
  return (
    <Estudio ratio={ratio} poster={thumbUrl ?? undefined} etiqueta={etiqueta} badge={badge} play={play} tamanoPlay={tamanoPlay} />
  );
}

/**
 * Breadcrumb de la lección para la barra (sub-header) — §5A. Muestra la ruta completa
 * "Diplomado / Módulo / Lección" separada por "/". Los ancestros van en tono atenuado y
 * la lección actual en negrita; en pantallas chicas se colapsa a solo la lección. Usa
 * tokens (text-muted-foreground / text-foreground), así HEREDA el tono del modo lectura
 * (sepia/oscuro) como el resto del sub-header.
 */

import { Fragment } from 'react';

export function MigasLeccion({ segmentos }: { segmentos: string[] }) {
  const utiles = segmentos.filter(Boolean);
  if (utiles.length === 0) return null;
  const ultimo = utiles.length - 1;

  return (
    <nav
      aria-label="Ruta de la lección"
      className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] leading-tight"
    >
      {utiles.map((s, i) =>
        i === ultimo ? (
          <span key={i} className="truncate font-bold text-foreground">
            {s}
          </span>
        ) : (
          <Fragment key={i}>
            <span className="hidden max-w-[240px] shrink truncate font-semibold text-muted-foreground md:inline">
              {s}
            </span>
            <span aria-hidden className="hidden shrink-0 text-muted-foreground/60 md:inline">
              /
            </span>
          </Fragment>
        ),
      )}
    </nav>
  );
}

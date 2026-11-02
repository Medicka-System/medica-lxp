'use client';

/**
 * Editor de la LECCIÓN tipo H5P (§5C · §7 · mig 0023). La lección ES un interactivo H5P
 * a pantalla completa (no un bloque dentro de teoría). El diseñador lo autora con las
 * herramientas de H5P dentro del Studio; el alumno lo consume (emite xAPI al LRS).
 *
 * Usa el MISMO editor de fuente que el bloque H5P de teoría (`EditorContenidoH5P`): autorar
 * / subir `.h5p` / enlace externo — antes esta lección era una UI pelada y divergía del
 * bloque. La CONFIG de la lección guarda el puntero al contenido:
 *   { contentId } | { url }   (== `lecciones.config`, contrato §5C)
 *
 * El servidor H5P se resuelve mismo-origen (`/h5p`, ver `base.ts` · P1): el rewrite de
 * Next reenvía al `api` interno.
 */

import { EditorContenidoH5P } from '@/components/bloques/h5p/editor-contenido-h5p';
import { H5P_BASE } from '@/components/bloques/h5p/base';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';

export function EditorH5P({ programaId, leccionId, titulo, config, correr }: EditorLeccionProps) {
  const contentId = typeof config.contentId === 'string' ? config.contentId : undefined;
  const url = typeof config.url === 'string' ? config.url : undefined;

  return (
    <EditorContenidoH5P
      config={{ contentId, url }}
      base={H5P_BASE}
      leccionId={leccionId}
      titulo={titulo}
      onCambio={(patch) => correr(() => guardarConfigLeccion(programaId, leccionId, { ...patch }))}
    />
  );
}

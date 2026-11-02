'use client';

/**
 * Editor de la LECCIÓN tipo H5P (§5C · §7 · mig 0023). La lección ES un interactivo H5P
 * a pantalla completa (no un bloque dentro de teoría). El diseñador lo autora con las
 * herramientas de H5P dentro del Studio; el alumno lo consume (emite xAPI al LRS).
 *
 * Reusa `BloqueH5P` (editor + player · `@lumieducation/h5p-react`), que se cablea contra
 * el H5P server self-host del DOMINIO (§2 · §7): `@lumieducation/h5p-server` en apps/api.
 * La CONFIG de la lección solo guarda el puntero al contenido:
 *   { contentId }   (== `lecciones.config`, contrato §5C)
 *
 * El servidor H5P se resuelve mismo-origen (`/h5p`, ver `base.ts` · P1): el rewrite de
 * Next reenvía al `api` interno.
 */

import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { H5P_BASE } from '@/components/bloques/h5p/base';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';

export function EditorH5P({ programaId, leccionId, titulo, config, correr }: EditorLeccionProps) {
  const contentId = typeof config.contentId === 'string' ? config.contentId : undefined;

  return (
    <BloqueH5P
      modo="editar"
      contentId={contentId}
      servidorBase={H5P_BASE}
      leccionId={leccionId}
      titulo={titulo}
      contexto="Interactivo H5P · se autora y previsualiza en el Studio"
      onGuardado={(id) =>
        correr(() => guardarConfigLeccion(programaId, leccionId, { contentId: id }))
      }
    />
  );
}

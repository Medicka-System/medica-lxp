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
 * El servidor H5P se resuelve del `api` público (`NEXT_PUBLIC_API_URL/h5p`); si no está
 * configurado, `BloqueH5P` muestra su estado "servidor pendiente" con dignidad.
 */

import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';

/**
 * Prefijo del H5P server (§7 · api). El editor/player de H5P corren en el navegador y
 * pegan directo al `api` (CORS habilitado · main.ts), por eso se usa la URL PÚBLICA.
 */
const H5P_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/h5p`
  : null;

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

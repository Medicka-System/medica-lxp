/**
 * Extensiones del EditorRico (TipTap v3 · §3). Fábrica única para que TODOS los
 * consumidores (teoría, foro, y lo que venga) compartan exactamente el mismo set
 * y la misma configuración — un solo lugar donde vive "de qué es capaz el editor".
 *
 * StarterKit v3 ya trae texto, encabezados, listas, cita, código, negrita/itálica,
 * subrayado y ENLACES. Aquí se suman: imágenes, tablas, embed de YouTube, resaltado,
 * contador y las FÓRMULAS KaTeX (inline + bloque, `@tiptap/extension-mathematics`).
 *
 * Sin dependencias fuera de la §3. El placeholder NO usa extensión extra: se pinta
 * en React cuando el editor está vacío (ver editor-rico.tsx).
 */
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Youtube } from '@tiptap/extension-youtube';
import { Highlight } from '@tiptap/extension-highlight';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Mathematics } from '@tiptap/extension-mathematics';

export type OpcionesExtensiones = {
  /** Límite duro de caracteres (opcional). El contador siempre se muestra. */
  limiteCaracteres?: number;
};

/** Construye el arreglo de extensiones compartido por todos los EditorRico. */
export function construirExtensiones({ limiteCaracteres }: OpcionesExtensiones = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Los enlaces se abren en pestaña nueva y no navegan al hacer clic en edición.
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      },
    }),
    Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'er-imagen' } }),
    TableKit.configure({
      table: { resizable: true, HTMLAttributes: { class: 'er-tabla' } },
    }),
    Youtube.configure({
      nocookie: true,
      controls: true,
      width: 640,
      height: 360,
      HTMLAttributes: { class: 'er-embed' },
    }),
    Highlight.configure({ multicolor: false }),
    // Fórmulas: `$x^2$` inline y `$$ … $$` en bloque. throwOnError:false → nunca
    // rompe la vista por LaTeX inválido; muestra el error en rojo y sigue editable.
    Mathematics.configure({ katexOptions: { throwOnError: false } }),
    CharacterCount.configure(limiteCaracteres ? { limit: limiteCaracteres } : {}),
  ];
}

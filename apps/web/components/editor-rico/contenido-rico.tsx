'use client';

/**
 * ContenidoRico — visor de solo lectura del HTML producido por el EditorRico.
 * Monta el mismo motor en modo `editable={false}`, de modo que tablas, embeds y
 * FÓRMULAS KaTeX se renderizan idénticas a como se escribieron, y el contenido
 * hereda el modo lectura (claro/sepia/oscuro) del contenedor (§5A).
 *
 * Úsalo para mostrar la teoría en la lección o el cuerpo de un post/comentario del
 * foro — cualquier lugar donde solo haya que LEER el contenido rico.
 */
import { EditorRico } from './editor-rico';

export function ContenidoRico({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return <EditorRico contenidoInicial={html} editable={false} minAlto={0} className={className} />;
}

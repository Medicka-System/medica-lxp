/**
 * EditorRico — editor de contenido rico reutilizable (TipTap · §3/§5B) y su visor
 * de solo lectura. Punto de entrada único para los bloques que lo consumen
 * (Teoría del course builder, Foro del alumno, y lo que venga).
 */
export { EditorRico } from './editor-rico';
export type { EditorRicoProps } from './editor-rico';
export { ContenidoRico } from './contenido-rico';
export { construirExtensiones } from './extensiones';
export { importarWord, EXT_WORD } from './importar-word';
export type { ResultadoImportacion } from './importar-word';

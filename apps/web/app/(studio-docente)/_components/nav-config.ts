/**
 * Secciones de la consola del DOCENTE (§5B). El docente opera y acompaña SUS grupos:
 * valida casos, revisa entregas, atiende consultas, sigue grupos, guarda recursos y
 * da clase. Navegación en el header (sin sidebar), como todo el Studio.
 *
 * Solo secciones YA construidas (evita enlaces a 404 · patrón del Studio del
 * diseñador). RECURSOS (biblioteca de contenido) y BIBLIOTECA (curación de casos)
 * REUSAN las vistas del Studio (/studio/contenido y /studio/casos) bajo rutas del
 * docente; ATENEO reusa la comunidad transversal del campus (el docente ya tiene perfil).
 */
export type SeccionDocente = {
  id: string;
  etiqueta: string;
  href: string;
  /** Marca la sección que lleva el badge de la cola que define su día. */
  cola?: 'casos';
  /** Sale del shell del docente (p.ej. Ateneo vive en el campus, transversal). */
  externa?: boolean;
};

export const SECCIONES: SeccionDocente[] = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/docente' },
  { id: 'validacion', etiqueta: 'Validación', href: '/docente/validacion', cola: 'casos' },
  { id: 'entregas', etiqueta: 'Entregas', href: '/docente/entregas' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/docente/grupos' },
  { id: 'consultas', etiqueta: 'Consultas', href: '/docente/consultas' },
  { id: 'biblioteca', etiqueta: 'Biblioteca', href: '/docente/biblioteca' },
  { id: 'recursos-biblioteca', etiqueta: 'Recursos', href: '/docente/recursos-biblioteca' },
  { id: 'ateneo', etiqueta: 'Ateneo', href: '/docente/ateneo' },
  { id: 'clases', etiqueta: 'Clases', href: '/docente/clases' },
];

/**
 * Secciones de la consola del DOCENTE (§5B). El docente opera y acompaña SUS grupos:
 * valida casos, revisa entregas, atiende consultas, sigue grupos, guarda recursos y
 * da clase. Navegación en el header (sin sidebar), como todo el Studio.
 *
 * Solo secciones YA construidas (evita enlaces a 404 · patrón del Studio del
 * diseñador). Biblioteca (curaduría clínica) y Ateneo del docente son piezas
 * posteriores; se agregan al existir sus rutas.
 */
export type SeccionDocente = {
  id: string;
  etiqueta: string;
  href: string;
  /** Marca la sección que lleva el badge de la cola que define su día. */
  cola?: 'casos';
};

export const SECCIONES: SeccionDocente[] = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/docente' },
  { id: 'validacion', etiqueta: 'Validación', href: '/docente/validacion', cola: 'casos' },
  { id: 'entregas', etiqueta: 'Entregas', href: '/docente/entregas' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/docente/grupos' },
  { id: 'consultas', etiqueta: 'Consultas', href: '/docente/consultas' },
  { id: 'recursos', etiqueta: 'Mis recursos', href: '/docente/recursos' },
  { id: 'clases', etiqueta: 'Clases', href: '/docente/clases' },
];

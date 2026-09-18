/**
 * Navegación de la consola de admin / súper admin (§5B). El Studio del staff no
 * tiene sidebar: la navegación vive en el header navy.
 *
 * RBAC por rol (§5B / §10): `admin` administra la EXPERIENCIA (grupos, alumnos,
 * staff, analítica); `super_admin` ve todo eso MÁS la **Configuración del sistema**
 * (candado). El reparto se aplica filtrando por `soloSuper`.
 *
 * Convención del repo: aquí SOLO se listan secciones ya construidas para no dejar
 * enlaces a 404. El resto se agrega conforme aterriza su ruta en las siguientes
 * piezas de este sprint (grupos/alumnos/staff/analítica/anuncios/configuración).
 */
export type SeccionAdmin = {
  id: string;
  etiqueta: string;
  href: string;
  soloSuper?: boolean;
};

export const SECCIONES: SeccionAdmin[] = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/admin' },
  { id: 'alumnos', etiqueta: 'Alumnos', href: '/admin/alumnos' },
  { id: 'staff', etiqueta: 'Staff', href: '/admin/staff' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/admin/grupos' },
  { id: 'programas', etiqueta: 'Programas', href: '/admin/programas' },
];

/** Secciones aún sin ruta (se muestran deshabilitadas para señalar el mapa y el RBAC). */
export type SeccionFutura = { id: string; etiqueta: string; soloSuper?: boolean };

export const SECCIONES_FUTURAS: SeccionFutura[] = [
  { id: 'analitica', etiqueta: 'Analítica' },
  { id: 'configuracion', etiqueta: 'Configuración', soloSuper: true },
];

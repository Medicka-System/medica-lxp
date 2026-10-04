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
  { id: 'inicio', etiqueta: 'Inicio', href: '/admin/panel' },
  { id: 'alumnos', etiqueta: 'Alumnos', href: '/admin/alumnos' },
  { id: 'staff', etiqueta: 'Staff', href: '/admin/staff' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/admin/grupos' },
  { id: 'programas', etiqueta: 'Programas', href: '/admin/programas' },
  { id: 'analitica', etiqueta: 'Analítica', href: '/admin/analitica' },
  { id: 'anuncios', etiqueta: 'Anuncios', href: '/admin/anuncios' },
  // Configuración del sistema (§5B): solo súper admin. Ruta construida en el course
  // builder (cb-config): hub + editor de eco_config + UI de TTS.
  { id: 'configuracion', etiqueta: 'Configuración', href: '/configuracion', soloSuper: true },
];

/** Secciones aún sin ruta (se muestran deshabilitadas para señalar el mapa y el RBAC). */
export type SeccionFutura = { id: string; etiqueta: string; soloSuper?: boolean };

export const SECCIONES_FUTURAS: SeccionFutura[] = [];

import { Calculator, LayoutTemplate, MonitorPlay, type LucideIcon } from 'lucide-react';

/** Secciones del Studio (§5B). Href = ruta real del área de autoría del diseñador. */
export type SeccionStudio = {
  id: string;
  etiqueta: string;
  href: string;
};

export const SECCIONES: SeccionStudio[] = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/studio' },
  { id: 'programas', etiqueta: 'Programas', href: '/programas' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/grupos' },
  { id: 'contenido', etiqueta: 'Contenido', href: '/contenido' },
  { id: 'casos', etiqueta: 'Casos', href: '/casos' },
  { id: 'ateneo', etiqueta: 'Ateneo', href: '/studio/ateneo' },
];

/** "Herramientas ▾" colapsa Plantillas · Calculadoras · Simuladores (§5B). */
export type HerramientaStudio = {
  id: string;
  etiqueta: string;
  nota: string;
  href: string;
  icono: LucideIcon;
};

export const HERRAMIENTAS: HerramientaStudio[] = [
  {
    id: 'plantillas',
    etiqueta: 'Plantillas',
    nota: 'Estructuras de reporte por estudio',
    href: '/herramientas/plantillas',
    icono: LayoutTemplate,
  },
  {
    id: 'calculadoras',
    etiqueta: 'Calculadoras',
    nota: 'Fórmulas publicadas al campus',
    href: '/herramientas/calculadoras',
    icono: Calculator,
  },
  {
    id: 'simuladores',
    etiqueta: 'Simuladores',
    nota: 'Escenarios de práctica con Eco',
    href: '/herramientas/simuladores',
    icono: MonitorPlay,
  },
];

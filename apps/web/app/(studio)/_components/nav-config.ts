import { Calculator, LayoutTemplate, MonitorPlay, type LucideIcon } from 'lucide-react';

/** Secciones del Studio (§5B). Href = ruta real del área de autoría del diseñador. */
export type SeccionStudio = {
  id: string;
  etiqueta: string;
  href: string;
};

// Solo secciones ya construidas (§4.5). Inicio (home del Studio) y Ateneo del
// diseñador (lanzar encuestas) son piezas posteriores; se agregan al existir sus
// rutas para no dejar enlaces a 404.
export const SECCIONES: SeccionStudio[] = [
  { id: 'programas', etiqueta: 'Programas', href: '/programas' },
  { id: 'grupos', etiqueta: 'Grupos', href: '/grupos' },
  { id: 'contenido', etiqueta: 'Contenido', href: '/contenido' },
  { id: 'casos', etiqueta: 'Casos', href: '/casos' },
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

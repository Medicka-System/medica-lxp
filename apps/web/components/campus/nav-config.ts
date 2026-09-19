import {
  Activity,
  Award,
  BookOpen,
  Calculator,
  Calendar,
  Compass,
  CreditCard,
  FileText,
  Home,
  Library,
  LifeBuoy,
  MessageCircle,
  MessagesSquare,
  MonitorPlay,
  NotebookPen,
  Video,
  type LucideIcon,
} from 'lucide-react';

export type ItemNav = {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  href: string;
  externo?: boolean;
};

export type GrupoNav = { titulo: string; items: ItemNav[] };

/** Secciones del Campus (§5B). El href es la ruta real del route group (campus). */
export const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Aprender',
    items: [
      { id: 'inicio', etiqueta: 'Inicio', icono: Home, href: '/inicio' },
      { id: 'cursos', etiqueta: 'Mis cursos', icono: BookOpen, href: '/cursos' },
      { id: 'videoteca', etiqueta: 'Videoteca', icono: Video, href: '/videoteca' },
      { id: 'explorar', etiqueta: 'Explorar', icono: Compass, href: '/explorar' },
    ],
  },
  {
    titulo: 'Mis casos y comunidad',
    items: [
      { id: 'bitacora', etiqueta: 'Mi bitácora', icono: NotebookPen, href: '/bitacora' },
      { id: 'ateneo', etiqueta: 'Ateneo', icono: MessagesSquare, href: '/ateneo' },
      { id: 'biblioteca', etiqueta: 'Biblioteca de casos', icono: Library, href: '/biblioteca' },
    ],
  },
  {
    titulo: 'Mis herramientas',
    items: [
      { id: 'reportes', etiqueta: 'Mis reportes', icono: FileText, href: '/herramientas/reportes' },
      { id: 'consultas', etiqueta: 'Consultas', icono: MessageCircle, href: '/herramientas/consultas' },
      { id: 'calculadoras', etiqueta: 'Calculadoras', icono: Calculator, href: '/calculadoras' },
      { id: 'simuladores', etiqueta: 'Simuladores', icono: MonitorPlay, href: '/simuladores' },
    ],
  },
  {
    titulo: 'Mi progreso',
    items: [
      { id: 'dominio', etiqueta: 'Mi dominio', icono: Activity, href: '/dominio' },
      { id: 'certificados', etiqueta: 'Certificados', icono: Award, href: '/certificados' },
    ],
  },
];

export const GRUPO_PIE: ItemNav[] = [
  { id: 'calendario', etiqueta: 'Calendario', icono: Calendar, href: '/calendario' },
  { id: 'pagos', etiqueta: 'Pagos y facturación', icono: CreditCard, href: '/pagos', externo: true },
  { id: 'ayuda', etiqueta: 'Ayuda · WhatsApp', icono: LifeBuoy, href: '/ayuda' },
];

/** Cinco esenciales del bottom-nav móvil. */
export const ESENCIALES = ['inicio', 'cursos', 'bitacora', 'ateneo'];

export const TODOS = [...GRUPOS.flatMap((g) => g.items), ...GRUPO_PIE];

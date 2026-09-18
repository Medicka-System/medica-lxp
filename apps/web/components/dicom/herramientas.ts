import {
  Move,
  ZoomIn,
  Contrast,
  Ruler,
  Triangle,
  Circle,
  Square,
  Crosshair,
  ArrowUpLeft,
  Layers,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de herramientas del `VisorDicom` (§4.7: "ver + anotar").
 *
 * Cada id se mapea 1:1 al nombre de la tool de Cornerstone3D dentro del motor
 * (`engine/motor-cornerstone.ts`). La UI SOLO conoce estos ids semánticos; el
 * acoplamiento a la librería vive en el adaptador.
 */
export type HerramientaId =
  // Manipulación (no dibujan anotaciones)
  | 'desplazar' // Pan
  | 'zoom' // Zoom
  | 'ventana' // WindowLevel (brillo/contraste)
  | 'recorrer' // StackScroll (navegar frames con el ratón)
  // Medición
  | 'longitud' // Length
  | 'angulo' // Angle
  | 'elipse' // EllipticalROI
  | 'rectangulo' // RectangleROI
  | 'sonda' // Probe (valor de píxel puntual)
  // Anotación
  | 'flecha'; // ArrowAnnotate (flecha + texto)

/** Grupos para la toolbar (una acción primaria por vista, §5A). */
export type CategoriaHerramienta = 'manipulacion' | 'medicion' | 'anotacion';

export interface Herramienta {
  id: HerramientaId;
  /** Nombre de la tool en Cornerstone3D (usado por el adaptador). */
  nombreCornerstone: string;
  etiqueta: string;
  icono: LucideIcon;
  categoria: CategoriaHerramienta;
  /** true si produce anotaciones/mediciones borrables. */
  anota: boolean;
}

export const HERRAMIENTAS: readonly Herramienta[] = [
  { id: 'desplazar', nombreCornerstone: 'Pan', etiqueta: 'Desplazar', icono: Move, categoria: 'manipulacion', anota: false },
  { id: 'zoom', nombreCornerstone: 'Zoom', etiqueta: 'Zoom', icono: ZoomIn, categoria: 'manipulacion', anota: false },
  { id: 'ventana', nombreCornerstone: 'WindowLevel', etiqueta: 'Brillo/Contraste', icono: Contrast, categoria: 'manipulacion', anota: false },
  { id: 'recorrer', nombreCornerstone: 'StackScroll', etiqueta: 'Recorrer frames', icono: Layers, categoria: 'manipulacion', anota: false },
  { id: 'longitud', nombreCornerstone: 'Length', etiqueta: 'Longitud', icono: Ruler, categoria: 'medicion', anota: true },
  { id: 'angulo', nombreCornerstone: 'Angle', etiqueta: 'Ángulo', icono: Triangle, categoria: 'medicion', anota: true },
  { id: 'elipse', nombreCornerstone: 'EllipticalROI', etiqueta: 'Elipse (ROI)', icono: Circle, categoria: 'medicion', anota: true },
  { id: 'rectangulo', nombreCornerstone: 'RectangleROI', etiqueta: 'Rectángulo (ROI)', icono: Square, categoria: 'medicion', anota: true },
  { id: 'sonda', nombreCornerstone: 'Probe', etiqueta: 'Sonda', icono: Crosshair, categoria: 'medicion', anota: true },
  { id: 'flecha', nombreCornerstone: 'ArrowAnnotate', etiqueta: 'Flecha + nota', icono: ArrowUpLeft, categoria: 'anotacion', anota: true },
] as const;

/** Herramienta activa por defecto: manipular ventana (lo más usado en US). */
export const HERRAMIENTA_POR_DEFECTO: HerramientaId = 'ventana';

const PORHERRAMIENTA = new Map<HerramientaId, Herramienta>(
  HERRAMIENTAS.map((h) => [h.id, h]),
);

export function obtenerHerramienta(id: HerramientaId): Herramienta {
  const h = PORHERRAMIENTA.get(id);
  if (!h) throw new Error(`Herramienta desconocida: ${id}`);
  return h;
}

export function herramientasPorCategoria(
  categoria: CategoriaHerramienta,
): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.categoria === categoria);
}

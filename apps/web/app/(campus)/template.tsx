/**
 * Template del route group (campus) — envuelve el contenido de CADA página y REMONTA
 * en cada navegación (a diferencia del layout, que persiste). Eso deja aplicar un
 * crossfade sobrio al contenido nuevo sin tocar el shell (header/lateral/bottom-nav
 * viven en layout.tsx y no se remontan). La animación es CSS-nativa (template.module.css),
 * solo opacity/transform; respeta prefers-reduced-motion y el toggle "Reducir animaciones".
 *
 * Server component: no necesita hooks, solo aporta el contenedor animado.
 */

import { cn } from '@/lib/utils';
import estilos from './template.module.css';

export default function CampusTemplate({ children }: { children: React.ReactNode }) {
  return <div className={cn(estilos.entrada, 'motion-reduce:animate-none')}>{children}</div>;
}

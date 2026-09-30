/**
 * Overlay — primitivo de aparición/desaparición CSS-nativa (§5A). Un solo lugar
 * define el fade + scale sutil; muchos consumidores lo heredan (menús, popovers,
 * hojas, diálogos). NO usa librería de animación: entrada por `@starting-style`,
 * salida por `transition-behavior: allow-discrete` (ver overlay.module.css).
 *
 * ── Contrato (IMPORTANTE) ────────────────────────────────────────────────────
 * Para que la SALIDA anime, el elemento debe seguir MONTADO mientras se cierra;
 * controla la visibilidad con la prop `open`, NO con `{open && <Overlay/>}`:
 *
 *   const [abierto, setAbierto] = useState(false);
 *   <Overlay open={abierto} className="absolute … rounded-xl border bg-card shadow-…">
 *     … contenido del panel …
 *   </Overlay>
 *
 *   · Montado + toggle de `open`  → animan ENTRADA y SALIDA.
 *   · Render condicional `{open && …}` → solo anima la ENTRADA (React lo desmonta
 *     antes de que corra la salida). Válido si no te importa la salida.
 *
 * `open === false` deja el elemento en `display:none` (fuera del árbol de
 * accesibilidad y del foco), así que no necesitas ocultarlo por otra vía.
 *
 * ── Para elementos con semántica propia ──────────────────────────────────────
 * Si ya tienes el elemento correcto (p. ej. `<ul role="listbox">`) y no quieres un
 * `<div>` envolvente, aplícale la clase `capaOverlay` y empareja `data-open={bool}`
 * en lugar de usar el componente. El Select del proyecto lo hace así.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import estilos from './overlay.module.css';

/** Clase del primitivo de overlay, para aplicarla directamente a un elemento con
 *  semántica propia. Empareja SIEMPRE con `data-open={boolean}`. */
export const capaOverlay = estilos.capa;

export interface OverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Muestra (true) u oculta (false) el overlay animando la transición. */
  open: boolean;
}

export function Overlay({ open, className, children, ...props }: OverlayProps) {
  return (
    <div data-open={open} className={cn(capaOverlay, className)} {...props}>
      {children}
    </div>
  );
}

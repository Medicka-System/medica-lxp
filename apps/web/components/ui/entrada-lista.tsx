/**
 * EntradaLista — wrapper de entrada escalonada para listas (§5A). Un solo lugar
 * define el stagger (fade + translate corto); feeds y grids lo heredan.
 * CSS-nativo (keyframes en entrada-lista.module.css); sin librería de animación.
 *
 * No impone contenedor: renderiza un Fragment y clona cada hijo directo añadiéndole
 * la clase de animación y su `animation-delay`. Así el grid/lista del consumidor
 * sigue siendo suyo (los ítems clonados quedan como hijos directos de su contenedor):
 *
 *   <ul className="grid grid-cols-3 gap-4">
 *     <EntradaLista>
 *       {items.map((it) => <li key={it.id}>…</li>)}
 *     </EntradaLista>
 *   </ul>
 *
 * Parametrizable: `pasoMs` (incremento entre ítems), `baseMs` (retraso inicial),
 * `tope` (índice máximo escalonado — a partir de ahí el delay se aplana para que
 * una lista larga no espere segundos). Sobrio por defecto (40ms de paso).
 *
 * Requisito: cada hijo directo debe aceptar `className`/`style` (elementos DOM o
 * componentes que reenvían props). Los hijos no-elemento se dejan intactos.
 * Reduced-motion: la animación se apaga sola (ver el .module.css) + `motion-reduce:*`.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import estilos from './entrada-lista.module.css';

export interface EntradaListaProps {
  children: React.ReactNode;
  /** Incremento de retraso entre ítems consecutivos (ms). */
  pasoMs?: number;
  /** Retraso inicial antes del primer ítem (ms). */
  baseMs?: number;
  /** Índice máximo escalonado; los ítems más allá comparten ese retraso. */
  tope?: number;
}

export function EntradaLista({ children, pasoMs = 40, baseMs = 0, tope = 10 }: EntradaListaProps) {
  return (
    <>
      {React.Children.toArray(children).map((child, i) => {
        if (!React.isValidElement(child)) return child;
        const el = child as React.ReactElement<{ className?: string; style?: React.CSSProperties }>;
        const delay = baseMs + Math.min(i, tope) * pasoMs;
        return React.cloneElement(el, {
          className: cn(estilos.item, 'motion-reduce:animate-none', el.props.className),
          style: { ...el.props.style, animationDelay: `${delay}ms` },
        });
      })}
    </>
  );
}

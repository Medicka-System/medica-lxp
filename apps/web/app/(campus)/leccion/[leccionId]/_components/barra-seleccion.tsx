'use client';

/**
 * Barra flotante que aparece al SELECCIONAR texto en la lección de teoría (§5A):
 * "Guardar como nota" (cita el fragmento) y "Subrayar" (resaltado persistente tipo
 * Kindle). Se posiciona sobre la selección (coordenadas de viewport · position fixed).
 */

import { Highlighter, Quote } from 'lucide-react';
import { focusRing } from '@/components/tokens';

export function BarraSeleccion({
  x,
  y,
  onGuardar,
  onSubrayar,
}: {
  x: number;
  y: number;
  onGuardar: () => void;
  onSubrayar: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Acciones sobre la selección"
      // Evita que el mousedown en la barra colapse la selección antes del click.
      onMouseDown={(e) => e.preventDefault()}
      style={{ left: x, top: Math.max(8, y - 46) }}
      className="fixed z-[70] -translate-x-1/2 overflow-hidden rounded-full border border-border bg-card shadow-[0_8px_24px_rgba(17,24,39,0.18)]"
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={onGuardar}
          className={`inline-flex h-10 items-center gap-1.5 px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Quote aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Guardar como nota
        </button>
        <span aria-hidden className="h-5 w-px bg-border" />
        <button
          type="button"
          onClick={onSubrayar}
          className={`inline-flex h-10 items-center gap-1.5 px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Highlighter aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Subrayar
        </button>
      </div>
    </div>
  );
}

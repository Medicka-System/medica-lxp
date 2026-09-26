'use client';

/**
 * Dropdown/select estilizado (§5A) — reusa el patrón del `Selector` de la app (docente/entregas):
 * el <select> nativo NO permite estilizar su lista (fuente del sistema), así que se arma con
 * botón + lista `role="listbox"`. Botón entero clickeable, bordes redondeados, línea suave y la
 * tipografía del design system tanto en el botón como en las opciones.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { focusRing } from '@/components/tokens';

export type OpcionSelector = { id: string; etiqueta: string };

export function Selector({
  rotulo,
  valor,
  opciones,
  onSelect,
}: {
  /** Prefijo del botón (p. ej. "Estudio"). */
  rotulo: string;
  /** Etiqueta de la opción seleccionada (lo que se muestra en el botón). */
  valor: string;
  opciones: OpcionSelector[];
  onSelect: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setAbierto(false);
    };
    const alEsc = (ev: KeyboardEvent) => ev.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alEsc);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alEsc);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-secondary ${focusRing}`}
      >
        {rotulo && <span className="text-muted-foreground">{rotulo}</span>}
        <span className="max-w-[180px] truncate">{valor}</span>
        <ChevronDown aria-hidden className="ml-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2} />
      </button>

      {abierto && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[320px] w-[260px] overflow-y-auto rounded-[12px] border border-border bg-card p-1.5 shadow-[0_8px_28px_rgba(17,24,39,0.14)]"
        >
          {opciones.map((o) => {
            const on = o.etiqueta === valor;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setAbierto(false);
                    onSelect(o.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors ${focusRing} ${
                    on ? 'bg-accent font-bold text-accent-foreground' : 'font-medium text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.etiqueta}</span>
                  {on && <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.4} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';

/**
 * Átomos compartidos de la pantalla de Entregas (§5A) — fieles al mock aprobado
 * (`campus-lxp-mocks/studio/docente/entregas`). Sin hex: todo sale de tokens. Un solo
 * color de atención: ÁMBAR para lo que espera lectura; VIOLETA es Eco (nunca alerta).
 */

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, MonitorCheck, Sparkles } from 'lucide-react';
import { kicker, focusRing } from '@/lib/studio/estilos';
import type { EstadoVistaEntrega } from '../../../_lib/contrato';

type EstadoInfo = { texto: string; clase: string; icono?: typeof Check };

/** Cada estado lleva ícono + texto (nunca solo color · §5A · regla del mock). */
export const ESTADO: Record<EstadoVistaEntrega, EstadoInfo> = {
  auto: { texto: 'Auto-calificada', clase: 'bg-accent text-accent-foreground', icono: MonitorCheck },
  sugerida: {
    texto: 'Nota sugerida (Eco)',
    clase:
      'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
    icono: Sparkles,
  },
  'requiere-lectura': {
    texto: 'Requiere lectura',
    clase:
      'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
    icono: Clock,
  },
  calificada: { texto: 'Calificada', clase: 'bg-accent text-accent-foreground', icono: Check },
  'sin-entregar': { texto: 'Sin entregar', clase: 'border border-border bg-muted text-muted-foreground' },
};

export function ChipEstado({ estado }: { estado: EstadoVistaEntrega }) {
  const e = ESTADO[estado];
  const Icono = e.icono;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] text-[11px] font-bold ${e.clase}`}
    >
      {Icono && <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />}
      {e.texto}
    </span>
  );
}

/**
 * Selector con rótulo pequeño + chevron (grupo / actividad). Abre un menú y llama
 * `onSelect` con la opción elegida. Se cierra al elegir, con Escape o al clic afuera.
 */
export function Selector({
  rotulo,
  valor,
  opciones,
  onSelect,
  anchoMin,
}: {
  rotulo: string;
  valor: string;
  opciones: { id: string; etiqueta: string }[];
  onSelect: (id: string) => void;
  /** Ancho mínimo del botón (spec: Grupo 200px · Actividad 300px). */
  anchoMin?: number;
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
        style={anchoMin ? { minWidth: anchoMin } : undefined}
        className={`inline-flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left transition-colors hover:border-primary ${focusRing}`}
      >
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={`${kicker} text-[9.5px] tracking-[0.12em] text-muted-foreground`}>{rotulo}</span>
          <span className="mt-0.5 truncate text-[12.5px] font-bold">{valor}</span>
        </span>
        <ChevronDown aria-hidden className="ml-auto h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
      </button>

      {abierto && opciones.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[320px] w-[280px] overflow-y-auto rounded-[12px] border border-border bg-card p-1.5 shadow-[0_8px_28px_rgba(17,24,39,0.14)]"
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
                    if (!on) onSelect(o.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] transition-colors ${focusRing} ${
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

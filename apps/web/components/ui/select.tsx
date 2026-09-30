'use client';

/**
 * `Select` — dropdown tokenizado y genérico (§5A). Promueve el patrón bespoke de
 * herramientas/reportes (el `<select>` nativo no deja estilizar su lista: fuente del
 * sistema, sin bordes redondeados), armado con botón + lista `role="listbox"`.
 *
 * Prop-driven: `options` (value/label/disabled), `value`, `onChange`, `placeholder`,
 * `disabled`. Estilo de CAMPO por defecto (h-11, radio 10, línea gris) para encajar en
 * formularios; `className` sobreescribe el botón cuando se necesita otro look.
 *
 * Accesible: botón `aria-haspopup="listbox"`; al abrir el foco entra a la lista y se
 * navega con ↑/↓, Home/End, Enter/Espacio para elegir, Esc para cerrar. `aria-selected`
 * marca la opción activa. Cierra por clic afuera / Esc / Tab.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { focusRing } from '@/components/tokens';
import { capaOverlay } from '@/components/ui/overlay';

export type OpcionSelect = { value: string; label: string; disabled?: boolean };

const primerHabilitado = (opts: OpcionSelect[]): number => opts.findIndex((o) => !o.disabled);
const ultimoHabilitado = (opts: OpcionSelect[]): number => {
  for (let i = opts.length - 1; i >= 0; i--) if (!opts[i]?.disabled) return i;
  return -1;
};

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccione…',
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
}: {
  options: OpcionSelect[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Sustituye el estilo del BOTÓN (por defecto, campo h-11). */
  className?: string;
  id?: string;
  'aria-label'?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const baseId = id ?? autoId;

  const sel = options.find((o) => o.value === value) ?? null;

  // Cierre por clic afuera.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  // Al abrir: resalta la opción seleccionada (o la primera habilitada) y enfoca la lista.
  useEffect(() => {
    if (!abierto) return;
    const idx = options.findIndex((o) => o.value === value);
    setActivo(idx >= 0 && !options[idx]?.disabled ? idx : primerHabilitado(options));
    listaRef.current?.focus();
    // Intencional: solo re-corre al abrir/cerrar (options/value se leen frescos aquí).
  }, [abierto]);

  const mover = (dir: 1 | -1) => {
    setActivo((i) => {
      if (options.length === 0) return -1;
      let n = i < 0 ? (dir === 1 ? -1 : 0) : i;
      for (let k = 0; k < options.length; k++) {
        n = (n + dir + options.length) % options.length;
        if (!options[n]?.disabled) return n;
      }
      return i;
    });
  };

  const elegir = (o: OpcionSelect | undefined) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    setAbierto(false);
  };

  const teclaBoton = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setAbierto(true);
    }
  };

  const teclaLista = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        mover(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActivo(primerHabilitado(options));
        break;
      case 'End':
        e.preventDefault();
        setActivo(ultimoHabilitado(options));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegir(options[activo]);
        break;
      case 'Escape':
        e.preventDefault();
        setAbierto(false);
        break;
      case 'Tab':
        setAbierto(false);
        break;
    }
  };

  const estiloBoton =
    className ??
    `flex h-11 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors [transition-duration:var(--dur-rapida)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none hover:border-secondary disabled:opacity-60 ${
      abierto ? 'border-secondary' : ''
    } ${focusRing}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={baseId}
        disabled={disabled}
        onClick={() => !disabled && setAbierto((v) => !v)}
        onKeyDown={teclaBoton}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={ariaLabel}
        className={estiloBoton}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${sel ? '' : 'text-muted-foreground'}`}>
          {sel ? sel.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform [transition-duration:var(--dur-rapida)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none ${
            abierto ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
        />
      </button>

      {/* Listbox SIEMPRE montado (data-open lo muestra/oculta) para que la SALIDA
          anime vía el primitivo de overlay. Cerrado = display:none → fuera del foco
          y del árbol de accesibilidad. */}
      <ul
        ref={listaRef}
        role="listbox"
        tabIndex={-1}
        data-open={abierto}
        aria-activedescendant={abierto && activo >= 0 ? `${baseId}-opt-${activo}` : undefined}
        onKeyDown={teclaLista}
        className={`${capaOverlay} absolute left-0 top-[calc(100%+6px)] z-30 max-h-[320px] w-full min-w-[200px] overflow-y-auto rounded-[12px] border border-border bg-card p-1.5 shadow-[0_8px_28px_rgba(17,24,39,0.14)] outline-none`}
      >
          {options.map((o, i) => {
            const on = o.value === value;
            const resaltada = i === activo;
            return (
              <li key={o.value || `__${i}`} id={`${baseId}-opt-${i}`} role="option" aria-selected={on}>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={o.disabled}
                  onClick={() => elegir(o)}
                  onMouseEnter={() => !o.disabled && setActivo(i)}
                  className={`flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors [transition-duration:var(--dur-rapida)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none disabled:opacity-50 ${
                    on
                      ? 'bg-accent font-bold text-accent-foreground'
                      : resaltada
                        ? 'bg-muted font-medium text-foreground'
                        : 'font-medium text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {on && <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.4} />}
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

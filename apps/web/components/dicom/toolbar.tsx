'use client';

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Repeat,
  Eraser,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HERRAMIENTAS,
  type CategoriaHerramienta,
  type HerramientaId,
} from './herramientas';
import type { CineLoop } from './use-cine-loop';

const ORDEN_CATEGORIAS: { id: CategoriaHerramienta; etiqueta: string }[] = [
  { id: 'manipulacion', etiqueta: 'Manipular' },
  { id: 'medicion', etiqueta: 'Medir' },
  { id: 'anotacion', etiqueta: 'Anotar' },
];

interface BarraHerramientasProps {
  activa: HerramientaId;
  onSeleccionar: (id: HerramientaId) => void;
  onLimpiar: () => void;
  onReencuadrar: () => void;
  /** En solo-lectura se ocultan medición y anotación. */
  soloLectura?: boolean;
}

/** Barra de herramientas del visor (§4.7: ver + anotar). shadcn personalizado (§5A). */
export function BarraHerramientas({
  activa,
  onSeleccionar,
  onLimpiar,
  onReencuadrar,
  soloLectura = false,
}: BarraHerramientasProps) {
  const categorias = soloLectura
    ? ORDEN_CATEGORIAS.filter((c) => c.id === 'manipulacion')
    : ORDEN_CATEGORIAS;

  return (
    <div
      role="toolbar"
      aria-label="Herramientas del visor"
      className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card px-2.5 py-2"
    >
      {categorias.map((cat, i) => (
        <div key={cat.id} className="flex items-center gap-1">
          {i > 0 && <span className="mx-1 h-6 w-px bg-border" aria-hidden />}
          {HERRAMIENTAS.filter((h) => h.categoria === cat.id).map((h) => {
            const Icono = h.icono;
            const seleccionada = h.id === activa;
            return (
              <button
                key={h.id}
                type="button"
                aria-pressed={seleccionada}
                aria-label={h.etiqueta}
                title={h.etiqueta}
                onClick={() => onSeleccionar(h.id)}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  seleccionada
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icono size={18} strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      ))}

      <div className="ml-auto flex items-center gap-1">
        {!soloLectura && (
          <button
            type="button"
            aria-label="Borrar anotaciones"
            title="Borrar anotaciones"
            onClick={onLimpiar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Eraser size={18} strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          aria-label="Reencuadrar"
          title="Reencuadrar"
          onClick={onReencuadrar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Maximize2 size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

interface ControlesCineProps {
  cine: CineLoop;
  total: number;
  loop: boolean;
  onToggleLoop: () => void;
}

/** Controles del cine-loop: reproducir, saltar frames y scrubber. */
export function ControlesCine({ cine, total, loop, onToggleLoop }: ControlesCineProps) {
  const { indice, reproduciendo, alternar, siguiente, anterior, irA } = cine;
  const maximo = Math.max(total - 1, 0);

  return (
    <div className="flex items-center gap-2.5 border-t border-border bg-card px-2.5 py-2">
      <button
        type="button"
        aria-label="Frame anterior"
        onClick={anterior}
        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SkipBack size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
        aria-pressed={reproduciendo}
        onClick={alternar}
        className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-primary text-primary-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {reproduciendo ? (
          <Pause size={18} strokeWidth={2} />
        ) : (
          <Play size={18} strokeWidth={2} className="ml-0.5" />
        )}
      </button>
      <button
        type="button"
        aria-label="Frame siguiente"
        onClick={siguiente}
        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SkipForward size={16} strokeWidth={1.75} />
      </button>

      <input
        type="range"
        aria-label="Posición del cine-loop"
        min={0}
        max={maximo}
        value={indice}
        onChange={(e) => irA(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-pill bg-muted accent-primary"
      />

      <span className="min-w-[4.5rem] text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {indice + 1} / {total}
      </span>

      <button
        type="button"
        aria-label="Repetir en bucle"
        aria-pressed={loop}
        title="Repetir en bucle"
        onClick={onToggleLoop}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          loop
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Repeat size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}

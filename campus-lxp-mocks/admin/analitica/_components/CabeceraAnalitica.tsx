"use client";

/**
 * Cabecera: título, filtros por periodo, programa y grupo, exportar y acceso a Eco analista.
 */

import {
  ChevronDown,
  Download,
} from "lucide-react";
import { softText, focusRing } from "./ui";

export type CabeceraAnaliticaProps = {
  periodo: string;
  setPeriodo: (p: string) => void;
  onFiltrar: (f: string) => void;
  onExportar: () => void;
};

export function CabeceraAnalitica({ periodo, setPeriodo, onFiltrar, onExportar }: CabeceraAnaliticaProps) {
  return (
    <>
      {/* cabecera y filtros */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Analítica</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            Cada cifra viene con su señal: qué revisar, no solo cómo va.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ["30d", "30 días"],
                ["trimestre", "Trimestre"],
                ["anio", "Año"],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPeriodo(id);
                  onFiltrar("periodo", id);
                }}
                aria-pressed={periodo === id}
                className={`h-8 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  periodo === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {["Todos los programas", "Todos los grupos"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onFiltrar(t, "todos")}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              {t}
              <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ))}

          <button
            type="button"
            onClick={onExportar}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Exportar
          </button>
        </div>
      </div>
    </>
  );
}

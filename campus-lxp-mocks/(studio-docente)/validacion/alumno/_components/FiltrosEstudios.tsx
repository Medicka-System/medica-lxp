"use client";

import { ChevronDown } from "lucide-react";
import type { EstudioAlumno, FiltroEstudios, OrdenEstudios } from "./tipos";

const mono = "font-mono tabular-nums";
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

const FILTROS: { id: FiltroEstudios; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "pendiente", etiqueta: "Por validar" },
  { id: "aprobado", etiqueta: "Aprobados" },
  { id: "devuelto", etiqueta: "Devueltos" },
];

const ORDENES: { id: OrdenEstudios; etiqueta: string }[] = [
  { id: "pendientes-primero", etiqueta: "Por validar primero" },
  { id: "recientes", etiqueta: "Más recientes" },
  { id: "antiguos", etiqueta: "Más antiguos" },
];

export function FiltrosEstudios({
  estudios,
  filtro,
  orden,
  onFiltro,
  onOrden,
}: {
  estudios: EstudioAlumno[];
  filtro: FiltroEstudios;
  orden: OrdenEstudios;
  onFiltro: (f: FiltroEstudios) => void;
  onOrden: (o: OrdenEstudios) => void;
}) {
  const conteo = (f: FiltroEstudios) => (f === "todos" ? estudios.length : estudios.filter((e) => e.estado === f).length);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div role="tablist" aria-label="Filtrar estudios" className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
        {FILTROS.map((f) => {
          const on = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onFiltro(f.id)}
              className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold ${focus} ${
                on ? "bg-sidebar text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.etiqueta}
              <span className={`${mono} font-bold ${on ? "text-white/70" : "text-muted-foreground"}`}>{conteo(f.id)}</span>
            </button>
          );
        })}
      </div>

      <label className="relative ml-auto">
        <span className="sr-only">Ordenar estudios</span>
        <select
          value={orden}
          onChange={(e) => onOrden(e.target.value as OrdenEstudios)}
          className={`h-9 appearance-none rounded-[9px] border border-border bg-card pl-3 pr-8 text-[12px] font-semibold text-foreground ${focus}`}
        >
          {ORDENES.map((o) => (
            <option key={o.id} value={o.id}>{o.etiqueta}</option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
      </label>
    </div>
  );
}

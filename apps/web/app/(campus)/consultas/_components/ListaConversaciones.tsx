"use client";

/**
 * Consultas (alumno) · lista de conversaciones (columna izquierda, 344px)
 * Cabecera con «Nueva», buscador y filtro por tipo; renglones con tipo, estado,
 * último mensaje, hora y no leídos. El renglón activo lleva borde izquierdo teal y fondo accent.
 */

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Conversacion, TipoContacto } from "./tipos";
import { AvatarContacto, ChipEstado, ChipTipo, focusRing, mono, panel } from "./ui";

type Filtro = "todas" | TipoContacto;

export function ListaConversaciones({
  conversaciones,
  activaId,
  onAbrir,
  onNueva,
}: {
  conversaciones: Conversacion[];
  activaId?: string;
  onAbrir: (id: string) => void;
  onNueva: () => void;
}) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return conversaciones.filter(
      (c) =>
        (filtro === "todas" || c.contacto.tipo === filtro) &&
        (!t || c.contacto.nombre.toLowerCase().includes(t) || c.ultimoMensaje.texto.toLowerCase().includes(t)),
    );
  }, [conversaciones, q, filtro]);

  const noLeidosPorTipo = (t: TipoContacto) =>
    conversaciones.filter((c) => c.contacto.tipo === t).reduce((s, c) => s + c.noLeidos, 0);

  return (
    <aside className={`${panel} flex w-full flex-col overflow-hidden lg:w-[344px] lg:shrink-0`}>
      <div className="shrink-0 p-3.5">
        <div className="flex items-center gap-2.5">
          <h1 className="flex-1 text-[18px] font-extrabold">Consultas</h1>
          <button type="button" onClick={onNueva} className={`inline-flex h-[38px] items-center gap-[7px] rounded-[10px] bg-primary px-3 text-[12.5px] font-bold text-[color:var(--sidebar)] ${focusRing}`}>
            <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.4} />
            Nueva
          </button>
        </div>
        <label className="mt-3 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-muted px-3 focus-within:border-secondary">
          <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar conversación</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversación…" className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        <div role="tablist" aria-label="Filtrar por tipo" className="mt-2.5 flex gap-1">
          {(
            [
              ["todas", "Todas"],
              ["docente", "Docentes"],
              ["staff", "Staff"],
              ["colega", "Colegas"],
            ] as const
          ).map(([id, t]) => {
            const n = id === "todas" ? 0 : noLeidosPorTipo(id);
            return (
              <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} className={`inline-flex h-8 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg text-[11.5px] font-semibold ${filtro === id ? "bg-sidebar text-sidebar-foreground" : "bg-muted text-[color:var(--foreground-soft)]"} ${focusRing}`}>
                {t}
                {n > 0 && <span aria-label={`${n} sin leer`} className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto border-t border-border">
        {visibles.map((c) => {
          const on = c.id === activaId;
          const nl = c.noLeidos > 0;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onAbrir(c.id)}
                aria-current={on ? "true" : undefined}
                className={`flex w-full gap-3 border-b border-l-[3px] border-b-border px-3.5 py-3 text-left transition-colors ${on ? "border-l-primary bg-accent" : "border-l-transparent hover:bg-muted"} ${focusRing}`}
              >
                <AvatarContacto ini={c.contacto.ini} tipo={c.contacto.tipo} enLinea={c.contacto.enLinea} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`min-w-0 flex-1 truncate text-[13px] ${nl ? "font-extrabold" : "font-bold"}`}>{c.contacto.nombre}</span>
                    <span className={`${mono} shrink-0 text-[10.5px] ${nl ? "font-bold text-secondary" : "text-muted-foreground"}`}>{c.hora}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ChipTipo tipo={c.contacto.tipo} texto={c.contacto.contexto} />
                    {c.estado && <ChipEstado estado={c.estado} />}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className={`min-w-0 flex-1 truncate text-[12px] ${nl ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {c.ultimoMensaje.deMi && "Tú: "}
                      {c.ultimoMensaje.texto}
                    </span>
                    {nl && (
                      <span className={`${mono} grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-[color:var(--sidebar)]`}>
                        {c.noLeidos}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {visibles.length === 0 && (
          <li className="px-5 py-10 text-center text-[12.5px] text-muted-foreground">Sin conversaciones con este filtro.</li>
        )}
      </ul>
    </aside>
  );
}

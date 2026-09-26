"use client";

/**
 * Consultas (alumno) · nueva conversación (modal)
 * Buscador «¿A quién quiere escribir?» + filtro, resultados agrupados por tipo con una línea
 * que explica para qué sirve cada grupo. Si ya existe conversación con el contacto, se abre esa.
 */

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Contacto, TipoContacto } from "./tipos";
import { AvatarContacto, focusRing, softText } from "./ui";

const GRUPOS: { tipo: TipoContacto; titulo: string; ayuda: string }[] = [
  { tipo: "docente", titulo: "Mis docentes", ayuda: "Para dudas del curso. La consulta queda abierta hasta que usted la cierre." },
  { tipo: "staff", titulo: "Staff del campus", ayuda: "Trámites, constancias, pagos y soporte de la plataforma." },
  { tipo: "colega", titulo: "Colegas", ayuda: "Sus conexiones del Ateneo y compañeros de grupo." },
];

export function NuevaConversacion({
  contactos,
  onElegir,
  onCerrar,
}: {
  contactos: Contacto[];
  onElegir: (contactoId: string) => void;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | TipoContacto>("todos");

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contactos.filter(
      (c) => (filtro === "todos" || c.tipo === filtro) && (!t || `${c.nombre} ${c.descripcion ?? ""}`.toLowerCase().includes(t)),
    );
  }, [contactos, q, filtro]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-6 py-10" style={{ background: "rgba(15,45,82,.55)" }} onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label="Nueva conversación" onClick={(e) => e.stopPropagation()} className="flex max-h-full w-[560px] max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_rgba(17,24,39,0.28)]">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-4">
          <p className="flex-1 text-[15.5px] font-bold">Nueva conversación</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={`grid h-9 w-9 place-items-center rounded-full bg-muted ${softText} ${focusRing}`}>
            <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-3.5">
          <label className="flex h-[46px] items-center gap-2 rounded-[11px] border-[1.5px] border-primary bg-card px-3">
            <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-secondary" strokeWidth={1.75} />
            <span className="sr-only">¿A quién quiere escribir?</span>
            <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿A quién quiere escribir?" className="w-full min-w-0 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          <div role="tablist" className="mt-2.5 flex flex-wrap gap-1.5">
            {(
              [
                ["todos", "Todos"],
                ["docente", "Mis docentes"],
                ["staff", "Staff"],
                ["colega", "Colegas"],
              ] as const
            ).map(([id, t]) => (
              <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} className={`h-8 rounded-full border px-3 text-[12px] font-semibold ${filtro === id ? "border-transparent bg-sidebar text-sidebar-foreground" : `border-border bg-card ${softText}`} ${focusRing}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {GRUPOS.map((g) => {
            const lista = filtrados.filter((c) => c.tipo === g.tipo);
            if (lista.length === 0) return null;
            return (
              <section key={g.tipo}>
                <p className="mb-1 mt-4 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{g.titulo}</p>
                <p className="mb-1.5 px-2 text-[11.5px] text-muted-foreground">{g.ayuda}</p>
                <ul>
                  {lista.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => onElegir(c.id)} className={`flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left hover:bg-muted ${focusRing}`}>
                        <AvatarContacto ini={c.ini} tipo={c.tipo} size={38} enLinea={c.enLinea} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold">{c.nombre}</span>
                          <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{c.descripcion}</span>
                        </span>
                        <span className="text-[12px] font-semibold text-secondary">Escribir</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtrados.length === 0 && <p className="px-4 py-10 text-center text-[12.5px] text-muted-foreground">Nadie coincide con «{q}».</p>}
        </div>
      </div>
    </div>
  );
}

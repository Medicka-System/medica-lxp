"use client";

/**
 * Consultas · nueva conversación (modal REUTILIZABLE alumno + docente)
 * Paso 1: «¿A quién quiere escribir?» + filtro, resultados agrupados por tipo.
 * Paso 2 (solo docente/staff, cuando `conTema`): elegir «Consulta general» o una lección
 *   de origen (fija `origen_leccion_id`). Colega va directo a redactar (sin paso de tema).
 * Reutilizado por el docente (props `grupos`/`conTema=false`): mismo componente, otros
 * contactos y sin paso de tema — directo a redactar.
 */

import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search, X } from "lucide-react";
import type { Contacto, Tema, TipoContacto } from "./tipos";
import { AvatarContacto, focusRing, softText } from "./ui";

export type GrupoContacto = { tipo: TipoContacto; titulo: string; ayuda: string };

const GRUPOS_ALUMNO: GrupoContacto[] = [
  { tipo: "docente", titulo: "Mis docentes", ayuda: "Para dudas del curso. La consulta queda abierta hasta que usted la cierre." },
  { tipo: "staff", titulo: "Staff del campus", ayuda: "Trámites, constancias, pagos y soporte de la plataforma." },
  { tipo: "colega", titulo: "Colegas", ayuda: "Sus conexiones del Ateneo y compañeros de grupo." },
];

export function NuevaConversacion({
  contactos,
  temas,
  onIniciar,
  onCerrar,
  grupos = GRUPOS_ALUMNO,
  conTema = true,
}: {
  contactos: Contacto[];
  temas: Tema[];
  onIniciar: (contactoId: string, origenLeccionId: string | null) => void;
  onCerrar: () => void;
  /** Grupos a mostrar (default = docente/staff/colega del alumno). El docente pasa los suyos. */
  grupos?: GrupoContacto[];
  /** Si false, NUNCA hay paso de tema: cualquier contacto va directo a redactar (docente). */
  conTema?: boolean;
}) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | TipoContacto>("todos");
  const [elegido, setElegido] = useState<Contacto | null>(null);
  const [qTema, setQTema] = useState("");

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contactos.filter(
      (c) => (filtro === "todos" || c.tipo === filtro) && (!t || `${c.nombre} ${c.descripcion ?? ""}`.toLowerCase().includes(t)),
    );
  }, [contactos, q, filtro]);

  const temasFiltrados = useMemo(() => {
    const t = qTema.trim().toLowerCase();
    return t ? temas.filter((x) => x.etiqueta.toLowerCase().includes(t)) : temas;
  }, [temas, qTema]);

  // El tema (lección de origen) solo aplica a docente/staff; colega va directo a redactar.
  const elegir = (c: Contacto) => {
    if (!conTema || c.tipo === "colega") {
      onIniciar(c.id, null);
      return;
    }
    setElegido(c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-6 py-10" style={{ background: "rgba(15,45,82,.55)" }} onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={elegido ? "Elegir tema de la consulta" : "Nueva conversación"} onClick={(e) => e.stopPropagation()} className="flex max-h-full w-[560px] max-w-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_rgba(17,24,39,0.28)]">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-4">
          {elegido && (
            <button type="button" onClick={() => setElegido(null)} aria-label="Volver a elegir contacto" className={`grid h-9 w-9 place-items-center rounded-full bg-muted ${softText} ${focusRing}`}>
              <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            </button>
          )}
          <p className="flex-1 text-[15.5px] font-bold">{elegido ? "¿Sobre qué es la consulta?" : "Nueva conversación"}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={`grid h-9 w-9 place-items-center rounded-full bg-muted ${softText} ${focusRing}`}>
            <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        {elegido ? (
          /* ── PASO 2 · tema (lección de origen) ── */
          <>
            <div className="shrink-0 px-5 pt-3.5">
              <div className="flex items-center gap-2.5 rounded-[11px] border border-border bg-muted px-3 py-2.5">
                <AvatarContacto ini={elegido.ini} tipo={elegido.tipo} size={36} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{elegido.nombre}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{elegido.contexto}</span>
                </span>
              </div>
              {temas.length > 6 && (
                <label className="mt-2.5 flex h-[42px] items-center gap-2 rounded-[11px] border border-border bg-card px-3">
                  <Search aria-hidden className="h-[16px] w-[16px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="sr-only">Buscar lección</span>
                  <input type="search" value={qTema} onChange={(e) => setQTema(e.target.value)} placeholder="Buscar una lección…" className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground" />
                </label>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <ul>
                <li>
                  <button type="button" onClick={() => onIniciar(elegido.id, null)} className={`flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left hover:bg-muted ${focusRing}`}>
                    <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground font-bold">?</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">Consulta general</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted-foreground">Sin una lección específica</span>
                    </span>
                    <span className="text-[12px] font-semibold text-secondary">Escribir</span>
                  </button>
                </li>
                {temasFiltrados.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => onIniciar(elegido.id, t.id)} className={`flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left hover:bg-muted ${focusRing}`}>
                      <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground"><BookOpen className="h-4 w-4" strokeWidth={1.75} /></span>
                      <span className="min-w-0 flex-1 text-[13px] font-medium">{t.etiqueta}</span>
                      <span className="text-[12px] font-semibold text-secondary">Escribir</span>
                    </button>
                  </li>
                ))}
                {temas.length === 0 && (
                  <li><p className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">No hay lecciones en sus cursos todavía. Puede escribir una consulta general.</p></li>
                )}
              </ul>
            </div>
          </>
        ) : (
          /* ── PASO 1 · contacto ── */
          <>
            <div className="shrink-0 px-5 pt-3.5">
              <label className="flex h-[46px] items-center gap-2 rounded-[11px] border-[1.5px] border-primary bg-card px-3">
                <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-secondary" strokeWidth={1.75} />
                <span className="sr-only">¿A quién quiere escribir?</span>
                <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿A quién quiere escribir?" className="w-full min-w-0 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground" />
              </label>
              <div role="tablist" className="mt-2.5 flex flex-wrap gap-1.5">
                {([["todos", "Todos"] as const, ...grupos.map((g) => [g.tipo, g.titulo] as const)]).map(([id, t]) => (
                  <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} className={`h-8 rounded-full border px-3 text-[12px] font-semibold ${filtro === id ? "border-transparent bg-sidebar text-sidebar-foreground" : `border-border bg-card ${softText}`} ${focusRing}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {grupos.map((g) => {
                const lista = filtrados.filter((c) => c.tipo === g.tipo);
                if (lista.length === 0) return null;
                return (
                  <section key={g.tipo}>
                    <p className="mb-1 mt-4 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{g.titulo}</p>
                    <p className="mb-1.5 px-2 text-[11.5px] text-muted-foreground">{g.ayuda}</p>
                    <ul>
                      {lista.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => elegir(c)} className={`flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left hover:bg-muted ${focusRing}`}>
                            <AvatarContacto ini={c.ini} tipo={c.tipo} size={38} enLinea={c.enLinea} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-bold">{c.nombre}</span>
                              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{c.descripcion}</span>
                            </span>
                            <span className="text-[12px] font-semibold text-secondary">{conTema && c.tipo !== "colega" ? "Elegir" : "Escribir"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {filtrados.length === 0 && <p className="px-4 py-10 text-center text-[12.5px] text-muted-foreground">Nadie coincide con «{q}».</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

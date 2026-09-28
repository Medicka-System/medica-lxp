"use client";

/**
 * Ateneo · Lo social: tarjeta de perfil (cifras clicables), buscar colegas, sugerencias
 * y el perfil de un colega en modal.
 *
 * Las tres cifras (colegas / casos / aportes) son botones: abren la lista correspondiente.
 * Conectar es el único botón teal del rail; «Pendiente» cuando la solicitud ya se envió.
 */

import { useState } from "react";
import { Check, ChevronRight, FileText, MessageSquare, Plus, Search, Users } from "lucide-react";
import type { ListaPerfilData, PerfilResumen } from "./tipos";
import { Avatar, Estudio, Modal, card, focusRing, kicker, mono, softText } from "./ui";

export type ListaPerfil = "colegas" | "casos" | "aportes";

const TITULO_LISTA: Record<ListaPerfil, string> = { casos: "Casos presentados", colegas: "Mis colegas", aportes: "Mis aportes" };

/** Modal con la lista completa de una cifra del perfil propio (A), cargada bajo demanda. */
export function ListaPerfilModal({
  tipo,
  data,
  cargando,
  onCerrar,
  onAbrirCaso,
}: {
  tipo: ListaPerfil;
  data: ListaPerfilData | null;
  cargando: boolean;
  onCerrar: () => void;
  onAbrirCaso: (id: string) => void;
}) {
  const listo = !cargando && data !== null && data.tipo === tipo;
  return (
    <Modal titulo={TITULO_LISTA[tipo]} onCerrar={onCerrar} ancho={520}>
      <div className="px-4 py-4">
        {!listo ? (
          <p className="py-10 text-center text-[12.5px] text-muted-foreground">Cargando…</p>
        ) : data!.tipo === "casos" ? (
          data!.casos.length ? (
            <ul className="flex flex-col gap-2">
              {data!.casos.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onAbrirCaso(c.id)} className={`flex w-full items-center gap-2.5 rounded-[11px] border border-border bg-card p-2.5 text-left hover:border-primary ${focusRing}`}>
                    <span className="w-16 shrink-0 overflow-hidden rounded-[7px]"><Estudio ratio="16 / 10" play={false} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold">{c.titulo}</span>
                      <span className={`${mono} mt-[3px] block text-[10.5px] text-muted-foreground`}>{c.organo} · {c.dominio}</span>
                    </span>
                    {c.validado && <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-accent px-[7px] text-[10px] font-bold text-accent-foreground"><Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.8} />Validado</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[12.5px] text-muted-foreground">Aún no ha presentado casos al Ateneo.</p>
          )
        ) : data!.tipo === "colegas" ? (
          data!.colegas.length ? (
            <ul className="flex flex-col gap-1">
              {data!.colegas.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-[11px] px-2 py-2">
                  <Avatar p={p} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">{p.nombre}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{p.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[12.5px] text-muted-foreground">Aún no tiene colegas. Conecte desde «Buscar colegas».</p>
          )
        ) : data!.aportes.length ? (
          <ul className="flex flex-col gap-2">
            {data!.aportes.map((a) => (
              <li key={a.id} className="flex gap-2.5 rounded-[11px] border border-border bg-card px-3 py-2.5">
                <span aria-hidden className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted ${softText}`}>
                  {a.clase === "comentario" ? <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} /> : <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`${mono} block text-[10px] uppercase tracking-[0.1em] text-muted-foreground`}>{a.clase} · {a.cuando}</span>
                  <span className={`mt-0.5 block text-[12.5px] ${softText}`}>{a.texto || "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-[12.5px] text-muted-foreground">Aún no ha aportado en el Ateneo.</p>
        )}
      </div>
    </Modal>
  );
}

function Cifra({ n, etiqueta, onClick, activa }: { n: number; etiqueta: string; onClick: () => void; activa?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex min-w-0 flex-1 flex-col items-start rounded-[10px] border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-accent ${
        activa ? "border-secondary bg-accent" : "border-transparent"
      } ${focusRing}`}
    >
      <span className={`${mono} text-[18px] font-extrabold`}>{n}</span>
      <span className="mt-0.5 inline-flex items-center gap-[3px] text-[11px] font-semibold text-secondary">
        {etiqueta}
        <ChevronRight aria-hidden className="h-[11px] w-[11px]" strokeWidth={2.4} />
      </span>
    </button>
  );
}

function BotonConectar({ estado, onConectar }: { estado?: PerfilResumen["estadoConexion"]; onConectar: () => void }) {
  if (estado === "colegas")
    return (
      <span className="inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-accent px-3 text-[11.5px] font-bold text-accent-foreground">
        <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
        Colegas
      </span>
    );
  if (estado === "pendiente")
    return (
      <span className="inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-[9px] border border-border bg-muted px-3 text-[11.5px] font-semibold text-muted-foreground">
        Pendiente
      </span>
    );
  return (
    <button type="button" onClick={onConectar} className={`inline-flex h-[34px] shrink-0 items-center gap-[5px] whitespace-nowrap rounded-[9px] bg-primary px-3 text-[11.5px] font-bold text-[color:var(--sidebar)] ${focusRing}`}>
      <Plus aria-hidden className="h-[13px] w-[13px]" strokeWidth={2.4} />
      Conectar
    </button>
  );
}

export function RailSocial({
  yo,
  sugerencias,
  onVerLista,
  onBuscar,
  onAbrirPerfil,
  onConectar,
  onVerTodos,
}: {
  yo: PerfilResumen;
  sugerencias: (PerfilResumen & { motivo: string })[];
  onVerLista: (l: ListaPerfil) => void;
  onBuscar: (q: string) => void;
  onAbrirPerfil: (id: string) => void;
  onConectar: (id: string) => void;
  onVerTodos: () => void;
}) {
  const [q, setQ] = useState("");
  return (
    <aside className="flex min-w-0 flex-col gap-[18px]">
      <section className={`${card} overflow-hidden`}>
        <div className="px-4 pb-3.5 pt-4">
          <span aria-hidden className="grid h-[54px] w-[54px] place-items-center rounded-full bg-sidebar text-[17px] font-bold text-sidebar-foreground">
            {yo.ini}
          </span>
          <p className="mt-2.5 text-[15px] font-bold">{yo.nombre}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{yo.meta}</p>
          <div className="mt-3 flex gap-1 border-t border-border pt-2.5">
            <Cifra n={yo.colegas} etiqueta="colegas" onClick={() => onVerLista("colegas")} />
            <Cifra n={yo.casos} etiqueta="casos" onClick={() => onVerLista("casos")} />
            <Cifra n={yo.aportes} etiqueta="aportes" onClick={() => onVerLista("aportes")} />
          </div>
        </div>
      </section>

      <section className={`${card} p-4`}>
        <p className={`${kicker} text-muted-foreground`}>Buscar colegas</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onBuscar(q);
          }}
        >
          <label className="mt-2.5 flex h-[42px] items-center gap-2 rounded-[10px] border border-border bg-muted px-3 focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar colegas</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, sede o especialidad…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </form>

        <p className="mt-3.5 text-[11.5px] font-semibold">Quizá los conozca</p>
        <ul>
          {sugerencias.map((s) => (
            <li key={s.id} className="mt-3 flex items-center gap-2.5">
              <button type="button" onClick={() => onAbrirPerfil(s.id)} className={`flex min-w-0 flex-1 items-center gap-2.5 text-left ${focusRing}`}>
                <Avatar p={s} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold">{s.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.meta}</span>
                  <span className="block truncate text-[11px] text-secondary">{s.motivo}</span>
                </span>
              </button>
              <BotonConectar estado={s.estadoConexion} onConectar={() => onConectar(s.id)} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={onVerTodos} className={`mt-3 h-9 w-full rounded-[9px] border border-border bg-card text-[12px] font-semibold text-secondary ${focusRing}`}>
          Ver todos los colegas
        </button>
      </section>
    </aside>
  );
}

/* ───────────── perfil de un colega ───────────── */

export function PerfilColega({
  perfil,
  casos,
  onCerrar,
  onConectar,
  onMensaje,
  onAbrirCaso,
}: {
  perfil: PerfilResumen;
  casos: { id: string; titulo: string; meta: string; validado: boolean }[];
  onCerrar: () => void;
  onConectar: (id: string) => void;
  onMensaje: (id: string) => void;
  onAbrirCaso: (id: string) => void;
}) {
  const [lista, setLista] = useState<ListaPerfil>("casos");
  return (
    <Modal titulo={`Perfil de ${perfil.nombre}`} onCerrar={onCerrar} ancho={560}>
      <div className="relative h-[86px]" style={{ background: "var(--sidebar)" }}>
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(120% 160% at 88% 0%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 62%)" }} />
      </div>
      <div className="-mt-[34px] px-[22px] pb-5">
        <span aria-hidden className="grid h-[70px] w-[70px] place-items-center rounded-full border-4 border-card bg-sidebar text-[22px] font-bold text-sidebar-foreground">
          {perfil.ini}
        </span>
        <div className="mt-2.5 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-extrabold">{perfil.nombre}</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{perfil.meta}</p>
            {perfil.enComun && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-secondary">
                <Users aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                {perfil.enComun.total} colegas en común · {perfil.enComun.inis.join(", ")}
                {perfil.enComun.total > perfil.enComun.inis.length ? ` y ${perfil.enComun.total - perfil.enComun.inis.length} más` : ""}
              </p>
            )}
          </div>
          <span className="flex gap-2">
            {perfil.estadoConexion === "colegas" ? (
              <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[13px] font-bold text-accent-foreground">
                <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                Colegas
              </span>
            ) : perfil.estadoConexion === "pendiente" ? (
              <span className="inline-flex h-11 items-center rounded-[10px] border border-border bg-muted px-4 text-[13px] font-semibold text-muted-foreground">
                Solicitud enviada
              </span>
            ) : (
              <button type="button" onClick={() => onConectar(perfil.id)} className={`inline-flex h-11 items-center gap-[7px] rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] ${focusRing}`}>
                <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.4} />
                Conectar
              </button>
            )}
            <button type="button" onClick={() => onMensaje(perfil.id)} aria-label="Enviar mensaje" className={`grid h-11 w-11 place-items-center rounded-[10px] border border-border bg-card text-[color:var(--foreground-soft)] ${focusRing}`}>
              <MessageSquare aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </span>
        </div>

        <div role="tablist" className="mt-[18px] grid grid-cols-3 gap-1.5">
          {(
            [
              ["colegas", perfil.colegas, "colegas"],
              ["casos", perfil.casos, "casos presentados"],
              ["aportes", perfil.aportes, "aportes"],
            ] as const
          ).map(([id, n, t]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={lista === id}
              onClick={() => setLista(id)}
              className={`rounded-[11px] border-[1.5px] px-3 py-2.5 text-left ${lista === id ? "border-secondary bg-accent" : "border-border bg-card"} ${focusRing}`}
            >
              <span className={`${mono} block text-[18px] font-extrabold`}>{n}</span>
              <span className={`mt-0.5 block text-[11.5px] font-semibold ${lista === id ? "text-secondary" : "text-muted-foreground"}`}>{t}</span>
            </button>
          ))}
        </div>

        {lista === "casos" && (
          <ul role="tabpanel" className="mt-3 flex flex-col gap-2">
            {casos.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onAbrirCaso(c.id)} className={`flex w-full items-center gap-2.5 rounded-[11px] border border-border bg-card p-2.5 text-left hover:border-primary ${focusRing}`}>
                  <span className="w-16 shrink-0 overflow-hidden rounded-[7px]">
                    <Estudio ratio="16 / 10" play={false} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold">{c.titulo}</span>
                    <span className={`${mono} mt-[3px] block text-[10.5px] text-muted-foreground`}>{c.meta}</span>
                  </span>
                  {c.validado && (
                    <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-accent px-[7px] text-[10px] font-bold text-accent-foreground">
                      <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.8} />
                      Validado
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {lista !== "casos" && (
          <p role="tabpanel" className="mt-3 rounded-[11px] border border-border bg-muted px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Lista de {lista} — se carga bajo demanda.
          </p>
        )}
      </div>
    </Modal>
  );
}

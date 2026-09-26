"use client";

/**
 * Campus · Ateneo — red social médica del alumno (página general)
 *
 * Comunidad ABIERTA de todo el campus (el foro de la lección es cerrado por grupo).
 * Vive dentro del shell del campus: app/(campus)/layout.tsx aporta sidebar navy + header.
 *
 * Composición:
 *   EntradaComposer  → abre ComposerModal en el modo elegido
 *   Pestañas         → Todo el Ateneo / Mis colegas  +  filtro por tipo
 *   PostCard[]       → los cinco tipos, con interacciones y preview de comentarios
 *   RailSocial       → perfil con cifras clicables, buscar colegas, sugerencias
 *   DetallePost      → modal al comentar
 *   PerfilColega     → modal al abrir un colega
 *
 * Stubs para cablear: onPublicar · onReaccionar · onComentar · onCompartir · onVotar ·
 * onAbrirCaso · onBuscarColegas · onConectar · onVerLista · onMensaje
 */

import { useMemo, useState } from "react";
import { ComposerModal, EntradaComposer, type BorradorPost } from "./_components/Composer";
import { DetallePost } from "./_components/DetallePost";
import { PostCard } from "./_components/PostCard";
import { PerfilColega, RailSocial, type ListaPerfil } from "./_components/Social";
import { HILO_MOCK, MOCK, type AteneoData, type ModoComposer, type Post, type TipoReaccion } from "./_components/tipos";
import { focusRing, mono } from "./_components/ui";

type Feed = "global" | "colegas";
type Filtro = "todo" | "caso" | "pregunta" | "encuesta";

export default function Ateneo({ data = MOCK }: { data?: AteneoData }) {
  const { yo, misCasos, sugerencias, colegasConPosts } = data;
  const [posts, setPosts] = useState<Post[]>(data.posts);
  const [feed, setFeed] = useState<Feed>("global");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [composer, setComposer] = useState<ModoComposer | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  /* ── Stubs: sustituir por llamadas a la API ───────────── */
  const onPublicar = (_b: BorradorPost) => setComposer(null);
  const onComentar = (_postId: string, _texto: string, _parentId?: string) => {};
  const onCompartir = (_id: string) => {};
  const onAbrirCaso = (_casoId: string) => {};
  const onBuscarColegas = (_q: string) => {};
  const onConectar = (_id: string) => {};
  const onVerLista = (_l: ListaPerfil) => {};
  const onMensaje = (_id: string) => {};

  /* reacción y voto con actualización optimista */
  const onReaccionar = (id: string, r: TipoReaccion | null) =>
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const antes = p.reacciones.mia;
        const total = p.reacciones.total + (r && !antes ? 1 : !r && antes ? -1 : 0);
        return { ...p, reacciones: { ...p.reacciones, mia: r ?? undefined, total } };
      }),
    );
  const onVotar = (postId: string, opcionId: string) =>
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== postId || p.tipo !== "encuesta") return p;
        const opciones = p.opciones.map((o) => ({
          ...o,
          votos: o.votos + (o.id === opcionId ? 1 : 0) - (o.id === p.miVoto ? 1 : 0),
        }));
        return { ...p, opciones, miVoto: opcionId };
      }),
    );
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(
    () =>
      posts.filter(
        (p) => (filtro === "todo" || p.tipo === filtro) && (feed === "global" || p.autor.id !== yo.id),
      ),
    [posts, filtro, feed, yo.id],
  );

  const postAbierto = posts.find((p) => p.id === abierto);
  const perfil = sugerencias.find((s) => s.id === perfilId);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-7 sm:px-6 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0">
          <EntradaComposer yo={yo} onAbrir={setComposer} />

          {/* feeds + filtro por tipo */}
          <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="Feed" className="flex gap-1 rounded-full border border-border bg-card p-1">
              {(
                [
                  ["global", "Todo el Ateneo"],
                  ["colegas", "Mis colegas"],
                ] as const
              ).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={feed === id}
                  onClick={() => setFeed(id)}
                  className={`inline-flex h-[38px] items-center gap-[7px] rounded-full px-[18px] text-[13px] transition-colors ${
                    feed === id ? "bg-sidebar font-bold text-sidebar-foreground" : "font-semibold text-muted-foreground"
                  } ${focusRing}`}
                >
                  {t}
                  {id === "colegas" && colegasConPosts > 0 && (
                    <span className={`${mono} grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-[5px] text-[10px] font-bold text-[color:var(--sidebar)]`}>
                      {colegasConPosts}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="ml-auto flex flex-wrap gap-1.5">
              {(
                [
                  ["todo", "Todo"],
                  ["caso", "Casos"],
                  ["pregunta", "Preguntas"],
                  ["encuesta", "Encuestas"],
                ] as const
              ).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filtro === id}
                  onClick={() => setFiltro(id)}
                  className={`h-[34px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${
                    filtro === id ? "border-transparent bg-accent text-accent-foreground" : "border-border bg-card text-[color:var(--foreground-soft)]"
                  } ${focusRing}`}
                >
                  {t}
                </button>
              ))}
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-4">
            {visibles.map((p) => (
              <li key={p.id}>
                <PostCard
                  post={p}
                  yo={yo}
                  onAbrir={setAbierto}
                  onReaccionar={onReaccionar}
                  onCompartir={onCompartir}
                  onVotar={onVotar}
                  onAbrirCaso={onAbrirCaso}
                />
              </li>
            ))}
          </ul>

          {visibles.length === 0 && (
            <div className="mt-4 rounded-[14px] border border-border bg-card px-6 py-10 text-center">
              <p className="text-[14.5px] font-bold">Nada por aquí todavía</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
                {feed === "colegas" ? "Sus colegas aún no publican con este filtro. Pruebe «Todo el Ateneo»." : "Cambie el filtro o sea el primero en publicar."}
              </p>
            </div>
          )}
        </div>

        <RailSocial
          yo={yo}
          sugerencias={sugerencias}
          onVerLista={onVerLista}
          onBuscar={onBuscarColegas}
          onAbrirPerfil={setPerfilId}
          onConectar={onConectar}
          onVerTodos={() => onBuscarColegas("")}
        />
      </div>

      {composer && (
        <ComposerModal yo={yo} modoInicial={composer} misCasos={misCasos} onCerrar={() => setComposer(null)} onPublicar={onPublicar} />
      )}

      {postAbierto && (
        <DetallePost
          post={postAbierto}
          hilo={HILO_MOCK}
          yo={yo}
          onCerrar={() => setAbierto(null)}
          onReaccionar={onReaccionar}
          onCompartir={onCompartir}
          onVotar={onVotar}
          onAbrirCaso={onAbrirCaso}
          onComentar={onComentar}
        />
      )}

      {perfil && (
        <PerfilColega
          perfil={perfil}
          casos={[
            { id: "r1", titulo: "Trombosis de vena renal en Doppler color", meta: "hace 3 días · 38 útiles · 12 comentarios", validado: true },
            { id: "r2", titulo: "Riñón en herradura, hallazgo incidental", meta: "hace 2 semanas · 21 útiles", validado: true },
            { id: "r3", titulo: "Quiste complejo Bosniak IIF", meta: "hace 1 mes · 17 útiles", validado: false },
          ]}
          onCerrar={() => setPerfilId(null)}
          onConectar={onConectar}
          onMensaje={onMensaje}
          onAbrirCaso={onAbrirCaso}
        />
      )}
    </div>
  );
}

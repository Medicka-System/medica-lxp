"use client";

/**
 * Ateneo · Post del feed (los cinco tipos) + barra de interacciones + preview de comentarios
 *
 * Cada tipo se distingue por FORMA, no solo por color:
 *   caso      → franja teal superior, chip sólido, estudio a ancho completo con etiquetas. El más grande.
 *   pregunta  → borde izquierdo ámbar, la pregunta en su propia caja y llamado «Aún sin respuesta».
 *   encuesta  → votable ahí mismo; barra que se llena y palomita en la opción propia.
 *   media     → mosaico (1 grande + 2) o reproductor.
 *   texto     → el caso base.
 */

import { useState } from "react";
import {
  BarChart3,
  Check,
  CircleHelp,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  ScanLine,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { REACCIONES } from "./tipos";
import type { Comentario, Persona, Post, PostEncuesta, TipoReaccion } from "./tipos";
import { Avatar, Chip, ChipDocente, Estudio, card, focusRing, mono, softText } from "./ui";

/* ───────────── selector de reacciones (hover / long-press) ───────────── */

export function SelectorReacciones({
  actual,
  onElegir,
}: {
  actual?: TipoReaccion;
  onElegir: (r: TipoReaccion) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Reacciones"
      className="flex gap-0.5 rounded-full border border-border bg-card p-1.5 shadow-[0_10px_26px_rgba(17,24,39,0.16)]"
    >
      {(Object.keys(REACCIONES) as TipoReaccion[]).map((k) => {
        const r = REACCIONES[k];
        const on = actual === k;
        return (
          <button
            key={k}
            type="button"
            role="menuitem"
            title={r.etiqueta}
            onClick={() => onElegir(k)}
            className={`flex w-[58px] flex-col items-center gap-0.5 rounded-xl pb-[3px] pt-[5px] transition-transform hover:scale-110 ${
              on ? "bg-accent" : ""
            } ${focusRing}`}
          >
            <span aria-hidden className="text-[24px] leading-none">{r.emoji}</span>
            <span className={`whitespace-nowrap text-[9.5px] font-semibold ${on ? "text-accent-foreground" : "text-muted-foreground"}`}>
              {r.etiqueta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── barra de interacciones ───────────── */

export function BarraInteracciones({
  post,
  onReaccionar,
  onComentar,
  onCompartir,
}: {
  post: Post;
  onReaccionar: (id: string, r: TipoReaccion | null) => void;
  onComentar: (id: string) => void;
  onCompartir: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const mia = post.reacciones.mia;

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <span className="flex items-center">
          <span className="flex">
            {post.reacciones.top.map((k, i) => (
              <span
                key={k}
                aria-hidden
                className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-card text-[11px] ${i ? "-ml-1.5" : ""}`}
                style={{ background: REACCIONES[k].fondo }}
              >
                {REACCIONES[k].emoji}
              </span>
            ))}
          </span>
          <span className={`${mono} ml-[7px] text-[12px] text-muted-foreground`}>{post.reacciones.total}</span>
        </span>
        <button type="button" onClick={() => onComentar(post.id)} className={`ml-auto text-[12px] text-muted-foreground hover:underline ${focusRing}`}>
          {post.comentarios} comentarios · {post.compartidos} compartidos
        </button>
      </div>

      <div className="relative mt-2.5 grid grid-cols-3 gap-1 border-t border-border pt-1.5">
        {abierto && (
          <div className="absolute bottom-12 left-0 z-10" onMouseLeave={() => setAbierto(false)}>
            <SelectorReacciones
              actual={mia}
              onElegir={(r) => {
                onReaccionar(post.id, r === mia ? null : r);
                setAbierto(false);
              }}
            />
          </div>
        )}
        <button
          type="button"
          aria-pressed={!!mia}
          aria-haspopup="menu"
          onClick={() => onReaccionar(post.id, mia ? null : "util")}
          onMouseEnter={() => setAbierto(true)}
          onContextMenu={(e) => {
            e.preventDefault();
            setAbierto(true);
          }}
          className={`inline-flex h-10 items-center justify-center gap-[7px] rounded-[9px] text-[13px] transition-colors hover:bg-muted ${
            mia ? "font-bold text-secondary" : `font-semibold ${softText}`
          } ${focusRing}`}
        >
          {mia ? <span aria-hidden className="text-[15px]">{REACCIONES[mia].emoji}</span> : <ThumbsUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          {mia ? REACCIONES[mia].etiqueta : "Reaccionar"}
        </button>
        <button type="button" onClick={() => onComentar(post.id)} className={`inline-flex h-10 items-center justify-center gap-[7px] rounded-[9px] text-[13px] font-semibold ${softText} transition-colors hover:bg-muted ${focusRing}`}>
          <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Comentar
        </button>
        <button type="button" onClick={() => onCompartir(post.id)} className={`inline-flex h-10 items-center justify-center gap-[7px] rounded-[9px] text-[13px] font-semibold ${softText} transition-colors hover:bg-muted ${focusRing}`}>
          <Share2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Compartir
        </button>
      </div>
    </>
  );
}

/* ───────────── preview de comentarios ───────────── */

export function PreviewComentarios({
  lista,
  total,
  yo,
  onVerTodos,
}: {
  lista: Comentario[];
  total: number;
  yo: Persona;
  onVerTodos: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {lista.slice(0, 3).map((c) => (
        <div key={c.id} className="flex gap-2.5">
          <Avatar p={c.autor} size={30} />
          <div className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2">
            <p className={`text-[12.5px] leading-relaxed ${softText}`}>
              <span className="font-bold text-foreground">{c.autor.nombre.replace(/^Dra?\. /, "")}</span>{" "}
              {c.autor.rol === "docente" && <ChipDocente />} {c.texto}
            </p>
          </div>
        </div>
      ))}
      {total > lista.length && (
        <button type="button" onClick={onVerTodos} className={`self-start text-[12.5px] font-semibold text-secondary ${focusRing}`}>
          Ver los {total} comentarios
        </button>
      )}
      <button type="button" onClick={onVerTodos} className={`flex items-center gap-2.5 text-left ${focusRing}`}>
        <Avatar p={yo} size={30} />
        <span className="flex h-10 flex-1 items-center rounded-full border border-border bg-card px-3.5 text-[12.5px] text-muted-foreground">
          Escriba un comentario…
        </span>
      </button>
    </div>
  );
}

/* ───────────── cabecera común ───────────── */

function Cabecera({ post, chip, onAbrirPerfil }: { post: Post; chip?: React.ReactNode; onAbrirPerfil?: (id: string) => void }) {
  const abrir = onAbrirPerfil ? () => onAbrirPerfil(post.autor.id) : undefined;
  return (
    <div className="flex items-center gap-3">
      {abrir ? (
        <button type="button" onClick={abrir} aria-label={`Ver perfil de ${post.autor.nombre}`} className={`shrink-0 rounded-full ${focusRing}`}>
          <Avatar p={post.autor} size={42} />
        </button>
      ) : (
        <Avatar p={post.autor} size={42} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {abrir ? (
            <button type="button" onClick={abrir} className={`text-[14px] font-bold hover:underline ${focusRing}`}>{post.autor.nombre}</button>
          ) : (
            <span className="text-[14px] font-bold">{post.autor.nombre}</span>
          )}
          {post.autor.rol === "docente" && <ChipDocente />}
          {chip}
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {post.autor.meta} · {post.cuando}
        </p>
      </div>
      <button type="button" aria-label="Más opciones" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}>
        <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ───────────── encuesta votable ───────────── */

function Encuesta({ post, onVotar }: { post: PostEncuesta; onVotar: (postId: string, opcionId: string) => void }) {
  const total = post.opciones.reduce((s, o) => s + o.votos, 0);
  return (
    <>
      <p className="mt-3.5 text-[16px] font-bold leading-snug">{post.pregunta}</p>
      <div role="radiogroup" aria-label={post.pregunta} className="mt-3 flex flex-col gap-2">
        {post.opciones.map((o) => {
          const pct = total ? Math.round((o.votos / total) * 100) : 0;
          const mia = post.miVoto === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={mia}
              onClick={() => onVotar(post.id, o.id)}
              className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-[11px] border-[1.5px] bg-card px-3.5 py-3 text-left ${
                mia ? "border-secondary" : "border-border"
              } ${focusRing}`}
            >
              {post.miVoto && (
                <span aria-hidden className={`absolute inset-y-0 left-0 ${mia ? "bg-accent" : "bg-muted"}`} style={{ width: `${pct}%` }} />
              )}
              <span
                aria-hidden
                className={`relative grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
                  mia ? "border-secondary bg-secondary text-white" : "border-[color:var(--track)] bg-card"
                }`}
              >
                {mia && <Check className="h-2.5 w-2.5" strokeWidth={3.4} />}
              </span>
              <span className={`relative flex-1 text-[13.5px] ${mia ? "font-bold" : "font-medium"}`}>{o.texto}</span>
              {post.miVoto && (
                <span className={`${mono} relative text-[13px] font-bold ${mia ? "text-secondary" : "text-muted-foreground"}`}>{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
      <p className={`${mono} mt-2.5 text-[11.5px] text-muted-foreground`}>
        {total} votos · {post.cierra}
        {post.miVoto ? " · usted votó · puede cambiar su voto" : ""}
      </p>
    </>
  );
}

/* ───────────── el post ───────────── */

export function PostCard({
  post,
  yo,
  onAbrir,
  onReaccionar,
  onCompartir,
  onVotar,
  onAbrirCaso,
  onAbrirPerfil,
  visorCaso,
}: {
  post: Post;
  yo: Persona;
  onAbrir: (id: string) => void;
  onReaccionar: (id: string, r: TipoReaccion | null) => void;
  onCompartir: (id: string) => void;
  onVotar: (postId: string, opcionId: string) => void;
  onAbrirCaso: (casoId: string) => void;
  /** Abre el perfil del autor (C). Opcional: sin él, la cabecera no es clicable. */
  onAbrirPerfil?: (userId: string) => void;
  /** Visor DICOM real embebido (solo en el detalle): reemplaza el placeholder. */
  visorCaso?: React.ReactNode;
}) {
  const interacciones = (
    <BarraInteracciones post={post} onReaccionar={onReaccionar} onComentar={onAbrir} onCompartir={onCompartir} />
  );
  const preview =
    post.preview.length > 0 ? (
      <PreviewComentarios lista={post.preview} total={post.comentarios} yo={yo} onVerTodos={() => onAbrir(post.id)} />
    ) : null;

  if (post.tipo === "caso")
    return (
      <article className={`${card} overflow-hidden`}>
        <div aria-hidden className="h-[5px] bg-secondary" />
        <div className="px-5 py-[18px]">
          <Cabecera onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="caso" icono={<ScanLine aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Caso presentado</Chip>} />
          <p className="mt-3.5 text-[16.5px] font-bold leading-snug" style={{ textWrap: "pretty" }}>{post.titulo}</p>
          <p className={`mt-1.5 text-[13.5px] leading-relaxed ${softText}`}>{post.texto}</p>
          {visorCaso ? (
            // En el detalle: el visor DICOM real (Cornerstone3D), no el placeholder.
            <div className="mt-3.5">
              {visorCaso}
              <span className="mt-3 flex flex-wrap items-center gap-2.5">
                <Chip tono="teal">{post.caso.area} · {post.caso.organo}</Chip>
                <Chip tono="teal">{post.caso.dominio}</Chip>
              </span>
            </div>
          ) : (
            <button type="button" onClick={() => onAbrirCaso(post.caso.id)} className={`mt-3.5 block w-full overflow-hidden rounded-xl border border-border text-left ${focusRing}`}>
              <Estudio
                poster={post.caso.poster}
                etiqueta={`${post.caso.organo.toLowerCase()} · ${post.caso.area.toLowerCase()}`}
                badge={`${post.caso.piezas} piezas${post.caso.loops ? ` · ${post.caso.loops} loop` : ""}`}
              />
              <span className="flex flex-wrap items-center gap-2.5 bg-accent px-3.5 py-2.5">
                <Chip tono="teal">{post.caso.area} · {post.caso.organo}</Chip>
                <Chip tono="teal">{post.caso.dominio}</Chip>
                <span className="ml-auto text-[12px] font-semibold text-secondary">Abrir en el visor →</span>
              </span>
            </button>
          )}
          {interacciones}
          {preview}
        </div>
      </article>
    );

  if (post.tipo === "pregunta") {
    const sinResp = post.comentarios === 0;
    return (
      <article className={`${card} border-l-4 border-l-[color:var(--warning)] py-[18px] pl-[18px] pr-5`}>
        <Cabecera onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="pregunta" icono={<CircleHelp aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Pregunta</Chip>} />
        <div className="mt-3.5 rounded-xl bg-[color:var(--warning-surface)] px-[18px] py-4">
          <p className="text-[17px] font-bold leading-snug" style={{ textWrap: "pretty" }}>{post.pregunta}</p>
          {post.contexto && <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>{post.contexto}</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className="text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
            {sinResp ? "Aún sin respuesta" : `${post.comentarios} respuestas`} · {post.seguidores} colegas la siguen
          </span>
          <button type="button" onClick={() => onAbrir(post.id)} className={`ml-auto h-10 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white ${focusRing}`}>
            Responder
          </button>
        </div>
        {interacciones}
        {preview}
      </article>
    );
  }

  if (post.tipo === "encuesta")
    return (
      <article className={`${card} px-5 py-[18px]`}>
        <Cabecera onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="encuesta" icono={<BarChart3 aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Encuesta</Chip>} />
        <Encuesta post={post} onVotar={onVotar} />
        {interacciones}
        {preview}
      </article>
    );

  if (post.tipo === "media") {
    const [a, ...resto] = post.piezas ?? [];
    return (
      <article className={`${card} px-5 py-[18px]`}>
        <Cabecera onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip icono={<ImageIcon aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>{post.piezas.length} {post.piezas.length === 1 ? "pieza" : "piezas"}</Chip>} />
        <p className={`mt-3.5 text-[14px] leading-relaxed ${softText}`}>{post.texto}</p>
        {/* Grilla de medios: SOLO si hay al menos una pieza (si no, el post queda como texto). */}
        {a && (
          <button type="button" onClick={() => onAbrir(post.id)} className={`mt-3 grid h-[250px] w-full gap-1.5 overflow-hidden rounded-[10px] ${resto.length ? "grid-cols-[2fr_1fr] grid-rows-2" : ""} ${focusRing}`}>
            <span className={`overflow-hidden rounded-[10px] ${resto.length ? "row-span-2" : ""}`}>
              <Estudio ratio="auto" poster={a.src} play={a.tipo === "video"} />
            </span>
            {resto.slice(0, 2).map((p, i) => (
              <span key={i} className="overflow-hidden rounded-[10px]">
                <Estudio ratio="auto" poster={p.src} play={p.tipo === "video"} tamanoPlay={40} />
              </span>
            ))}
          </button>
        )}
        {interacciones}
        {preview}
      </article>
    );
  }

  return (
    <article className={`${card} px-5 py-[18px]`}>
      <Cabecera onAbrirPerfil={onAbrirPerfil} post={post} />
      <p className={`mt-3.5 text-[14.5px] leading-[1.7] ${softText}`} style={{ textWrap: "pretty" }}>{post.texto}</p>
      {interacciones}
      {preview}
    </article>
  );
}

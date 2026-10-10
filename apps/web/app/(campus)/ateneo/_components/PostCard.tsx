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

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  CircleHelp,
  Copy,
  EyeOff,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  ScanLine,
  Share2,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { REACCIONES } from "./tipos";
import type { Comentario, EnlacePreview, Persona, Post, PostEncuesta, TipoReaccion } from "./tipos";
import { EmojiReaccion } from "./EmojiReaccion";
import { ComentarioTexto } from "./ComentarioTexto";
import { Avatar, Chip, ChipDocente, Estudio, Modal, card, focusRing, mono, softText } from "./ui";
import { EstudioCaso } from "./EstudioCaso";
import { capaOverlay } from "@/components/ui/overlay";
import { editarPostAteneo, eliminarPostAteneo } from "@/lib/campus/ateneo-social-acciones";

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
            <EmojiReaccion tipo={k} size={32} />
            <span className={`whitespace-nowrap text-[9.5px] font-semibold ${on ? "text-accent-foreground" : "text-muted-foreground"}`}>
              {r.etiqueta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── tarjeta de enlace (OpenGraph) ───────────── */

/**
 * Tarjeta de previsualización de un enlace. Renderiza el SNAPSHOT `post.enlace` guardado al
 * publicar (no re-fetchea → sin SSRF en lectura, estable si el link cambia). Separada del grid
 * de media. La og:image es pública y https → se muestra con <img>.
 */
function EnlaceCard({ e }: { e: EnlacePreview }) {
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`mt-3 flex overflow-hidden rounded-[11px] border border-border bg-card transition-colors hover:bg-accent ${focusRing}`}
    >
      {e.imagen && (
        <img src={e.imagen} alt="" loading="lazy" className="h-[92px] w-[92px] shrink-0 bg-muted object-cover sm:h-[104px] sm:w-[128px]" />
      )}
      <div className="min-w-0 flex-1 px-3.5 py-2.5">
        {e.sitio && <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{e.sitio}</p>}
        {e.titulo && <p className="mt-0.5 line-clamp-2 text-[13.5px] font-bold leading-snug text-foreground">{e.titulo}</p>}
        {e.descripcion && <p className={`mt-1 line-clamp-2 text-[12px] leading-relaxed ${softText}`}>{e.descripcion}</p>}
      </div>
    </a>
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
  const popRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Picker por CLICK/TAP (hover no existe en táctil y dejaba el menú colgado). Cierra por:
  // seleccionar, clic fuera o Esc. Estado `abierto` controlado; Esc devuelve el foco al botón.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !botonRef.current?.contains(t)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <>
      {/* Resumen (estilo FB): la fila de conteos solo aparece si HAY algo que contar.
          Sin reacciones ni comentarios ni compartidos → no se dibuja nada (antes salía un "0"
          suelto con la fila de emojis vacía). */}
      {(post.reacciones.total > 0 || post.comentarios > 0 || post.compartidos > 0) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          {post.reacciones.total > 0 && (
            <span className="flex items-center">
              <span className="flex">
                {post.reacciones.top.map((k, i) => (
                  <span
                    key={k}
                    aria-hidden
                    className={`grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card ${i ? "-ml-1.5" : ""}`}
                    style={{ background: REACCIONES[k].fondo }}
                  >
                    <EmojiReaccion tipo={k} size={17} animar={false} />
                  </span>
                ))}
              </span>
              <span className={`${mono} ml-[7px] text-[12px] text-muted-foreground`}>{post.reacciones.total}</span>
            </span>
          )}
          {(post.comentarios > 0 || post.compartidos > 0) && (
            <button type="button" onClick={() => onComentar(post.id)} className={`ml-auto text-[12px] text-muted-foreground hover:underline ${focusRing}`}>
              {[
                post.comentarios > 0 ? `${post.comentarios} ${post.comentarios === 1 ? "comentario" : "comentarios"}` : null,
                post.compartidos > 0 ? `${post.compartidos} ${post.compartidos === 1 ? "compartido" : "compartidos"}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </button>
          )}
        </div>
      )}

      <div className="relative mt-2.5 grid grid-cols-3 gap-1 border-t border-border pt-1.5">
        {/* Overlay del picker: montado siempre y conmutado por `data-open` para animar
            entrada Y salida (§5A · primitivo Overlay). `display:none` al cerrar lo saca
            del foco y del árbol de accesibilidad. */}
        <div ref={popRef} data-open={abierto} className={`${capaOverlay} absolute bottom-12 left-0 z-10`}>
          <SelectorReacciones
            actual={mia}
            onElegir={(r) => {
              onReaccionar(post.id, r === mia ? null : r);
              setAbierto(false);
            }}
          />
        </div>
        <button
          ref={botonRef}
          type="button"
          aria-pressed={!!mia}
          aria-haspopup="menu"
          aria-expanded={abierto}
          onClick={() => setAbierto((o) => !o)}
          className={`inline-flex h-10 items-center justify-center gap-[7px] rounded-[9px] text-[13px] transition-colors hover:bg-muted ${
            mia ? "font-bold text-secondary" : `font-semibold ${softText}`
          } ${focusRing}`}
        >
          {mia ? <EmojiReaccion tipo={mia} size={22} /> : <ThumbsUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
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
  onAbrirPerfil,
}: {
  lista: Comentario[];
  total: number;
  yo: Persona;
  onVerTodos: () => void;
  onAbrirPerfil?: (userId: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {lista.slice(0, 3).map((c) => {
        // Comentario-GIF (cuerpo = URL de Giphy): miniatura en vez de la URL cruda.
        const gif = /^https:\/\/[a-z0-9.-]*giphy\.com\/\S+$/i.test((c.texto ?? "").trim()) ? c.texto.trim() : null;
        return (
          <div key={c.id} className="flex gap-2.5">
            <Avatar p={c.autor} url={c.autor.avatarUrl} size={30} />
            <div className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2">
              <p className={`text-[12.5px] leading-relaxed ${softText}`}>
                <span className="font-bold text-foreground">{c.autor.nombre.replace(/^Dra?\. /, "")}</span>{" "}
                {c.autor.rol === "docente" && <ChipDocente />} {gif ? <span className="font-semibold text-secondary">GIF</span> : <ComentarioTexto cuerpo={c.texto} onAbrirPerfil={onAbrirPerfil} />}
              </p>
              {gif && (
                <img src={gif} alt="GIF" loading="lazy" className="mt-1.5 max-h-24 rounded-lg bg-black object-contain" />
              )}
            </div>
          </div>
        );
      })}
      {total > lista.length && (
        <button type="button" onClick={onVerTodos} className={`self-start text-[12.5px] font-semibold text-secondary ${focusRing}`}>
          Ver los {total} comentarios
        </button>
      )}
      <button type="button" onClick={onVerTodos} className={`flex items-center gap-2.5 text-left ${focusRing}`}>
        <Avatar p={yo} url={yo.avatarUrl} size={30} />
        <span className="flex h-10 flex-1 items-center rounded-full border border-border bg-card px-3.5 text-[12.5px] text-muted-foreground">
          Escriba un comentario…
        </span>
      </button>
    </div>
  );
}

/* ───────────── menú ⋯ del post ───────────── */

/**
 * Menú de opciones del post. Por autoría (§ red social): el AUTOR edita/elimina su post; sobre
 * el ajeno solo se puede copiar el enlace u ocultarlo. Sin "Reportar" (no hay flujo de moderación
 * abierta aquí — la validación clínica vive en el caso de origen, no en el post). Cierra por
 * seleccionar, clic afuera o Esc.
 */
function MenuPost({
  esPropio,
  onEditar,
  onEliminar,
  onCopiar,
  onOcultar,
}: {
  esPropio: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onCopiar: () => void;
  onOcultar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const item = (Icono: typeof MoreHorizontal, texto: string, onClick: () => void, destructivo = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setAbierto(false);
        onClick();
      }}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-muted ${
        destructivo ? "text-[color:var(--destructive)]" : "text-foreground"
      } ${focusRing}`}
    >
      <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
      {texto}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={botonRef}
        type="button"
        aria-label="Más opciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((o) => !o)}
        className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
      >
        <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {/* Menú montado siempre; `data-open` anima su aparición/desaparición (primitivo Overlay). */}
      <div
        role="menu"
        data-open={abierto}
        className={`${capaOverlay} absolute right-0 top-[calc(100%+4px)] z-20 w-[188px] rounded-[11px] border border-border bg-card p-1.5 shadow-[0_10px_26px_rgba(17,24,39,0.16)]`}
      >
        {esPropio ? (
          <>
            {item(Pencil, "Editar", onEditar)}
            {item(Trash2, "Eliminar", onEliminar, true)}
          </>
        ) : (
          <>
            {item(Copy, "Copiar enlace", onCopiar)}
            {item(EyeOff, "Ocultar", onOcultar)}
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────── cabecera común ───────────── */

function Cabecera({ post, chip, onAbrirPerfil, menu }: { post: Post; chip?: React.ReactNode; onAbrirPerfil?: (id: string) => void; menu?: React.ReactNode }) {
  const abrir = onAbrirPerfil ? () => onAbrirPerfil(post.autor.id) : undefined;
  return (
    <div className="flex items-center gap-3">
      {abrir ? (
        <button type="button" onClick={abrir} aria-label={`Ver perfil de ${post.autor.nombre}`} className={`shrink-0 rounded-full ${focusRing}`}>
          <Avatar p={post.autor} url={post.autor.avatarUrl} size={42} />
        </button>
      ) : (
        <Avatar p={post.autor} url={post.autor.avatarUrl} size={42} />
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
      {menu}
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

/* ───────────── editar el texto del post (menú ⋯ · autor) ───────────── */

function EditarPostModal({
  inicial,
  guardando,
  onGuardar,
  onCerrar,
}: {
  inicial: string;
  guardando: boolean;
  onGuardar: (t: string) => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState(inicial);
  return (
    <Modal
      titulo="Editar publicación"
      onCerrar={onCerrar}
      ancho={520}
      pie={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className={`h-10 rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold ${softText} ${focusRing}`}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando || !texto.trim()}
            onClick={() => onGuardar(texto)}
            className={`h-10 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] disabled:opacity-60 ${focusRing}`}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <div className="px-5 py-4">
        <label className="block">
          <span className="sr-only">Texto de la publicación</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            autoFocus
            className={`w-full resize-none rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none focus:border-secondary ${focusRing}`}
          />
        </label>
      </div>
    </Modal>
  );
}

/* ───────────── imagen de media (estilo FB) ─────────────
 * FEED: aspecto NATURAL de la imagen con TOPE 4:5 (alto máx = ancho × 1.25). Horizontal /
 * cuadrada / vertical ≤ 4:5 → completas, SIN recorte. Más altas que 4:5 → se topan a 4:5 con
 * `object-cover` (solo esas). La relación natural se lee en `onLoad` (no la sabemos en SSR).
 * DETALLE: imagen COMPLETA (object-contain) con tope de alto por viewport — NUNCA cortada. */
/** Pieza de media con derivados responsivos opcionales (Fase 2). */
type PiezaMedia = { tipo: "imagen" | "video" | "gif"; src?: string; srcset?: { w: number; url: string }[] };

/** `srcset` string a partir de los derivados firmados, o `undefined` si no hay. */
function srcSetDe(srcset?: { w: number; url: string }[]): string | undefined {
  return srcset && srcset.length ? srcset.map((s) => `${s.url} ${s.w}w`).join(", ") : undefined;
}

function ImagenMedia({ src, srcset, enDetalle, onAbrir }: { src: string; srcset?: { w: number; url: string }[]; enDetalle: boolean; onAbrir: () => void }) {
  const [capada, setCapada] = useState(false);
  // Fase 2: `srcset` de derivados webp; si uno falla (viejo/sin backfill) → `onError` lo desactiva
  // y el navegador recae en `src` (original). `sizes` = ancho real de la columna del feed.
  const [sinDeriv, setSinDeriv] = useState(false);
  const ss = sinDeriv ? undefined : srcSetDe(srcset);
  const sizes = ss ? (enDetalle ? "100vw" : "(max-width: 680px) 100vw, 600px") : undefined;
  const onError = () => { if (ss) setSinDeriv(true); };
  if (enDetalle) {
    return <img src={src} srcSet={ss} sizes={sizes} onError={onError} alt="" className="mx-auto max-h-[78vh] w-auto max-w-full rounded-[10px] bg-black object-contain" />;
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`block w-full overflow-hidden rounded-[10px] bg-black ${capada ? "aspect-[4/5]" : ""} ${focusRing}`}
    >
      <img
        src={src}
        srcSet={ss}
        sizes={sizes}
        onError={onError}
        alt=""
        loading="lazy"
        onLoad={(e) => {
          const t = e.currentTarget;
          if (t.naturalWidth && t.naturalHeight > t.naturalWidth * 1.25) setCapada(true);
        }}
        className={capada ? "h-full w-full object-cover" : "block h-auto w-full"}
      />
    </button>
  );
}

/** `<img>` de celda de mosaico con derivados + fallback al original (Fase 2). */
function ImgMosaico({ src, srcset, className }: { src: string; srcset?: { w: number; url: string }[]; className: string }) {
  const [sinDeriv, setSinDeriv] = useState(false);
  const ss = sinDeriv ? undefined : srcSetDe(srcset);
  return (
    <img
      src={src}
      srcSet={ss}
      sizes={ss ? "(max-width: 680px) 50vw, 300px" : undefined}
      onError={() => { if (ss) setSinDeriv(true); }}
      alt=""
      loading="lazy"
      className={className}
    />
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
  onAbrirPerfil,
  visorCaso,
  pedagogiaCaso,
  enDetalle = false,
}: {
  post: Post;
  yo: Persona;
  onAbrir: (id: string) => void;
  onReaccionar: (id: string, r: TipoReaccion | null) => void;
  onCompartir: (id: string) => void;
  onVotar: (postId: string, opcionId: string) => void;
  /** Abre el perfil del autor (C). Opcional: sin él, la cabecera no es clicable. */
  onAbrirPerfil?: (userId: string) => void;
  /** Visor DICOM real embebido (solo en el detalle): reemplaza el placeholder. */
  visorCaso?: React.ReactNode;
  /** Bloque pedagógico (viñeta/hallazgos/diagnóstico · solo en el detalle), debajo del visor. */
  pedagogiaCaso?: React.ReactNode;
  /** En el DETALLE la imagen única se muestra COMPLETA (sin recorte); en el feed, con tope 4:5. */
  enDetalle?: boolean;
}) {
  // Menú ⋯ (B4): edición/eliminación son del AUTOR; copiar/ocultar sobre el ajeno.
  const esPropio = post.autor.id === yo.id;
  const [oculto, setOculto] = useState<null | "oculto" | "eliminado">(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Override local del texto tras editar (evita re-cargar el feed para ver el cambio).
  const [textoLocal, setTextoLocal] = useState<string | null>(null);

  // Texto principal editable: enunciado (pregunta/encuesta) o cuerpo/caption (el resto).
  const textoEditable =
    post.tipo === "pregunta" || post.tipo === "encuesta"
      ? post.pregunta
      : post.tipo === "texto" || post.tipo === "caso" || post.tipo === "media"
        ? post.texto
        : "";

  const copiarEnlace = () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/ateneo?post=${post.id}` : `/ateneo?post=${post.id}`;
    void navigator.clipboard?.writeText(url).catch(() => {});
  };
  const eliminar = () => {
    setOculto("eliminado"); // optimista; se revierte si la acción falla
    void eliminarPostAteneo(post.id).then((r) => {
      if (!r.ok) setOculto(null);
    });
  };
  const guardarEdicion = (nuevo: string) => {
    const t = nuevo.trim();
    if (!t) return;
    setGuardando(true);
    void editarPostAteneo(post.id, t).then((r) => {
      setGuardando(false);
      if (r.ok) {
        setTextoLocal(t);
        setEditando(false);
      }
    });
  };
  const menu = (
    <MenuPost
      esPropio={esPropio}
      onEditar={() => setEditando(true)}
      onEliminar={eliminar}
      onCopiar={copiarEnlace}
      onOcultar={() => setOculto("oculto")}
    />
  );

  if (oculto)
    return (
      <article className={`${card} flex items-center gap-3 px-5 py-4`}>
        <EyeOff aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
          {oculto === "eliminado" ? "Publicación eliminada." : "Publicación oculta."}
        </p>
        {oculto === "oculto" && (
          <button type="button" onClick={() => setOculto(null)} className={`shrink-0 text-[12.5px] font-semibold text-secondary ${focusRing}`}>
            Deshacer
          </button>
        )}
      </article>
    );

  const interacciones = (
    <>
      {post.enlace && <EnlaceCard e={post.enlace} />}
      <BarraInteracciones post={post} onReaccionar={onReaccionar} onComentar={onAbrir} onCompartir={onCompartir} />
      {editando && (
        <EditarPostModal
          inicial={textoEditable}
          guardando={guardando}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditando(false)}
        />
      )}
    </>
  );
  const preview =
    post.preview.length > 0 ? (
      <PreviewComentarios lista={post.preview} total={post.comentarios} yo={yo} onVerTodos={() => onAbrir(post.id)} onAbrirPerfil={onAbrirPerfil} />
    ) : null;

  if (post.tipo === "caso")
    return (
      <article className={`${card} overflow-hidden`}>
        <div aria-hidden className="h-[5px] bg-secondary" />
        <div className="px-5 py-[18px]">
          <Cabecera menu={menu} onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="caso" icono={<ScanLine aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Caso presentado</Chip>} />
          <p className="mt-3.5 text-[16.5px] font-bold leading-snug" style={{ textWrap: "pretty" }}>{post.titulo}</p>
          <p className={`mt-1.5 text-[13.5px] leading-relaxed ${softText}`}>{textoLocal ?? post.texto}</p>
          {visorCaso ? (
            // En el detalle: el visor DICOM real (Cornerstone3D), no el placeholder.
            <div className="mt-3.5">
              {visorCaso}
              <span className="mt-3 flex flex-wrap items-center gap-2.5">
                <Chip tono="teal">{post.caso.area} · {post.caso.organo}</Chip>
                <Chip tono="teal">{post.caso.dominio}</Chip>
              </span>
              {/* Bloque pedagógico (viñeta/hallazgos/diagnóstico) — solo lo clínico, sin ficha del paciente (§10). */}
              {pedagogiaCaso}
            </div>
          ) : (
            <button type="button" onClick={() => onAbrir(post.id)} className={`mt-3.5 block w-full overflow-hidden rounded-xl border border-border text-left ${focusRing}`}>
              <EstudioCaso
                thumbUrl={post.caso.thumbUrl}
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
        <Cabecera menu={menu} onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="pregunta" icono={<CircleHelp aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Pregunta</Chip>} />
        <div className="mt-3.5 rounded-xl bg-[color:var(--warning-surface)] px-[18px] py-4">
          <p className="text-[17px] font-bold leading-snug" style={{ textWrap: "pretty" }}>{textoLocal ?? post.pregunta}</p>
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
        <Cabecera menu={menu} onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip tono="encuesta" icono={<BarChart3 aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>Encuesta</Chip>} />
        <Encuesta post={textoLocal ? { ...post, pregunta: textoLocal } : post} onVotar={onVotar} />
        {interacciones}
        {preview}
      </article>
    );

  if (post.tipo === "media") {
    const [a, ...resto] = post.piezas ?? [];
    const multi = resto.length > 0;
    // MULTI (2-3): mosaico RECORTADO (como FB) — cada celda llena su hueco con object-cover.
    const tile = (p: PiezaMedia, tamanoPlay?: number) =>
      p.tipo === "gif" && p.src ? (
        <img src={p.src} alt="" loading="lazy" className="h-full w-full bg-black object-contain" />
      ) : p.tipo === "video" && p.src ? (
        <video controls preload="metadata" src={p.src} className="h-full w-full bg-black object-cover" />
      ) : p.tipo === "imagen" && p.src ? (
        <button type="button" onClick={() => onAbrir(post.id)} className={`block h-full w-full ${focusRing}`}>
          <ImgMosaico src={p.src} srcset={p.srcset} className="h-full w-full bg-black object-cover" />
        </button>
      ) : (
        <button type="button" onClick={() => onAbrir(post.id)} className={`block h-full w-full ${focusRing}`}>
          <Estudio ratio="16 / 10" poster={p.src} play={p.tipo === "video"} tamanoPlay={tamanoPlay} />
        </button>
      );
    // SINGLE: aspecto NATURAL por tipo. Imagen → ImagenMedia (tope 4:5 / completa en detalle);
    // gif/video → letterbox NEGRO a tamaño natural, con tope de alto (no recorta).
    const topeAlto = enDetalle ? "max-h-[78vh]" : "max-h-[70vh]";
    const single = (p: PiezaMedia) =>
      p.tipo === "imagen" && p.src ? (
        <ImagenMedia src={p.src} srcset={p.srcset} enDetalle={enDetalle} onAbrir={() => onAbrir(post.id)} />
      ) : p.tipo === "gif" && p.src ? (
        <img src={p.src} alt="" loading="lazy" className={`w-full ${topeAlto} rounded-[10px] bg-black object-contain`} />
      ) : p.tipo === "video" && p.src ? (
        <video controls preload="metadata" src={p.src} className={`w-full ${topeAlto} rounded-[10px] bg-black object-contain`} />
      ) : (
        <button type="button" onClick={() => onAbrir(post.id)} className={`block w-full overflow-hidden rounded-[10px] ${focusRing}`}>
          <Estudio ratio="16 / 10" poster={p.src} play={p.tipo === "video"} />
        </button>
      );
    return (
      <article className={`${card} px-5 py-[18px]`}>
        <Cabecera menu={menu} onAbrirPerfil={onAbrirPerfil} post={post} chip={<Chip icono={<ImageIcon aria-hidden className="h-3 w-3" strokeWidth={1.75} />}>{post.piezas.length} {post.piezas.length === 1 ? "pieza" : "piezas"}</Chip>} />
        <p className={`mt-3.5 text-[14px] leading-relaxed ${softText}`}>{textoLocal ?? post.texto}</p>
        {/* Media: SOLO si hay al menos una pieza (si no, el post queda como texto). */}
        {a &&
          (multi ? (
            <div className="mt-3 grid h-[320px] w-full grid-cols-[2fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-[10px]">
              <span className="row-span-2 overflow-hidden rounded-[10px]">{tile(a)}</span>
              {resto.slice(0, 2).map((p, i) => (
                <span key={i} className="overflow-hidden rounded-[10px]">{tile(p, 40)}</span>
              ))}
            </div>
          ) : (
            <div className="mt-3">{single(a)}</div>
          ))}
        {interacciones}
        {preview}
      </article>
    );
  }

  return (
    <article className={`${card} px-5 py-[18px]`}>
      <Cabecera menu={menu} onAbrirPerfil={onAbrirPerfil} post={post} />
      <p className={`mt-3.5 text-[14.5px] leading-[1.7] ${softText}`} style={{ textWrap: "pretty" }}>{textoLocal ?? post.texto}</p>
      {interacciones}
      {preview}
    </article>
  );
}

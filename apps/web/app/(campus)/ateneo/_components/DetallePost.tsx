"use client";

/**
 * Ateneo · Detalle del post (popup al comentar) + hilo anidado
 *
 * Se abre desde «Comentar», desde el contador de comentarios o desde «Ver todos».
 * Reusa PostCard para el contenido (sin preview) y agrega el hilo completo y una caja
 * de comentario FIJA en el pie del modal (siempre visible; el cuerpo scrollea).
 * El hilo se guarda plano con parentId y se anida al render: dos niveles, nunca más.
 */

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, Smile, X } from "lucide-react";
import { REACCIONES } from "./tipos";
import type { Comentario, GifItem, Persona, Post, TipoReaccion } from "./tipos";
import { PostCard, SelectorReacciones } from "./PostCard";
import { EmojiReaccion } from "./EmojiReaccion";
import { Avatar, ChipDocente, Modal, focusRing, mono } from "./ui";
import { GifPicker } from "./GifPicker";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { capaOverlay } from "@/components/ui/overlay";
import { VisorEstudio } from "@/components/casos/visor-estudio";
import { BloquePedagogicoCaso } from "./BloquePedagogicoCaso";

/**
 * Comentario-GIF: se persiste como su URL de Giphy en `cuerpo` (comentarios_ateneo es solo texto;
 * sin migración). Al render, si el cuerpo es una URL de Giphy → se pinta como imagen. El chequeo
 * de host (giphy.com) en el RENDER es el candado: nunca se `<img>` una URL arbitraria.
 */
function urlGif(texto: string): string | null {
  const t = (texto ?? "").trim();
  return /^https:\/\/[a-z0-9.-]*giphy\.com\/\S+$/i.test(t) && !/\s/.test(t) ? t : null;
}

/**
 * Control de REACCIÓN de un comentario (mig 0075): botón «Reaccionar» que abre el MISMO picker
 * de 6 emojis del post (`SelectorReacciones`, reusado). Picker por CLICK/TAP con cierre por Esc,
 * clic afuera o seleccionar — mismo patrón que la barra del post. Re-elegir el tipo actual lo
 * quita (toggle · `r === mia ? null`).
 */
function ReaccionComentario({
  c,
  onReaccionar,
}: {
  c: Comentario;
  onReaccionar: (comentarioId: string, r: TipoReaccion | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const mia = c.reacciones?.mia;

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
    <span className="relative inline-flex">
      <div ref={popRef} data-open={abierto} className={`${capaOverlay} absolute bottom-6 left-0 z-10`}>
        <SelectorReacciones
          actual={mia}
          onElegir={(r) => {
            onReaccionar(c.id, r === mia ? null : r);
            setAbierto(false);
          }}
        />
      </div>
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-pressed={!!mia}
        onClick={() => setAbierto((o) => !o)}
        className={`text-[11.5px] font-bold ${mia ? "text-secondary" : "text-[color:var(--foreground-soft)]"} ${focusRing}`}
      >
        {mia ? REACCIONES[mia].etiqueta : "Reaccionar"}
      </button>
    </span>
  );
}

function Burbuja({
  c,
  nivel,
  onResponder,
  onReaccionar,
}: {
  c: Comentario;
  nivel: 0 | 1;
  onResponder: (c: Comentario) => void;
  onReaccionar: (comentarioId: string, r: TipoReaccion | null) => void;
}) {
  const gif = urlGif(c.texto);
  const total = c.reacciones?.total ?? 0;
  const top = c.reacciones?.top ?? [];
  return (
    <div className={`flex gap-2.5 ${nivel ? "mt-2.5" : "mt-3.5"}`}>
      <Avatar p={c.autor} url={c.autor.avatarUrl} size={nivel ? 30 : 34} />
      <div className="min-w-0 flex-1">
        {gif ? (
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold">
              {c.autor.nombre} {c.autor.rol === "docente" && <ChipDocente />}
            </p>
            <img src={gif} alt="GIF" loading="lazy" className="mt-1 max-h-[220px] w-auto rounded-[12px] bg-black object-contain" />
          </div>
        ) : (
          <div className="inline-block max-w-full rounded-[14px] bg-muted px-3 py-2">
            <p className="text-[12.5px] font-bold">
              {c.autor.nombre} {c.autor.rol === "docente" && <ChipDocente />}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">{c.texto}</p>
          </div>
        )}
        <div className="ml-3 mt-1 flex flex-wrap items-center gap-3.5">
          <span className={`${mono} text-[11px] text-muted-foreground`}>{c.cuando}</span>
          <ReaccionComentario c={c} onReaccionar={onReaccionar} />
          <button
            type="button"
            onClick={() => onResponder(c)}
            className={`text-[11.5px] font-bold text-[color:var(--foreground-soft)] ${focusRing}`}
          >
            Responder
          </button>
          {/* Resumen de reacciones (top emojis + total), como en el post. Solo si hay algo. */}
          {total > 0 && (
            <span className="inline-flex items-center">
              <span className="flex">
                {top.map((k, i) => (
                  <span
                    key={k}
                    aria-hidden
                    className={`grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-card ${i ? "-ml-1" : ""}`}
                    style={{ background: REACCIONES[k].fondo }}
                  >
                    <EmojiReaccion tipo={k} size={11} animar={false} />
                  </span>
                ))}
              </span>
              <span className={`${mono} ml-1 text-[11px] text-muted-foreground`}>{total}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DetallePost({
  post,
  hilo,
  yo,
  onCerrar,
  onReaccionar,
  onReaccionarComentario,
  onCompartir,
  onVotar,
  onComentar,
}: {
  post: Post;
  hilo: Comentario[];
  yo: Persona;
  onCerrar: () => void;
  onReaccionar: (id: string, r: TipoReaccion | null) => void;
  onReaccionarComentario: (comentarioId: string, r: TipoReaccion | null) => void;
  onCompartir: (id: string) => void;
  onVotar: (postId: string, opcionId: string) => void;
  onComentar: (postId: string, texto: string, parentId?: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState<"relevantes" | "recientes">("relevantes");
  const [gifSel, setGifSel] = useState<GifItem | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Comentario al que se está respondiendo (null = comentario de primer nivel).
  const [respondiendoA, setRespondiendoA] = useState<Comentario | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const raices = hilo.filter((c) => !c.parentId);
  const hijosDe = (id: string) => hilo.filter((c) => c.parentId === id);

  // Empieza a responder un comentario: fija el destino y lleva el foco a la caja del pie.
  const empezarRespuesta = (c: Comentario) => {
    setRespondiendoA(c);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Inserta el emoji en la posición del cursor del input de comentario (como FB).
  const insertarEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? texto.length;
    const end = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, start) + emoji + texto.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // Enviar: un GIF seleccionado se publica como su URL (se renderiza como imagen · urlGif);
  // si no, el texto. Reusa onComentar (comentarios_ateneo, solo texto · sin migración).
  // Si se está respondiendo, pasa el parentId; para no pasar de 2 niveles, una respuesta a
  // una respuesta (nivel 1) se ancla a su RAÍZ (`parentId ?? id`), no al comentario hijo.
  const enviar = () => {
    const parentId = respondiendoA ? respondiendoA.parentId ?? respondiendoA.id : undefined;
    if (gifSel) {
      onComentar(post.id, gifSel.url, parentId);
      setGifSel(null);
      setGifOpen(false);
      setTexto("");
      setRespondiendoA(null);
      return;
    }
    if (!texto.trim()) return;
    onComentar(post.id, texto, parentId);
    setTexto("");
    setRespondiendoA(null);
  };

  return (
    <Modal
      titulo={`Publicación de ${post.autor.nombre.replace(/^Dra?\. /, "")}`}
      onCerrar={onCerrar}
      ancho={720}
      pie={
        <div className="px-5 py-3">
          {/* Barra «Respondiendo a …» (cancelable): indica el destino de la respuesta. */}
          {respondiendoA && (
            <div className="mb-2.5 flex items-center gap-2 rounded-[10px] border border-border bg-muted px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[color:var(--foreground-soft)]">
                Respondiendo a {respondiendoA.autor.nombre.replace(/^Dra?\. /, "")}
              </span>
              <button
                type="button"
                onClick={() => setRespondiendoA(null)}
                className={`shrink-0 text-[12px] font-bold text-secondary ${focusRing}`}
              >
                Cancelar
              </button>
            </div>
          )}
          {/* Panel del GIF picker (reusa el mismo componente del composer de posts). */}
          {gifOpen && (
            <div className="mb-2.5 rounded-[12px] border border-border bg-card p-3">
              <GifPicker
                onSelect={(g) => {
                  setGifSel(g);
                  setGifOpen(false);
                }}
                selId={gifSel?.id}
                alto="max-h-[220px]"
              />
            </div>
          )}
          {/* Preview del GIF elegido (quitable) antes de enviar. */}
          {gifSel && (
            <div className="relative mb-2.5 inline-block">
              <img src={gifSel.url} alt="GIF" className="max-h-[120px] rounded-[10px] bg-black object-contain" />
              <button
                type="button"
                onClick={() => setGifSel(null)}
                aria-label="Quitar GIF"
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-white"
                style={{ background: "rgba(15,45,82,.85)" }}
              >
                <X aria-hidden className="h-3 w-3" strokeWidth={2.2} />
              </button>
            </div>
          )}
          <form
            className="flex items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <Avatar p={yo} size={34} />
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-muted pr-2 focus-within:border-secondary">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Escriba un comentario</span>
                <input
                  ref={inputRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  disabled={!!gifSel}
                  placeholder={gifSel ? "GIF listo para enviar…" : "Escriba un comentario…"}
                  className="h-11 w-full rounded-full bg-transparent px-4 text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                />
              </label>
              {/* Emoji (mismo picker del composer · abre hacia arriba, la barra va al pie). */}
              <span className="relative">
                <button
                  type="button"
                  aria-label="Emoji"
                  aria-expanded={emojiOpen}
                  onClick={() => { setEmojiOpen((o) => !o); setGifOpen(false); }}
                  className={`grid h-8 w-8 place-items-center rounded-full ${emojiOpen ? "text-secondary" : "text-muted-foreground"} hover:bg-border ${focusRing}`}
                >
                  <Smile aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <EmojiPickerPopover
                  abierto={emojiOpen}
                  onCerrar={() => setEmojiOpen(false)}
                  onEmoji={insertarEmoji}
                  posicion="right"
                  direccion="up"
                />
              </span>
              {/* GIF (reusa GifPicker). */}
              <button
                type="button"
                aria-label="GIF"
                aria-expanded={gifOpen}
                onClick={() => { setGifOpen((o) => !o); setEmojiOpen(false); }}
                className={`grid h-8 w-8 place-items-center rounded-full ${gifOpen ? "text-secondary" : "text-muted-foreground"} hover:bg-border ${focusRing}`}
              >
                <ImageIcon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
            <button type="submit" aria-label="Enviar comentario" disabled={!gifSel && !texto.trim()} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)] transition-opacity disabled:opacity-40 ${focusRing}`}>
              <Send aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      }
    >
      {/* el post, sin su preview (el hilo completo va abajo). Si es CASO, el visor
          DICOM real (Cornerstone3D) va embebido aquí mismo, no navega a bitácora. */}
      <div className="[&>article]:rounded-none [&>article]:border-0 [&>article]:shadow-none">
        <PostCard
          post={{ ...post, preview: [] }}
          yo={yo}
          enDetalle
          onAbrir={() => {}}
          onReaccionar={onReaccionar}
          onCompartir={onCompartir}
          onVotar={onVotar}
          visorCaso={
            post.tipo === "caso" && post.caso.piezas > 0 ? (
              // Toolset COMPLETO (zoom/pan/window-level/medición + cine) pero EFÍMERO: las
              // mediciones no se persisten (vista de discusión). Por POST id → la audiencia ve el
              // estudio según la visibilidad del post, sin exponer el id de bitácora (§10).
              <VisorEstudio postId={post.id} efimero className="h-[52vh] min-h-[360px]" />
            ) : undefined
          }
          pedagogiaCaso={
            post.tipo === "caso" ? <BloquePedagogicoCaso postId={post.id} /> : undefined
          }
        />
      </div>

      <section className="px-5 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5px] font-bold">{post.comentarios} comentarios</span>
          <button
            type="button"
            onClick={() => setOrden((o) => (o === "relevantes" ? "recientes" : "relevantes"))}
            className={`ml-auto h-[30px] rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-[color:var(--foreground-soft)] ${focusRing}`}
          >
            {orden === "relevantes" ? "Más relevantes" : "Más recientes"}
          </button>
        </div>
        <ul>
          {raices.map((c) => (
            <li key={c.id}>
              <Burbuja c={c} nivel={0} onResponder={empezarRespuesta} onReaccionar={onReaccionarComentario} />
              {hijosDe(c.id).length > 0 && (
                <ul className="ml-[46px] border-l-2 border-border pl-3.5">
                  {hijosDe(c.id).map((h) => (
                    <li key={h.id}>
                      <Burbuja c={h} nivel={1} onResponder={empezarRespuesta} onReaccionar={onReaccionarComentario} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}

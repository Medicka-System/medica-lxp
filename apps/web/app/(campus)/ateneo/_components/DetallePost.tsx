"use client";

/**
 * Ateneo · Detalle del post (popup al comentar) + hilo anidado
 *
 * Se abre desde «Comentar», desde el contador de comentarios o desde «Ver todos».
 * Reusa PostCard para el contenido (sin preview) y agrega el hilo completo y una caja
 * de comentario FIJA en el pie del modal (siempre visible; el cuerpo scrollea).
 * El hilo se guarda plano con parentId y se anida al render: dos niveles, nunca más.
 */

import { useState } from "react";
import { Send } from "lucide-react";
import type { Comentario, Persona, Post, TipoReaccion } from "./tipos";
import { PostCard } from "./PostCard";
import { Avatar, ChipDocente, Modal, focusRing, mono } from "./ui";

function Burbuja({ c, nivel }: { c: Comentario; nivel: 0 | 1 }) {
  return (
    <div className={`flex gap-2.5 ${nivel ? "mt-2.5" : "mt-3.5"}`}>
      <Avatar p={c.autor} size={nivel ? 30 : 34} />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-[14px] bg-muted px-3 py-2">
          <p className="text-[12.5px] font-bold">
            {c.autor.nombre} {c.autor.rol === "docente" && <ChipDocente />}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">{c.texto}</p>
        </div>
        <div className="ml-3 mt-1 flex gap-3.5">
          <span className={`${mono} text-[11px] text-muted-foreground`}>{c.cuando}</span>
          <button type="button" className={`text-[11.5px] font-bold text-[color:var(--foreground-soft)] ${focusRing}`}>Reaccionar</button>
          <button type="button" className={`text-[11.5px] font-bold text-[color:var(--foreground-soft)] ${focusRing}`}>Responder</button>
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
  onCompartir,
  onVotar,
  onAbrirCaso,
  onComentar,
}: {
  post: Post;
  hilo: Comentario[];
  yo: Persona;
  onCerrar: () => void;
  onReaccionar: (id: string, r: TipoReaccion | null) => void;
  onCompartir: (id: string) => void;
  onVotar: (postId: string, opcionId: string) => void;
  onAbrirCaso: (casoId: string) => void;
  onComentar: (postId: string, texto: string, parentId?: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState<"relevantes" | "recientes">("relevantes");
  const raices = hilo.filter((c) => !c.parentId);
  const hijosDe = (id: string) => hilo.filter((c) => c.parentId === id);

  return (
    <Modal
      titulo={`Publicación de ${post.autor.nombre.replace(/^Dra?\. /, "")}`}
      onCerrar={onCerrar}
      ancho={720}
      pie={
        <form
          className="flex items-center gap-2.5 px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            onComentar(post.id, texto);
            setTexto("");
          }}
        >
          <Avatar p={yo} size={34} />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Escriba un comentario</span>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escriba un comentario…"
              className="h-11 w-full rounded-full border border-border bg-muted px-4 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-secondary"
            />
          </label>
          <button type="submit" aria-label="Enviar comentario" className={`grid h-11 w-11 place-items-center rounded-full bg-primary text-[color:var(--sidebar)] ${focusRing}`}>
            <Send aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
        </form>
      }
    >
      {/* el post, sin su preview (el hilo completo va abajo) */}
      <div className="[&>article]:rounded-none [&>article]:border-0 [&>article]:shadow-none">
        <PostCard
          post={{ ...post, preview: [] }}
          yo={yo}
          onAbrir={() => {}}
          onReaccionar={onReaccionar}
          onCompartir={onCompartir}
          onVotar={onVotar}
          onAbrirCaso={onAbrirCaso}
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
              <Burbuja c={c} nivel={0} />
              {hijosDe(c.id).length > 0 && (
                <ul className="ml-[46px] border-l-2 border-border pl-3.5">
                  {hijosDe(c.id).map((h) => (
                    <li key={h.id}>
                      <Burbuja c={h} nivel={1} />
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

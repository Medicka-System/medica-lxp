"use client";

/**
 * Consultas (alumno) · hilo de la conversación abierta
 * Cabecera (contacto, presencia, estado + acción de cierre), franja de origen académico,
 * mensajes agrupados por día, cierre sugerido «¿Le resolvió la duda?» y composer fijo.
 * Si la consulta está cerrada, el composer se sustituye por «Reabrir consulta».
 */

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, CheckCheck, FileText, Image as ImageIcon, MoreHorizontal, Paperclip, Play, Send, X } from "lucide-react";
import type { Adjunto, Conversacion, Mensaje } from "./tipos";
import { AvatarContacto, ChipEstado, ChipTipo, focusRing, mono, panel, softText } from "./ui";

function PiezaAdjunto({ a }: { a: Adjunto }) {
  const visual = a.tipo !== "archivo";
  return (
    <a href={a.url ?? "#"} className={`flex items-center gap-2.5 rounded-[11px] border border-border bg-card px-2.5 py-2 ${focusRing}`}>
      {visual ? (
        <span aria-hidden className="relative grid h-[38px] w-[54px] shrink-0 place-items-center overflow-hidden rounded-md bg-sidebar text-white">
          {a.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {a.tipo !== "imagen" && <Play className="relative h-[13px] w-[13px]" strokeWidth={2} />}
        </span>
      ) : (
        <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="h-4 w-4" strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-semibold">{a.nombre}</span>
        <span className={`${mono} block text-[10px] text-muted-foreground`}>{a.meta}</span>
      </span>
    </a>
  );
}

function Separador({ dia }: { dia: string }) {
  return (
    <div className="flex items-center gap-2.5" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className={`${mono} text-[10.5px] text-muted-foreground`}>{dia}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function Hilo({
  conversacion,
  mensajes,
  escribiendo,
  onEnviar,
  onCerrarConsulta,
  onReabrir,
  onOtraPregunta,
}: {
  conversacion: Conversacion;
  mensajes: Mensaje[];
  escribiendo?: boolean;
  onEnviar: (texto: string, archivos: File[]) => void;
  onCerrarConsulta: (id: string) => void;
  onReabrir: (id: string) => void;
  onOtraPregunta: (id: string) => void;
}) {
  const { contacto, estado } = conversacion;
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const fin = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  /* bajar al último mensaje al abrir y al recibir (scrollTop, nunca scrollIntoView) */
  useEffect(() => {
    const s = scroller.current;
    if (s) s.scrollTop = s.scrollHeight;
  }, [conversacion.id, mensajes.length, escribiendo]);

  const enviar = () => {
    if (!texto.trim() && archivos.length === 0) return;
    onEnviar(texto.trim(), archivos);
    setTexto("");
    setArchivos([]);
  };

  const ultimoEsSuyo = mensajes.length > 0 && !mensajes[mensajes.length - 1].deMi;
  const presencia = contacto.enLinea ? "En línea" : [contacto.ultimaConexion, contacto.tiempoRespuesta].filter(Boolean).join(" · ");

  return (
    <section className={`${panel} flex min-w-0 flex-1 flex-col overflow-hidden`} aria-label={`Conversación con ${contacto.nombre}`}>
      {/* cabecera */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-[18px] py-3.5">
        <AvatarContacto ini={contacto.ini} tipo={contacto.tipo} size={44} enLinea={contacto.enLinea} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold">{contacto.nombre}</span>
            <ChipTipo tipo={contacto.tipo} texto={contacto.contexto} />
          </div>
          <p className={`mt-0.5 text-[12px] ${contacto.enLinea ? "text-secondary" : "text-muted-foreground"}`}>{presencia}</p>
        </div>
        {estado && (
          <span className="flex shrink-0 items-center gap-2">
            <ChipEstado estado={estado} grande />
            {estado !== "cerrada" && (
              <button type="button" onClick={() => onCerrarConsulta(conversacion.id)} className={`h-[38px] whitespace-nowrap rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-accent ${focusRing}`}>
                Marcar como resuelta
              </button>
            )}
          </span>
        )}
        <button type="button" aria-label="Más opciones" className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}>
          <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {/* origen académico (solo consultas a docente) */}
      {conversacion.origen && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-muted px-[18px] py-2.5">
          <BookOpen aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className={`min-w-0 flex-1 text-[12px] ${softText}`}>
            Consulta sobre <span className="font-bold text-foreground">{conversacion.origen.etiqueta}</span> · abierta el {conversacion.origen.abierta}
          </span>
          <a href={conversacion.origen.href} className="whitespace-nowrap text-[12px] font-semibold text-secondary">Ir a la lección</a>
        </div>
      )}

      {/* mensajes */}
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]" aria-live="polite">
        {mensajes.map((m, i) => {
          const nuevoDia = i === 0 || mensajes[i - 1].dia !== m.dia;
          return (
            <div key={m.id} className="flex flex-col gap-3.5">
              {nuevoDia && <Separador dia={m.dia} />}
              {m.deMi ? (
                <div className="flex justify-end">
                  <div className="min-w-0 max-w-[74%]">
                    {m.adjuntos?.map((a) => (
                      <div key={a.id} className="mb-1.5"><PiezaAdjunto a={a} /></div>
                    ))}
                    {m.texto && <p className="rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13.5px] leading-relaxed text-sidebar-foreground">{m.texto}</p>}
                    <span className={`${mono} mt-1 flex items-center justify-end gap-1 text-[10.5px] ${m.estado === "leido" ? "text-secondary" : m.estado === "error" ? "text-[color:var(--destructive-foreground)]" : "text-muted-foreground"}`}>
                      {m.hora}
                      {m.estado === "leido" ? <CheckCheck aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> : <Check aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} />}
                      {m.estado === "leido" ? "leído" : m.estado === "enviando" ? "enviando…" : m.estado === "error" ? "no se envió · reintentar" : "enviado"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-[74%] gap-2.5">
                  <AvatarContacto ini={contacto.ini} tipo={contacto.tipo} size={30} />
                  <div className="min-w-0">
                    {m.texto && <p className={`rounded-[14px] rounded-bl-[4px] border border-border bg-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed ${softText}`}>{m.texto}</p>}
                    {m.adjuntos?.map((a) => (
                      <div key={a.id} className="mt-1.5"><PiezaAdjunto a={a} /></div>
                    ))}
                    <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>{m.hora}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* cierre sugerido: el último mensaje es del docente/staff y la consulta sigue viva */}
        {estado === "respondida" && ultimoEsSuyo && (
          <div className="flex flex-wrap items-center gap-2 pl-10">
            <span className="text-[11px] text-muted-foreground">¿Le resolvió la duda?</span>
            <button type="button" onClick={() => onCerrarConsulta(conversacion.id)} className={`h-[30px] rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-secondary ${focusRing}`}>Sí, cerrar consulta</button>
            <button type="button" onClick={() => onOtraPregunta(conversacion.id)} className={`h-[30px] rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold ${softText} ${focusRing}`}>Tengo otra pregunta</button>
          </div>
        )}

        {escribiendo && (
          <div className="flex items-center gap-2.5">
            <AvatarContacto ini={contacto.ini} tipo={contacto.tipo} size={30} />
            <span aria-hidden className="inline-flex gap-1 rounded-[14px] rounded-bl-[4px] border border-border bg-muted px-3.5 py-3">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
            </span>
            <span className="text-[11px] text-muted-foreground">escribiendo…</span>
          </div>
        )}
        <div ref={fin} />
      </div>

      {/* composer o reabrir */}
      {estado === "cerrada" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border bg-muted px-[18px] py-3.5">
          <span className="flex-1 text-[12.5px] text-muted-foreground">
            Esta consulta se cerró {conversacion.cerradaEl ?? ""}. Si tiene otra duda, abra una nueva.
          </span>
          <button type="button" onClick={() => onReabrir(conversacion.id)} className={`h-11 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] ${focusRing}`}>Reabrir consulta</button>
        </div>
      ) : (
        <form
          className="shrink-0 border-t border-border px-[18px] pb-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          {archivos.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {archivos.map((f, i) => (
                <li key={i} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted pl-2.5 pr-1 text-[11.5px] font-semibold">
                  {f.name}
                  <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setArchivos((s) => s.filter((_, j) => j !== i))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-card">
                    <X aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2 rounded-[14px] border border-border bg-muted py-2 pl-1.5 pr-2 focus-within:border-secondary">
            {[
              { label: "Adjuntar archivo", Icono: Paperclip, accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" },
              { label: "Adjuntar imagen o video", Icono: ImageIcon, accept: "image/*,video/*" },
            ].map(({ label, Icono, accept }) => (
              <label key={label} title={label} className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[10px] ${softText} hover:bg-card`}>
                <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                <span className="sr-only">{label}</span>
                <input type="file" multiple accept={accept} className="sr-only" onChange={(e) => setArchivos((s) => [...s, ...Array.from(e.target.files ?? [])])} />
              </label>
            ))}
            <label className="min-w-0 flex-1">
              <span className="sr-only">Escriba un mensaje</span>
              <textarea
                rows={1}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                placeholder={`Escriba a ${contacto.tipo === "docente" ? "su docente" : contacto.nombre.replace(/^Dra?\. /, "").split(" ")[0]}…`}
                className="max-h-32 min-h-10 w-full resize-none bg-transparent px-1 py-2.5 text-[13.5px] leading-normal text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button type="submit" aria-label="Enviar" disabled={!texto.trim() && archivos.length === 0} className={`grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-primary text-[color:var(--sidebar)] disabled:bg-[color:var(--track)] disabled:text-muted-foreground ${focusRing}`}>
              <Send aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
          <p className="ml-1 mt-1.5 text-[11px] text-muted-foreground">Enter para enviar · Shift + Enter para salto de línea · imágenes y PDF hasta 20 MB</p>
        </form>
      )}
    </section>
  );
}

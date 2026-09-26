"use client";

/**
 * Columna 2 · la conversación: cabecera con el contexto del alumno (grupo, módulo en curso,
 * horas) y el tiempo sin responder; el hilo con adjuntos de la bitácora; el borrador de Eco
 * dentro del hilo (Usar y enviar · Editarla · Descartar); y el campo de respuesta que declara
 * "responde como Dr. …". El alumno recibe el mensaje del docente, nunca de Eco.
 */

import {
  Check,
  ChevronRight,
  Clock,
  Link2,
  Paperclip,
  Pencil,
  Send,
  Video,
} from "lucide-react";
import { mono, softText, focusRing, Avatar, EcoMark } from "./ui";
import type { Recurso, SugerenciaEco, Conversacion, ConsultasData } from "./tipos";

export type HiloConsultaProps = {
  docente: ConsultasData["docente"];
  verBorrador: boolean;
  setVerBorrador: (v: boolean) => void;
  respuesta: string;
  setRespuesta: (v: string) => void;
  onResponder: (id: string, texto: string) => void;
  onUsarSugerenciaEco: (id: string, texto: string) => void;
  onEnlazarRecurso: (r: Recurso) => void;
  onPedirBorradorEco: () => void;
  activa: Conversacion;
  eco: SugerenciaEco;
};

export function HiloConsulta({ docente, verBorrador, setVerBorrador, respuesta, setRespuesta, onResponder, onUsarSugerenciaEco, onEnlazarRecurso, onPedirBorradorEco, activa, eco }: HiloConsultaProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        {/* contexto del alumno, siempre visible */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-[18px] py-3.5">
          <Avatar ini={activa.alumno.ini} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold leading-tight">{activa.alumno.nombre}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {activa.alumno.grupo} · cursando{" "}
              <span className={`${mono} font-semibold text-[color:var(--foreground-soft)]`}>
                {activa.alumno.moduloEnCurso}
              </span>{" "}
              · {activa.alumno.horas} h acumuladas
            </p>
          </div>
          {activa.estado === "sin-responder" && (
            <span className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
              <Clock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Sin responder{activa.esperando ? ` · ${activa.esperando}` : ""}
            </span>
          )}
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver su expediente
            <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* hilo */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
          {activa.mensajes.map((m) => (
            <div key={m.id} className="flex shrink-0 flex-col gap-4">
              {m.dia && (
                <div className="flex shrink-0 items-center gap-2.5">
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className={`${mono} text-[10.5px] text-muted-foreground`}>{m.dia}</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
              )}

              {m.de === "alumno" ? (
                <div className="flex max-w-[78%] shrink-0 gap-2.5">
                  <Avatar ini={activa.alumno.ini} size={30} />
                  <div className="min-w-0">
                    <p className="rounded-[14px] rounded-bl-[4px] border border-border bg-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[color:var(--foreground-soft)]">
                      {m.texto}
                    </p>
                    {m.adjunto && (
                      <button
                        type="button"
                        className={`mt-1.5 flex items-center gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary ${focusRing}`}
                      >
                        <span
                          aria-hidden
                          className="grid h-[26px] w-[34px] shrink-0 place-items-center rounded-[5px] bg-sidebar"
                          style={{ color: "var(--hero-ink-muted)" }}
                        >
                          <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-semibold">{m.adjunto.nombre}</span>
                          <span className={`${mono} block text-[10px] text-muted-foreground`}>
                            {m.adjunto.meta}
                          </span>
                        </span>
                      </button>
                    )}
                    <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>
                      {m.hora}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex shrink-0 justify-end">
                  <div className="min-w-0 max-w-[78%]">
                    <p className="rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13.5px] leading-relaxed text-sidebar-foreground">
                      {m.texto}
                    </p>
                    <span className={`${mono} mt-1 block text-right text-[10.5px] text-muted-foreground`}>
                      {m.hora}
                      {m.leido ? " · leído" : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Eco dentro del hilo: aviso o borrador desplegado */}
          {activa.estado === "sin-responder" && eco.borrador && !verBorrador && (
            <button
              type="button"
              onClick={onPedirBorradorEco}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3 text-left transition-colors hover:bg-card ${focusRing}`}
            >
              <EcoMark size={28} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-[color:var(--info-foreground)]">
                  Eco tiene una respuesta lista para esta duda
                </span>
                <span className="mt-0.5 block text-[11.5px] text-[color:var(--info-foreground)]">
                  {eco.cita} · usted decide si se envía
                </span>
              </span>
              <span className="inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3 text-[12px] font-bold text-white">
                Verla
              </span>
            </button>
          )}

          {activa.estado === "sin-responder" && eco.borrador && verBorrador && (
            <div className="shrink-0 overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card">
              <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-3.5 py-3">
                <EcoMark size={28} />
                <p className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--info-foreground)]">
                  Eco redactó una respuesta
                </p>
                <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-card px-[7px] text-[9.5px] font-bold text-[color:var(--info-foreground)]">
                  Usted decide si se envía
                </span>
              </div>
              <div className="p-3.5">
                <p className={`text-[13px] leading-[1.7] ${softText}`}>{eco.borrador}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-border pt-3">
                  <span
                    className={`${mono} inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`}
                  >
                    <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {eco.cita}
                  </span>
                  <span className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUsarSugerenciaEco(activa.id, eco.borrador)}
                      className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      <Check aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.4} />
                      Usar y enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespuesta(eco.borrador)}
                      className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Editarla
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerBorrador(false)}
                      className={`h-10 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
                    >
                      Descartar
                    </button>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* responder: la autoría es del docente */}
        <div className="shrink-0 border-t border-border px-[18px] pb-4 pt-3.5">
          <div className="rounded-xl border border-border bg-muted px-3.5 py-3">
            <label>
              <span className="sr-only">Escriba su respuesta</span>
              <textarea
                rows={2}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escriba su respuesta…"
                className="w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onEnlazarRecurso(eco.recursos[0])}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Enlazar lección o caso
              </button>
              <button
                type="button"
                aria-label="Adjuntar"
                className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Paperclip aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onPedirBorradorEco}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[12px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
              >
                <EcoMark size={18} />
                Pedirle a Eco un borrador
              </button>
              <span className="ml-auto flex items-center gap-2.5">
                <span className={`${mono} text-[11px] text-muted-foreground`}>
                  responde como {docente.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => onResponder(activa.id, respuesta)}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Responder
                </button>
              </span>
            </div>
          </div>
        </div>
      </section>
  );
}

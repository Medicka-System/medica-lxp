"use client";

/**
 * Columna 3 · Eco: resume qué pregunta el alumno, detecta el patrón ("5 alumnos preguntaron lo
 * mismo") con salida a responderles a todos o llevarlo al foro, y propone material para enlazar.
 * Colapsable a un riel de 56px. Eco asiste; el docente decide qué responder.
 */

import {
  BookCopy,
  MessageCircle,
  Send,
  Users,
  X,
} from "lucide-react";
import { mono, softText, focusRing, EcoMark } from "./ui";
import type { Recurso, SugerenciaEco } from "./tipos";

export type PanelEcoConsultasProps = {
  ecoAbierto: boolean;
  setEcoAbierto: (v: boolean) => void;
  respuesta: string;
  onEnlazarRecurso: (r: Recurso) => void;
  onResponderATodos: () => void;
  onLlevarAlForo: () => void;
  eco: SugerenciaEco;
};

export function PanelEcoConsultas({ ecoAbierto, setEcoAbierto, respuesta, onEnlazarRecurso, onResponderATodos, onLlevarAlForo, eco }: PanelEcoConsultasProps) {
  return (
    ecoAbierto ? (
        <aside
          aria-label="Eco · asistente de la plataforma"
          className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
            <EcoMark size={34} invertido />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                Asiste · usted responde
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEcoAbierto(false)}
              aria-label="Cerrar Eco"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            {/* resume el hilo largo */}
            <section className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                Qué está preguntando
              </p>
              <p className={`mt-2 text-[12.5px] leading-relaxed ${softText}`}>{eco.resumen}</p>
              <p className={`${mono} mt-2 text-[11px] text-muted-foreground`}>{eco.metaHilo}</p>
            </section>

            {/* detecta el patrón */}
            {eco.patron && (
              <section className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                  Lo mismo preguntaron otros
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span className="flex pl-1.5" aria-hidden>
                    {eco.patron.inis.map((i) => (
                      <span
                        key={i}
                        className={`${mono} -ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground`}
                      >
                        {i}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">
                    {eco.patron.cuantos} alumnos esta semana
                  </span>
                </div>
                <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.patron.texto}</p>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={onResponderATodos}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Responderles a los {eco.patron.cuantos}
                  </button>
                  <button
                    type="button"
                    onClick={onLlevarAlForo}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Llevarlo al foro del grupo
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Si lo lleva al foro, cada uno recibe su respuesta y queda el hilo público para los
                  demás.
                </p>
              </section>
            )}

            {/* material para enlazar */}
            <section className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                Material que puede enlazar
              </p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {eco.recursos.map((r) => (
                  <li key={r.titulo}>
                    <button
                      type="button"
                      onClick={() => onEnlazarRecurso(r)}
                      className={`flex w-full items-start gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                    >
                      <BookCopy
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`${mono} block text-[9.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground`}
                        >
                          {r.clave}
                        </span>
                        <span className="mt-0.5 block text-[12px] font-semibold leading-snug">
                          {r.titulo}
                        </span>
                        <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                          {r.meta}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {eco.ajustes.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <form
              className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <span className="sr-only">Pedirle algo a Eco</span>
              <input
                type="text"
                placeholder="Pídale algo a Eco…"
                className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </aside>
      ) : (
        <aside
          aria-label="Eco"
          className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <button
            type="button"
            onClick={() => setEcoAbierto(true)}
            aria-label="Abrir Eco"
            className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
              <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
            </svg>
          </button>
          <span
            aria-hidden
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--info-foreground)]"
            style={{ writingMode: "vertical-rl" }}
          >
            Eco
          </span>
        </aside>
      )
  );
}

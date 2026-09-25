"use client";

/**
 * Eco en Grupos: riel colapsado o panel de chat. "¿Quién está en riesgo?", "resume el avance
 * del Grupo B", "redacta un mensaje para los que no se conectan". Eco propone; el docente actúa.
 */

import {
  MessageCircle,
  Send,
  Video,
  X,
} from "lucide-react";
import { mono, softText, focusRing, Avatar, EcoMark } from "./ui";
import type { GruposData } from "./tipos";

export type PanelEcoProps = {
  eco: GruposData["eco"];
  ecoAbierto: boolean;
  setEcoAbierto: (v: boolean) => void;
  onEnviarConsulta: (ids: string[]) => void;
  onPreguntarEco: (q: string) => void;
};

export function PanelEco({ eco, ecoAbierto, setEcoAbierto, onEnviarConsulta, onPreguntarEco }: PanelEcoProps) {
  return (
    ecoAbierto ? (
    <aside
      aria-label="Eco"
      className="flex max-h-full w-[352px] shrink-0 flex-col self-start overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
        <EcoMark size={34} invertido />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight">Eco</p>
          <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
            Analiza · usted acompaña
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

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
        {eco.conversacion.map((m) =>
          m.de === "docente" ? (
            <div key={m.id} className="flex shrink-0 justify-end">
              <p className="max-w-[86%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {m.texto}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex shrink-0 gap-2.5">
              <EcoMark size={26} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{m.texto}</p>

                {m.alumnos && (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {m.alumnos.map((a) => (
                      <li
                        key={a.ini}
                        className="flex gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5"
                      >
                        <Avatar ini={a.ini} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">{a.nombre}</span>
                          <span className={`mt-0.5 block text-[11px] leading-snug ${softText}`}>
                            {a.motivo}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {m.destacado &&
                  (m.involucrados ? (
                    <div className="mt-2.5 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2.5">
                      <p className="text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                        {m.destacado}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {m.destacado}
                    </p>
                  ))}

                {m.involucrados && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="flex pl-1.5" aria-hidden>
                      {m.involucrados.map((i) => (
                        <span
                          key={i}
                          className={`${mono} -ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground`}
                        >
                          {i}
                        </span>
                      ))}
                    </span>
                    <span className="text-[11px] text-muted-foreground">8 alumnos involucrados</span>
                  </div>
                )}

                {m.acciones && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.acciones.map((a) => (
                      <button
                        key={a.etiqueta}
                        type="button"
                        onClick={() => onEnviarConsulta([])}
                        className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                          a.primaria
                            ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                            : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {a.icono === "consulta" && (
                          <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {a.icono === "clase" && (
                          <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {a.etiqueta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {eco.sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPreguntarEco(s)}
              className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
          onSubmit={(e) => e.preventDefault()}
        >
          <span className="sr-only">Preguntarle a Eco sobre este grupo</span>
          <input
            type="text"
            placeholder="Pregúntele a Eco sobre este grupo…"
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
      className="flex w-14 shrink-0 flex-col items-center gap-3 self-start rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
    >
      <button
        type="button"
        onClick={() => setEcoAbierto(true)}
        aria-label="Abrir Eco"
        className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
      >
        <EcoMark size={19} invertido />
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

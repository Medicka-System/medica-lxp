"use client";

/**
 * Eco en Entregas: riel colapsado (56px) o panel de chat. El docente pide trabajo en lenguaje
 * natural ("resume las entregas", "¿quién está batallando?", "redacta feedback") y Eco
 * responde con trabajo hecho. Nada se asienta sin el docente.
 */

import {
  Check,
  Copy,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { kicker, softText, focusRing, Avatar } from "./ui";
import type { EntregasData } from "./tipos";

export type PanelEcoProps = {
  asistente: EntregasData["asistente"];
  iaAbierta: boolean;
  setIaAbierta: (v: boolean) => void;
  peticion: string;
  setPeticion: (v: string) => void;
  onPreguntarIA: (p: string) => void;
};
export function PanelEco({ asistente, iaAbierta, setIaAbierta, peticion, setPeticion, onPreguntarIA }: PanelEcoProps) {
  return (
    iaAbierta ? (
        <aside
          aria-label="Eco"
          className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <div className="flex items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
            >
              <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--info-foreground)]">
                Propone · usted confirma
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIaAbierta(false)}
              aria-label="Cerrar Eco"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {asistente.conversacion.map((m) =>
              m.de === "docente" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[84%] rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                    {m.texto}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                  >
                    <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] leading-relaxed ${softText}`}>{m.texto}</p>

                    {m.alumnos && (
                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {m.alumnos.map((a) => (
                          <li
                            key={a.ini}
                            className="flex gap-2.5 rounded-[10px] border border-border px-2.5 py-2.5"
                          >
                            <Avatar ini={a.ini} size={30} />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[12px] font-bold">{a.nombre}</span>
                                <span className="inline-flex h-[18px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                                  {a.chip}
                                </span>
                              </span>
                              <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>
                                {a.porque}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {m.borrador && (
                      <div className="mt-2.5 rounded-[11px] border border-border bg-muted px-3.5 py-3">
                        <p className={`text-[12.5px] leading-relaxed ${softText}`}>{m.borrador}</p>
                      </div>
                    )}

                    {m.acciones && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.acciones.map((a) => (
                          <button
                            key={a.etiqueta}
                            type="button"
                            className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                              a.primaria
                                ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                                : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {a.primaria ? (
                              <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                            ) : (
                              <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
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

          <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {asistente.sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPreguntarIA(s)}
                  className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="mt-2.5 flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4"
              onSubmit={(e) => {
                e.preventDefault();
                onPreguntarIA(peticion);
                setPeticion("");
              }}
            >
              <span className="sr-only">Pedirle trabajo a Eco</span>
              <input
                type="text"
                value={peticion}
                onChange={(e) => setPeticion(e.target.value)}
                placeholder="Pídale trabajo a Eco…"
                className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
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
            onClick={() => setIaAbierta(true)}
            aria-label="Abrir Eco"
            className={`grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
          >
            <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.75} />
          </button>
          <span
            aria-hidden
            className={`${kicker} text-[color:var(--info-foreground)]`}
            style={{ writingMode: "vertical-rl" }}
          >
            Eco
          </span>
        </aside>
      )
  );
}

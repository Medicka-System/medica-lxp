"use client";

/**
 * Programar clase: grupo, tipo (Zoom / MiCo+), tema o lección, fecha, hora y duración.
 * Formulario simple en diálogo modal.
 */

import {
  Check,
  ChevronDown,
  Video,
  X,
} from "lucide-react";
import { mono, kicker, softText, focusRing, SondaIcon } from "./ui";
import type { TipoSesion } from "./tipos";

export type DialogoProgramarProps = {
  setProgramando: (v: boolean) => void;
  tipoNueva: TipoSesion;
  setTipoNueva: (t: TipoSesion) => void;
  onProgramarClase: () => void;
};

export function DialogoProgramar({ setProgramando, tipoNueva, setTipoNueva, onProgramarClase }: DialogoProgramarProps) {
  return (
    <div
          role="dialog"
          aria-modal="true"
          aria-label="Programar clase"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center gap-3 px-6 pb-1 pt-5">
              <div className="min-w-0 flex-1">
                <p className={`${kicker} text-secondary`}>Programar clase</p>
                <p className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.02em]">
                  Una sesión en vivo con su grupo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgramando(false)}
                aria-label="Cerrar"
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
              >
                <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 pt-4">
              <span className="block text-[11.5px] font-semibold">Tipo de sesión</span>
              <div className="mt-2 flex gap-2.5">
                {(
                  [
                    ["zoom", "Clase en Zoom", "Usted expone; la grabación cae sola en la lección."],
                    ["mico", "Ultrasonido en vivo · MiCo+", "Transmite desde el equipo Mindray. Se graba en el equipo."],
                  ] as const
                ).map(([id, titulo, sub]) => {
                  const on = tipoNueva === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTipoNueva(id)}
                      aria-pressed={on}
                      className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${focusRing} ${
                        on ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${
                          on ? "bg-primary text-[color:var(--sidebar)]" : `bg-muted ${softText}`
                        }`}
                      >
                        {id === "zoom" ? <Video className="h-4 w-4" strokeWidth={1.75} /> : <SondaIcon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug">{titulo}</span>
                        <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {(
                  [
                    ["Grupo", "Grupo B · Nov 2026 · 28 alumnos"],
                    ["Lección ligada (opcional)", "M04 · L5 · Doppler renal aplicado"],
                  ] as const
                ).map(([label, valor]) => (
                  <label key={label} className="min-w-[220px] flex-1">
                    <span className="block text-[11.5px] font-semibold">{label}</span>
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5">
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{valor}</span>
                      <ChevronDown aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="block text-[11.5px] font-semibold">Tema de la clase</span>
                <input
                  type="text"
                  defaultValue="Doppler renal: cuándo sí aporta"
                  className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors focus:border-secondary"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                {(
                  [
                    ["Fecha", "jue 25 de septiembre, 2026", "min-w-[220px] flex-[1.7]"],
                    ["Hora", "19:00", "min-w-[110px] flex-1"],
                    ["Duración", "90 min", "min-w-[110px] flex-1"],
                  ] as const
                ).map(([label, valor, ancho]) => (
                  <label key={label} className={ancho}>
                    <span className="block text-[11.5px] font-semibold">{label}</span>
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5">
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{valor}</span>
                      <ChevronDown aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-border bg-muted px-3.5 py-3">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2.4} />
                <p className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
                  {tipoNueva === "zoom"
                    ? "Se avisa a los alumnos y aparece en su calendario del campus. La liga de Zoom se genera al guardar."
                    : "Se avisa a los alumnos y se reserva el equipo. El enlace de MiCo+ se genera al guardar."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
                no choca con otra clase suya
              </span>
              <button
                type="button"
                onClick={() => setProgramando(false)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onProgramarClase}
                className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                Programar la clase
              </button>
            </div>
          </div>
        </div>
  );
}

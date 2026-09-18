"use client";

/**
 * Studio · layout del DOCENTE — navegación en el header, sin sidebar
 *
 * Secciones: Inicio · Validación · Grupos · Ateneo · Clases.
 * Utilidades a la derecha: buscar, notificaciones y cuenta.
 *
 * El docente NO entra al campus: el campus es la experiencia del alumno. Toda su docencia ocurre
 * aquí dentro, en su propia plataforma — por eso no hay salida al campus en el header.
 *
 * El badge de Validación lleva el conteo de casos en cola: es la cola que define su día.
 * El rol va bajo el wordmark ("Docente") para que nunca se confunda con el Studio del
 * diseñador instruccional, que tiene otras secciones.
 */

import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, Search } from "lucide-react";
import { mono, focusRingDark } from "@/components/tokens";

export type SeccionDocente =
  | "inicio"
  | "validacion"
  | "entregas"
  | "grupos"
  | "consultas"
  | "biblioteca"
  | "recursos"
  | "ateneo"
  | "clases";

export type ShellDocenteData = {
  docente: { nombre: string; ini: string };
  activa: SeccionDocente;
  casosEnCola: number;
  notificaciones: number;
};

const MOCK: ShellDocenteData = {
  docente: { nombre: "Dr. Sandoval", ini: "AS" },
  activa: "inicio",
  casosEnCola: 9,
  notificaciones: 7,
};

const SECCIONES: { id: SeccionDocente; etiqueta: string }[] = [
  { id: "inicio", etiqueta: "Inicio" },
  { id: "validacion", etiqueta: "Validación" },
  { id: "entregas", etiqueta: "Entregas" },
  { id: "grupos", etiqueta: "Grupos" },
  { id: "consultas", etiqueta: "Consultas" },
  { id: "biblioteca", etiqueta: "Biblioteca" },
  { id: "recursos", etiqueta: "Mis recursos" },
  { id: "ateneo", etiqueta: "Ateneo" },
  { id: "clases", etiqueta: "Clases" },
];


export default function ShellDocente({
  children,
  data = MOCK,
}: {
  children: ReactNode;
  data?: ShellDocenteData;
}) {
  const { docente, activa, casosEnCola, notificaciones } = data;
  const [seccion, setSeccion] = useState<SeccionDocente>(activa);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-2 bg-sidebar px-5">
        {/* marca + rol */}
        <span className="mr-1 flex shrink-0 items-center gap-2.5 border-r border-white/[0.14] pr-3">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[12px] font-extrabold text-[color:var(--sidebar)]"
          >
            MC
          </span>
          <span className="flex flex-col leading-[1.15]">
            <span className="text-[13.5px] font-bold text-sidebar-foreground">Studio</span>
            <span className="text-[10px] font-medium text-white/55">
              Docente · Médica Capacitación
            </span>
          </span>
        </span>

        <nav aria-label="Secciones del Studio" className="flex shrink-0 items-center">
          {SECCIONES.map((s) => {
            const on = seccion === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeccion(s.id)}
                aria-current={on ? "page" : undefined}
                className={`relative inline-flex h-[60px] items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] transition-colors ${focusRingDark} ${
                  on ? "font-bold text-sidebar-foreground" : "font-medium text-white/70 hover:text-white"
                }`}
              >
                {s.etiqueta}
                {s.id === "validacion" && casosEnCola > 0 && (
                  <span
                    aria-hidden
                    className={`${mono} grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10.5px] font-bold text-[color:var(--sidebar)]`}
                  >
                    {casosEnCola}
                  </span>
                )}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 bottom-0 h-[2.5px] rounded-t-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* utilidades globales */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label className="hidden h-[38px] w-[236px] shrink-0 items-center gap-2 rounded-[9px] border border-white/[0.18] bg-white/[0.08] px-3 lg:flex">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno, grupo o caso</span>
            <input
              type="search"
              placeholder="Buscar alumno, grupo o caso…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/55"
            />
          </label>

          <button
            type="button"
            aria-label={`Notificaciones (${notificaciones})`}
            className={`relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/[0.18] bg-white/[0.08] text-sidebar-foreground transition-colors hover:bg-white/[0.16] ${focusRingDark}`}
          >
            <Bell aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            {notificaciones > 0 && (
              <span
                aria-hidden
                className={`${mono} absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[color:var(--sidebar)] bg-primary px-1 text-[9.5px] font-bold text-[color:var(--sidebar)]`}
              >
                {notificaciones}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`flex h-[38px] shrink-0 items-center gap-2 rounded-full bg-white/[0.08] py-[3px] pl-[3px] pr-2.5 transition-colors hover:bg-white/[0.16] ${focusRingDark}`}
          >
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11.5px] font-bold text-[color:var(--sidebar)]"
            >
              {docente.ini}
            </span>
            <span className="flex flex-col text-left leading-[1.15]">
              <span className="whitespace-nowrap text-[12px] font-semibold text-sidebar-foreground">
                {docente.nombre}
              </span>
              <span className="whitespace-nowrap text-[9.5px] text-white/55">Docente</span>
            </span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 text-white/60" strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

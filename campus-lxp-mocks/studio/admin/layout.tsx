"use client";

/**
 * Studio · layout del SÚPER ADMIN — navegación en el header, sin sidebar
 *
 * Secciones: Inicio · Grupos · Alumnos · Staff · Analítica · Configuración.
 * "Configuración" es solo de este rol y lleva candado: ahí viven usuarios y roles, IA/Eco,
 * integraciones, académico global, marca, almacenamiento/LRS, notificaciones, seguridad y
 * auditoría, y badges y reconocimientos.
 *
 * Utilidades: acceso a Eco, buscar, notificaciones y cuenta. El contador de la campana usa rojo
 * solo cuando hay una alerta crítica (integración caída).
 */

import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, Lock, Search, ShieldCheck } from "lucide-react";
import { mono, focusRingDark } from "@/components/tokens";

export type SeccionAdmin = "inicio" | "grupos" | "alumnos" | "staff" | "analitica" | "configuracion";

export type ShellAdminData = {
  admin: { nombre: string; ini: string };
  activa: SeccionAdmin;
  notificaciones: number;
  hayAlertaCritica: boolean;
};

const MOCK: ShellAdminData = {
  admin: { nombre: "Rodrigo V.", ini: "RV" },
  activa: "inicio",
  notificaciones: 3,
  hayAlertaCritica: true,
};

const SECCIONES: { id: SeccionAdmin; etiqueta: string; soloAdmin?: boolean }[] = [
  { id: "inicio", etiqueta: "Inicio" },
  { id: "grupos", etiqueta: "Grupos" },
  { id: "alumnos", etiqueta: "Alumnos" },
  { id: "staff", etiqueta: "Staff" },
  { id: "analitica", etiqueta: "Analítica" },
  { id: "configuracion", etiqueta: "Configuración", soloAdmin: true },
];


export default function ShellAdmin({
  children,
  data = MOCK,
}: {
  children: ReactNode;
  data?: ShellAdminData;
}) {
  const { admin, activa, notificaciones, hayAlertaCritica } = data;
  const [seccion, setSeccion] = useState<SeccionAdmin>(activa);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-2 bg-sidebar px-5">
        <span className="mr-1 flex shrink-0 items-center gap-2.5 border-r border-white/[0.14] pr-3.5">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-[12px] font-extrabold text-[color:var(--sidebar)]"
          >
            MC
          </span>
          <span className="flex flex-col leading-[1.15]">
            <span className="text-[13.5px] font-bold text-sidebar-foreground">Studio</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
              <ShieldCheck aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Súper admin
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
                className={`relative inline-flex h-[60px] items-center gap-1.5 whitespace-nowrap px-3 text-[13.5px] transition-colors ${focusRingDark} ${
                  on ? "font-bold text-sidebar-foreground" : "font-medium text-white/70 hover:text-white"
                }`}
              >
                {s.etiqueta}
                {s.soloAdmin && (
                  <Lock aria-hidden className="h-3 w-3 text-white/50" strokeWidth={2} />
                )}
                {on && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-t-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
              <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
            </svg>
            Eco
          </button>

          <label className="hidden h-[38px] w-[200px] shrink-0 items-center gap-2 rounded-[9px] border border-white/[0.18] bg-white/[0.08] px-3 lg:flex">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-white/60" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno, grupo o staff</span>
            <input
              type="search"
              placeholder="Buscar alumno, grupo, staff…"
              className="w-full min-w-0 bg-transparent text-[12px] text-white outline-none placeholder:text-white/55"
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
                className={`${mono} absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[color:var(--sidebar)] px-1 text-[9.5px] font-bold ${
                  hayAlertaCritica
                    ? "bg-[color:var(--destructive-foreground)] text-white"
                    : "bg-primary text-[color:var(--sidebar)]"
                }`}
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
              {admin.ini}
            </span>
            <span className="flex flex-col text-left leading-[1.15]">
              <span className="whitespace-nowrap text-[12px] font-semibold text-sidebar-foreground">
                {admin.nombre}
              </span>
              <span className="whitespace-nowrap text-[9.5px] text-white/55">Súper admin</span>
            </span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 text-white/60" strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

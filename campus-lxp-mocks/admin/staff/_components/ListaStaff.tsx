"use client";

/**
 * Lista global del staff (docentes, diseñadores, admins): totales por rol, filtros, buscador y
 * tabla con rol, grupos o programas a cargo, carga de trabajo y estado. Alta de staff.
 */

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { mono, softText, focusRing, Avatar, ChipRol, ChipEstado, TRACKS } from "./ui";
import type { Rol, MiembroStaff, StaffData } from "./tipos";

export type ListaStaffProps = {
  totales: StaffData["totales"];
  detalleTotales: StaffData["detalleTotales"];
  conteos: Record<string, number>;
  staff: MiembroStaff[];
  vista: "lista" | "detalle";
  filtroRol: "todos" | Rol;
  setFiltroRol: (r: "todos" | Rol) => void;
  busca: string;
  setBusca: (v: string) => void;
  onAbrirMiembro: (id: string) => void;
  onInvitar: () => void;
  onFiltrar: (f: string) => void;
  onPreguntarEco: (q: string) => void;
  visibles: MiembroStaff[];
};

export function ListaStaff({ totales, detalleTotales, conteos, staff, vista, filtroRol, setFiltroRol, busca, setBusca, onAbrirMiembro, onInvitar, onFiltrar, onPreguntarEco, visibles }: ListaStaffProps) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Staff</h1>
            {/* la frontera con Configuración se declara */}
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta y roles: Configuración
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Quién es staff, qué rol tiene y cómo va su carga. Esta es la vista operativa: el alta y el
            cambio de rol se hacen en Configuración.
          </p>
        </div>

        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => onPreguntarEco("¿qué docente tiene más carga?")}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
          <button
            type="button"
            onClick={onInvitar}
            className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Invitar a alguien
            <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* totales: carga y respuesta, no productividad */}
      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Staff activo", totales.activo, detalleTotales.activo, false],
            ["Con sobrecarga", totales.sobrecarga, detalleTotales.sobrecarga, true],
            ["Casos validados esta semana", totales.validados, detalleTotales.validados, false],
            ["Respuesta media", totales.respuesta, detalleTotales.respuesta, false],
          ] as const
        ).map(([t, v, s, warn]) => (
          <li
            key={t}
            className={`rounded-xl border p-4 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
              warn
                ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                : "border-border bg-card"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {t}
            </p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>
              {v}
            </p>
            <p
              className={`mt-1.5 text-[11px] leading-snug ${
                warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {s}
            </p>
          </li>
        ))}
      </ul>

      {/* filtros por rol y estado */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre o área</span>
          <input
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Buscar por nombre o área…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["todos", "Todos", conteos.todos],
              ["docente", "Docentes", conteos.docentes],
              ["disenador", "Diseñadores", conteos.disenadores],
              ["admin", "Admins", conteos.admins],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltroRol(id)}
              aria-pressed={filtroRol === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtroRol === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtroRol === id ? "text-white/70" : "text-muted-foreground"}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onFiltrar("estado")}
          className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
        >
          Cualquier estado
          <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {conteos.todos + 1} · incluye {staff.filter((s) => !s.activo).length} inactivo
        </span>
      </div>

      {/* tabla: encabezado y filas comparten las mismas pistas */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div
          className="grid items-center gap-3.5 bg-muted px-[18px] py-2.5"
          style={{ gridTemplateColumns: TRACKS }}
        >
          {(
            [
              ["Persona", ""],
              ["Rol y estado", ""],
              ["A su cargo", ""],
              ["Actividad reciente", ""],
              ["Última sesión", ""],
              ["", "text-right"],
            ] as const
          ).map(([t, extra]) => (
            <span
              key={t || "acc"}
              className={`min-w-0 ${extra} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
            >
              {t}
            </span>
          ))}
        </div>

        {visibles.map((s) => (
          <div
            key={s.id}
            className={`grid items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
              s.senal && s.activo ? "bg-[#fffdf7]" : ""
            }`}
            style={{ gridTemplateColumns: TRACKS }}
          >
            <button
              type="button"
              onClick={() => onAbrirMiembro(s.id)}
              title="Ver su detalle"
              className={`flex min-w-0 items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
            >
              <Avatar ini={s.ini} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-snug">{s.nombre}</span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                  {s.area}
                </span>
              </span>
            </button>

            <span className="flex min-w-0 flex-col items-start gap-1.5">
              <ChipRol rol={s.rol} />
              <ChipEstado activo={s.activo} />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold">{s.cargo}</span>
              {s.senal && (
                <span className="mt-0.5 block text-[10.5px] font-semibold text-[color:var(--warning-foreground)]">
                  {s.senal}
                </span>
              )}
            </span>

            <span className={`min-w-0 truncate text-[12px] ${softText}`}>{s.actividad}</span>

            <span
              className={`${mono} whitespace-nowrap text-[11px] ${
                s.ultimaAlerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {s.ultimaSesion}
            </span>

            <span className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label={`Más acciones de ${s.nombre}`}
                className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <ChevronRight
                aria-hidden
                className="h-[15px] w-[15px] shrink-0 text-[color:var(--track)]"
                strokeWidth={2}
              />
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

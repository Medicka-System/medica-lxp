"use client";

/**
 * Lista global de alumnos (transversal a todos los grupos): totales, filtros por programa, grupo,
 * generación y estado, "solo en riesgo", buscador y tabla con avance, competencia, estado y última
 * actividad. Eco a la derecha. Los en riesgo se destacan en ámbar para intervención.
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Lock,
  MoreHorizontal,
  Search,
  Sparkles,
} from "lucide-react";
import { mono, softText, focusRing, ESTADO, Avatar, Barra } from "./ui";
import type { AlumnoFila, AlumnosData } from "./tipos";

export type ListaAlumnosProps = {
  totales: AlumnosData["totales"];
  detalleTotales: AlumnosData["detalleTotales"];
  alumnos: AlumnoFila[];
  soloRiesgo: boolean;
  setSoloRiesgo: (v: boolean | ((x: boolean) => boolean)) => void;
  busca: string;
  setBusca: (v: string) => void;
  onAbrirAlumno: (id: string) => void;
  onFiltrar: (f: string) => void;
  onPreguntarEco: (q: string) => void;
  onExportar: () => void;
  visibles: AlumnoFila[];
};

export function ListaAlumnos({ totales, detalleTotales, alumnos, soloRiesgo, setSoloRiesgo, busca, setBusca, onAbrirAlumno, onFiltrar, onPreguntarEco, onExportar, visibles }: ListaAlumnosProps) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Alumnos</h1>
            {/* la frontera con el ERP se declara donde se puede confundir */}
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta e inscripción: CORA
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Los {totales.activos} alumnos de la escuela, de todos los programas. Aquí se consulta y se
            da seguimiento a su avance en el campus.
          </p>
        </div>

        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => onPreguntarEco("¿qué alumnos están en riesgo?")}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
          <button
            type="button"
            onClick={onExportar}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Exportar
          </button>
        </div>
      </div>

      {/* totales; el de riesgo es el único ámbar */}
      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Alumnos activos", totales.activos, detalleTotales.activos, false],
            ["En riesgo", totales.enRiesgo, detalleTotales.enRiesgo, true],
            ["Avance medio", totales.avanceMedio, detalleTotales.avanceMedio, false],
            ["Competencia media", totales.competenciaMedia, detalleTotales.competenciaMedia, false],
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

      {/* filtros: transversal a programas, grupos y generaciones */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[270px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre o matrícula</span>
          <input
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Buscar por nombre o matrícula…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        {["Cualquier programa", "Cualquier grupo", "Generación", "Estado"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onFiltrar(t)}
            className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            {t}
            <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSoloRiesgo((v) => !v)}
          aria-pressed={soloRiesgo}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[12.5px] font-bold transition-colors ${focusRing} ${
            soloRiesgo
              ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
              : `border-border bg-card ${softText}`
          }`}
        >
          <AlertTriangle aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          Solo en riesgo · {totales.enRiesgo}
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {soloRiesgo ? totales.enRiesgo : totales.activos}
          {soloRiesgo ? " en riesgo" : " · sin filtros"}
        </span>
      </div>

      {/* tabla */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ["Alumno", "flex-[1.5]"],
              ["Programa y grupo", "flex-[1.2] min-w-0"],
              ["Avance del curso", "shrink-0 w-[132px]"],
              ["I-AIM", "shrink-0 w-[74px] text-center"],
              ["Estado y señal", "shrink-0 w-[196px]"],
              ["Última actividad", "shrink-0 w-[118px]"],
              ["", "shrink-0 w-[62px]"],
            ] as const
          ).map(([t, cls]) => (
            <span
              key={t || "acc"}
              className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
            >
              {t}
            </span>
          ))}
        </div>

        {visibles.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
              a.estado === "riesgo" ? "bg-[#fffdf7]" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onAbrirAlumno(a.id)}
              title="Ver su expediente"
              className={`flex min-w-0 flex-[1.5] items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
            >
              <Avatar ini={a.ini} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                  {a.matricula}
                </span>
              </span>
            </button>

            <span className="min-w-0 flex-[1.2]">
              <span className="block truncate text-[12px] font-semibold">{a.programa}</span>
              <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                {a.grupo}
              </span>
            </span>

            <span className="w-[132px] shrink-0">
              <Barra pct={a.avance} />
            </span>

            <span className="w-[74px] shrink-0 text-center">
              <span
                className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                  a.competencia >= 70
                    ? "bg-accent text-accent-foreground"
                    : a.competencia >= 55
                      ? `bg-muted ${softText}`
                      : "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                }`}
              >
                {a.competencia}
              </span>
            </span>

            <span className="w-[196px] shrink-0">
              <span
                className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}
              >
                {a.estado === "riesgo" && (
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                )}
                {ESTADO[a.estado].etiqueta}
              </span>
              {a.senal && (
                <span
                  className={`mt-1 block text-[10.5px] ${
                    a.senalDeCORA
                      ? "text-[color:var(--destructive-foreground)]"
                      : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {a.senal}
                </span>
              )}
            </span>

            <span
              className={`${mono} w-[118px] shrink-0 whitespace-nowrap text-[11px] ${
                a.ultimaAlerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {a.ultimaActividad}
            </span>

            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={`Más acciones de ${a.nombre}`}
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

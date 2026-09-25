"use client";

/**
 * Detalle de un grupo: cabecera con el límite de rol declarado (no configura el grupo; lo
 * administrativo vive en CORA), resumen, lista de alumnos con su señal de riesgo y acciones
 * (consulta, bitácora, casos, avance a detalle).
 */

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  MessageCircle,
  MoreHorizontal,
  NotebookText,
  ScanLine,
  Search,
  TriangleAlert,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, Avatar } from "./ui";
import type { GrupoDocente, AlumnoSeguimiento, GruposData } from "./tipos";

export type DetalleGrupoProps = {
  detalle: GruposData["detalle"];
  setVista: (v: "lista" | "detalle") => void;
  filtroAlumnos: "atencion" | "todos" | "sin-actividad" | "al-dia";
  setFiltroAlumnos: (v: "atencion" | "todos" | "sin-actividad" | "al-dia") => void;
  busca: string;
  setBusca: (v: string) => void;
  onAbrirAlumno: (id: string) => void;
  onEnviarConsulta: (ids: string[]) => void;
  onVerBitacora: (id: string) => void;
  onVerCasos: (id: string) => void;
  onFiltrar: (f: string) => void;
  grupoAbierto: GrupoDocente;
  alumnosVisibles: AlumnoSeguimiento[];
};

export function DetalleGrupo({ detalle, setVista, filtroAlumnos, setFiltroAlumnos, busca, setBusca, onAbrirAlumno, onEnviarConsulta, onVerBitacora, onVerCasos, onFiltrar, grupoAbierto, alumnosVisibles }: DetalleGrupoProps) {
  return (
    <div className="min-w-0 flex-1">
        {/* cabecera + límite de rol declarado */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a mis grupos"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">
              {grupoAbierto.nombre}
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {grupoAbierto.programa} · {grupoAbierto.modalidad} · {grupoAbierto.alumnos} alumnos ·
              cursando {grupoAbierto.moduloEnCurso}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-2.5">
            <span
              className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Inscripción y calificaciones oficiales: CORA
            </span>
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Consultarlo en CORA
              <ExternalLink aria-hidden className="h-3 w-3" strokeWidth={1.75} />
            </button>
          </span>
        </div>

        {/* cuatro cifras de seguimiento */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {detalle.resumen.map((r) => (
            <div
              key={r.etiqueta}
              className={`rounded-xl border bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
                r.atencion ? "border-[color:var(--warning-border)]" : "border-border"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  r.atencion ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                }`}
              >
                {r.etiqueta}
              </p>
              <p
                className={`${mono} mt-2 text-[26px] font-extrabold leading-none tracking-[-0.02em] ${
                  r.atencion ? "text-[color:var(--warning-foreground)]" : ""
                }`}
              >
                {r.valor}
              </p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{r.nota}</p>
            </div>
          ))}
        </div>

        {/* filtros de alumnos: el trabajo real arranca en "requieren atención" */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Alumnos</h2>
          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ["atencion", "Requieren atención", detalle.conteos.atencion],
                ["todos", "Todos", detalle.conteos.todos],
                ["sin-actividad", "Sin actividad", detalle.conteos.sinActividad],
                ["al-dia", "Al día", detalle.conteos.alDia],
              ] as const
            ).map(([id, etiqueta, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFiltroAlumnos(id);
                  onFiltrar(id);
                }}
                aria-pressed={filtroAlumnos === id}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                  filtroAlumnos === id
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {etiqueta}
                <span
                  className={`${mono} font-bold ${
                    filtroAlumnos === id ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
          <label className="ml-auto flex h-9 w-[220px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold ${softText} ${focusRing}`}
          >
            Ordenar: riesgo primero
            <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        {/* acción en lote cuando el filtro es el de intervención */}
        {filtroAlumnos === "atencion" && detalle.conteos.atencion > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
            <TriangleAlert
              aria-hidden
              className="h-[17px] w-[17px] shrink-0 text-[color:var(--warning-foreground)]"
              strokeWidth={2}
            />
            <p className="min-w-[260px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              <span className="font-bold">
                {detalle.conteos.atencion} de {detalle.conteos.todos} necesitan que usted intervenga.
              </span>{" "}
              Dos no entran desde hace más de una semana, uno reprobó dos veces la autoevaluación y otro
              lleva dos casos rechazados seguidos.
            </p>
            <button
              type="button"
              onClick={() => onEnviarConsulta(alumnosVisibles.map((a) => a.id))}
              className={`h-10 shrink-0 whitespace-nowrap rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              Mandarles consulta a los {detalle.conteos.atencion}
            </button>
          </div>
        )}

        {/* tabla de seguimiento */}
        <section className={`${card} mt-3 overflow-hidden`}>
          <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
            {(
              [
                ["Alumno", "flex-[1.5]"],
                ["Avance del programa", "flex-[1.1] min-w-0"],
                ["Casos / validados", "shrink-0 w-[84px] text-center"],
                ["Entregas", "shrink-0 w-[74px] text-center"],
                ["I-AIM", "shrink-0 w-[62px] text-center"],
                ["Señal de intervención", "shrink-0 w-[238px]"],
                ["", "shrink-0 w-[150px]"],
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

          {alumnosVisibles.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
                a.senal ? "bg-[#fffdf7]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onAbrirAlumno(a.id)}
                className={`flex min-w-0 flex-[1.5] items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
                title="Ver su avance a detalle"
              >
                <Avatar ini={a.ini} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className={`${mono} text-[10.5px] text-muted-foreground`}>
                      {a.moduloEnCurso}
                    </span>
                    <span
                      className={`text-[10.5px] ${
                        a.sinActividad
                          ? "font-semibold text-[color:var(--warning-foreground)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {a.ultimaActividad}
                    </span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-[15px] w-[15px] shrink-0 text-[color:var(--track)]"
                  strokeWidth={2}
                />
              </button>

              <span className="flex min-w-0 flex-[1.1] items-center gap-2">
                <span className="h-1.5 min-w-[52px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className={`block h-full rounded-full ${
                      a.senal ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${a.avance}%` }}
                  />
                </span>
                <span className={`${mono} shrink-0 text-[12px] font-bold`}>{a.avance}%</span>
              </span>

              <span className={`${mono} w-[84px] shrink-0 text-center text-[12px] font-semibold`}>
                {a.casosSubidos} / {a.casosValidados}
              </span>
              <span className={`${mono} w-[74px] shrink-0 text-center text-[12px] font-semibold`}>
                {a.entregas}
              </span>
              <span className="w-[62px] shrink-0 text-center">
                <span
                  className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                    a.competencia >= 65
                      ? "bg-accent text-accent-foreground"
                      : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {a.competencia}
                </span>
              </span>

              {/* el motivo en palabras, no un puntaje */}
              <span className="w-[238px] shrink-0">
                {a.senal ? (
                  <span className="inline-flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[color:var(--warning-foreground)]">
                    <TriangleAlert aria-hidden className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {a.senal.motivo}
                  </span>
                ) : (
                  <span className={`${mono} text-[11px] text-muted-foreground`}>—</span>
                )}
              </span>

              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => onEnviarConsulta([a.id])}
                  aria-label={`Mandarle una consulta a ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerCasos(a.id)}
                  aria-label={`Ver los casos de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ScanLine aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerBitacora(a.id)}
                  aria-label={`Ver la bitácora de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <NotebookText aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Más acciones de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                >
                  <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </span>
            </div>
          ))}

          {filtroAlumnos !== "atencion" && (
            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-[18px] py-3">
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {alumnosVisibles.length} de {detalle.conteos.todos} alumnos
              </span>
              <button
                type="button"
                className={`ml-auto h-[34px] rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary ${focusRing}`}
              >
                Ver a los {detalle.conteos.todos}
              </button>
            </div>
          )}

          {alumnosVisibles.length === 0 && (
            <div className="border-t border-border px-6 py-10 text-center">
              <p className="text-[14px] font-bold">Nadie en esta lista</p>
              <p className={`mt-1.5 text-[12.5px] ${softText}`}>
                Con este filtro no queda ningún alumno. Pruebe con “Todos”.
              </p>
            </div>
          )}
        </section>
      </div>
  );
}

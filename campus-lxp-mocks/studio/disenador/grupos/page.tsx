"use client";

/**
 * Studio · Grupos — lista de instancias
 *
 * Modelo: un PROGRAMA es la plantilla; un GRUPO es una instancia = programa + fechas + alumnos +
 * docente. El grupo NO copia el contenido: lo hereda y guarda solo lo suyo (nombre, modalidad,
 * calendario de liberación, docente) más sus personalizaciones puntuales (overrides).
 *
 * UNA sola señal de herencia, repetida en todo el área:
 *   gris + eslabón  = Heredado / Estándar (se actualiza cuando se corrige el programa)
 *   violeta (info)  = Personalizado en este grupo (no se toca)
 *   ámbar           = el programa base cambió justo ahí: hay que decidir
 * El rojo no aparece: personalizar no es un error.
 *
 * Alumnos, inscripciones y calificaciones son fuente de verdad de CORA (ERP): aquí solo se consultan.
 *
 * Stubs: onNuevoGrupo · onAbrirGrupo
 */

import { useMemo, useState } from "react";
import { ChevronDown, Link2, Lock, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { mono, kicker, softText, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Modalidad = "sincrono" | "asincrono";
export type EstadoGrupo = "proximo" | "curso" | "finalizado";

export type GrupoResumen = {
  id: string;
  nombre: string;
  /** Portada del grupo. Se configura DENTRO del grupo; aquí solo se muestra. Siempre 16:9. */
  portada?: { url: string; alt: string };
  programa: string;
  programaId: string;
  versionProgramaa: string;
  modalidad: Modalidad;
  fechas?: { inicio: string; fin: string };
  docente?: string;
  alumnos: number;
  estado: EstadoGrupo;
  overrides: number;
  resincronizacionPendiente?: boolean;
};

export type GruposData = { grupos: GrupoResumen[] };

const MOCK: GruposData = {
  grupos: [
    { id: "g1", nombre: "Grupo B · Nov 2026", programa: "Ultrasonografía Médica", programaId: "p1", versionProgramaa: "v3", modalidad: "sincrono", fechas: { inicio: "4 feb 2026", fin: "12 dic 2026" }, docente: "Dr. Alejandro Sandoval", alumnos: 28, estado: "curso", overrides: 3, resincronizacionPendiente: true },
    { id: "g2", nombre: "Grupo A · Feb 2026", programa: "Ultrasonografía Médica", programaId: "p1", versionProgramaa: "v3", modalidad: "sincrono", fechas: { inicio: "2 feb 2026", fin: "10 dic 2026" }, docente: "Dra. Karla Lugo", alumnos: 31, estado: "curso", overrides: 0 },
    { id: "g3", nombre: "Obstétrico · Cohorte 4", programa: "Ultrasonido Obstétrico", programaId: "p2", versionProgramaa: "v2", modalidad: "sincrono", fechas: { inicio: "9 mar 2026", fin: "28 ago 2026" }, docente: "Dra. Mariana Peña", alumnos: 22, estado: "curso", overrides: 1 },
    { id: "g4", nombre: "POCUS · Libre", programa: "POCUS en Urgencias", programaId: "p3", versionProgramaa: "v5", modalidad: "asincrono", docente: "Dr. Hugo Cuevas", alumnos: 47, estado: "curso", overrides: 0 },
    { id: "g5", nombre: "Grupo C · Ene 2027", programa: "Ultrasonografía Médica", programaId: "p1", versionProgramaa: "v3", modalidad: "sincrono", fechas: { inicio: "11 ene 2027", fin: "17 dic 2027" }, alumnos: 0, estado: "proximo", overrides: 0 },
    { id: "g6", nombre: "Doppler · Cohorte 2", programa: "Doppler Vascular", programaId: "p4", versionProgramaa: "v4", modalidad: "sincrono", fechas: { inicio: "6 abr 2026", fin: "30 oct 2026" }, docente: "Dr. Hugo Cuevas", alumnos: 14, estado: "curso", overrides: 2 },
    { id: "g7", nombre: "MSK · Piloto", programa: "Ultrasonido Musculoesquelético", programaId: "p5", versionProgramaa: "v1", modalidad: "asincrono", docente: "Dra. Renata Salas", alumnos: 9, estado: "curso", overrides: 4 },
    { id: "g8", nombre: "Obstétrico · Cohorte 3", programa: "Ultrasonido Obstétrico", programaId: "p2", versionProgramaa: "v2", modalidad: "sincrono", fechas: { inicio: "10 feb 2025", fin: "31 jul 2025" }, docente: "Dra. Mariana Peña", alumnos: 25, estado: "finalizado", overrides: 1 },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<EstadoGrupo, { texto: string; clase: string }> = {
  curso: { texto: "En curso", clase: "bg-accent text-accent-foreground" },
  proximo: {
    texto: "Próximo",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
  finalizado: { texto: "Finalizado", clase: "border border-border bg-muted text-muted-foreground" },
};

/** La señal de herencia — se reutiliza en el detalle del grupo. */
export function SelloHerencia({ overrides }: { overrides: number }) {
  if (overrides === 0) {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold text-muted-foreground">
        <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
        Estándar
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
      <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      Personalizado · {overrides} cambios
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Grupos({ data = MOCK }: { data?: GruposData }) {
  const { grupos } = data;
  const [busca, setBusca] = useState("");
  const [programa, setPrograma] = useState("Todos");
  const [estado, setEstado] = useState<"todos" | EstadoGrupo>("todos");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNuevoGrupo = () => {};
  const onAbrirGrupo = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos = useMemo(
    () => ({
      todos: grupos.length,
      curso: grupos.filter((g) => g.estado === "curso").length,
      proximo: grupos.filter((g) => g.estado === "proximo").length,
      finalizado: grupos.filter((g) => g.estado === "finalizado").length,
    }),
    [grupos],
  );

  const personalizados = grupos.filter((g) => g.overrides > 0).length;

  const visibles = useMemo(
    () =>
      grupos.filter(
        (g) =>
          (estado === "todos" || g.estado === estado) &&
          (programa === "Todos" || g.programa === programa) &&
          (!busca.trim() || g.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [grupos, estado, programa, busca],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-8 pt-6">
      <div className="flex flex-wrap items-center justify-end gap-3.5">
        <button
          type="button"
          onClick={onNuevoGrupo}
          className={`ml-auto inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Nuevo grupo
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[290px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar grupo</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar grupo…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <label className="flex h-10 items-center gap-2 rounded-[9px] border border-border bg-card px-3">
          <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>Programa</span>
          <select
            value={programa}
            onChange={(e) => setPrograma(e.target.value)}
            className="appearance-none bg-transparent pr-1 text-[13px] font-semibold text-foreground outline-none"
          >
            {["Todos", ...new Set(grupos.map((g) => g.programa))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["todos", "Todos"],
              ["curso", "En curso"],
              ["proximo", "Próximos"],
              ["finalizado", "Finalizados"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setEstado(id)}
              aria-pressed={estado === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                estado === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${estado === id ? "text-white/70" : "text-muted-foreground"}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <span className="ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12px] font-semibold text-[color:var(--info-foreground)]">
          <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          {personalizados} con personalizaciones
        </span>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ["Portada · grupo · programa base", "left"],
                  ["Modalidad", "left"],
                  ["Fechas", "left"],
                  ["Docente", "left"],
                  ["Alumnos", "right"],
                  ["Estado", "left"],
                  ["Contenido", "left"],
                  ["", "right"],
                ] as const
              ).map(([t, a]) => (
                <th
                  key={t}
                  style={{ textAlign: a }}
                  className="whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => onAbrirGrupo(g.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="relative w-14 shrink-0 overflow-hidden rounded-[7px] bg-sidebar"
                      style={{ aspectRatio: "16 / 9" }}
                    >
                      {g.portada ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.portada.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="absolute inset-0"
                          style={{
                            background:
                              "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)",
                          }}
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{g.nombre}</span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <Link2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-[11.5px] text-muted-foreground">{g.programa}</span>
                        <span className={`${mono} text-[11px] text-muted-foreground`}>
                          {g.versionProgramaa}
                        </span>
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}>
                    {g.modalidad === "sincrono" ? "Síncrono" : "Asíncrono"}
                  </span>
                </td>
                <td
                  className={`${mono} whitespace-nowrap px-3 py-3.5 text-[12px] ${
                    g.fechas ? softText : "text-muted-foreground"
                  }`}
                >
                  {g.fechas ? `${g.fechas.inicio} – ${g.fechas.fin}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px]">
                  {g.docente ? (
                    <span className={softText}>{g.docente}</span>
                  ) : (
                    <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                      Sin asignar
                    </span>
                  )}
                </td>
                <td
                  className={`${mono} px-3 py-3.5 text-right text-[13px] font-semibold ${
                    g.alumnos ? "" : "text-muted-foreground"
                  }`}
                >
                  {g.alumnos || "—"}
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[g.estado].clase}`}
                  >
                    {ESTADO[g.estado].texto}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <SelloHerencia overrides={g.overrides} />
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    aria-label={`Más acciones de ${g.nombre}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* CORA es la fuente de verdad de inscripciones */}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <span
          aria-hidden
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <Lock className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>
          Alumnos, inscripciones y calificaciones son fuente de verdad de{" "}
          <span className="font-bold text-foreground">CORA</span>: aquí se consultan. Lo editable del
          grupo es sus datos, el calendario de liberación, el docente y sus personalizaciones de
          contenido.
        </p>
      </div>
    </div>
  );
}

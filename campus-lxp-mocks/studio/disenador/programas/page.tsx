"use client";

/**
 * Studio · Programas — lista del course builder
 *
 * Un PROGRAMA es la plantilla / fuente de verdad viva: temario, módulos y horas. Los grupos son
 * instancias y viven en su propia área (Grupos); aquí NO hay herencia ni overrides.
 *
 * Tabla, no galería: el diseñador compara 11 programas por estado, módulos, horas y grupos que
 * derivan — eso se lee mejor en columnas alineadas, con las cifras en mono.
 *
 * Stubs: onNuevoPrograma · onAbrirPrograma
 */

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { mono, softText, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoPrograma = "publicado" | "borrador" | "revision";

export type ProgramaResumen = {
  id: string;
  nombre: string;
  horas: number;
  modulos: number;
  gruposActivos: number;
  estado: EstadoPrograma;
  ultimaEdicion: string;
  editadoPor: string;
};

export type ProgramasData = { programas: ProgramaResumen[] };

const MOCK: ProgramasData = {
  programas: [
    { id: "p1", nombre: "Ultrasonografía Médica", horas: 1000, modulos: 12, gruposActivos: 8, estado: "borrador", ultimaEdicion: "hace 12 min", editadoPor: "Mariana V." },
    { id: "p2", nombre: "Ultrasonido Obstétrico", horas: 600, modulos: 8, gruposActivos: 3, estado: "publicado", ultimaEdicion: "ayer", editadoPor: "Karla L." },
    { id: "p3", nombre: "POCUS en Urgencias", horas: 420, modulos: 7, gruposActivos: 2, estado: "publicado", ultimaEdicion: "hace 3 días", editadoPor: "Mariana V." },
    { id: "p4", nombre: "Doppler Vascular", horas: 380, modulos: 6, gruposActivos: 1, estado: "publicado", ultimaEdicion: "hace 4 días", editadoPor: "Hugo C." },
    { id: "p5", nombre: "Ultrasonido Musculoesquelético", horas: 340, modulos: 6, gruposActivos: 1, estado: "revision", ultimaEdicion: "hace 5 días", editadoPor: "Mariana V." },
    { id: "p6", nombre: "Ultrasonido de Mama", horas: 300, modulos: 5, gruposActivos: 1, estado: "publicado", ultimaEdicion: "hace 1 semana", editadoPor: "Karla L." },
    { id: "p7", nombre: "Ecocardiografía Básica", horas: 280, modulos: 5, gruposActivos: 0, estado: "publicado", ultimaEdicion: "hace 1 semana", editadoPor: "Hugo C." },
    { id: "p8", nombre: "Ultrasonido Tiroideo y Cuello", horas: 220, modulos: 4, gruposActivos: 0, estado: "publicado", ultimaEdicion: "hace 2 semanas", editadoPor: "Mariana V." },
    { id: "p9", nombre: "Ultrasonido Pediátrico", horas: 200, modulos: 4, gruposActivos: 0, estado: "publicado", ultimaEdicion: "hace 2 semanas", editadoPor: "Karla L." },
    { id: "p10", nombre: "Intervencionismo Guiado", horas: 180, modulos: 3, gruposActivos: 0, estado: "borrador", ultimaEdicion: "hace 3 semanas", editadoPor: "Mariana V." },
    { id: "p11", nombre: "Fundamentos de Física del US", horas: 120, modulos: 3, gruposActivos: 0, estado: "publicado", ultimaEdicion: "hace 1 mes", editadoPor: "Hugo C." },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<EstadoPrograma, { texto: string; clase: string }> = {
  publicado: { texto: "Publicado", clase: "bg-accent text-accent-foreground" },
  borrador: {
    texto: "Borrador",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  revision: {
    texto: "En revisión",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
};

export function ChipEstado({ estado }: { estado: EstadoPrograma }) {
  const e = ESTADO[estado];
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${e.clase}`}
    >
      {e.texto}
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Programas({ data = MOCK }: { data?: ProgramasData }) {
  const { programas } = data;
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | EstadoPrograma>("todos");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNuevoPrograma = () => {};
  const onAbrirPrograma = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos = useMemo(
    () => ({
      todos: programas.length,
      publicado: programas.filter((p) => p.estado === "publicado").length,
      borrador: programas.filter((p) => p.estado === "borrador").length,
      revision: programas.filter((p) => p.estado === "revision").length,
    }),
    [programas],
  );

  const visibles = useMemo(
    () =>
      programas.filter(
        (p) =>
          (filtro === "todos" || p.estado === filtro) &&
          (!busca.trim() || p.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [programas, filtro, busca],
  );

  const horasTotales = programas.reduce((s, p) => s + p.horas, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-8 pt-6">
      <div className="flex flex-wrap items-center justify-end gap-3.5">
        <button
          type="button"
          onClick={onNuevoPrograma}
          className={`ml-auto inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Nuevo programa
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[320px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar programa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar programa…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["todos", "Todos"],
              ["publicado", "Publicados"],
              ["borrador", "Borradores"],
              ["revision", "En revisión"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtro === id ? "text-white/70" : "text-muted-foreground"}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {programas.length} programas · {horasTotales.toLocaleString("es-MX")} h en total
        </span>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ["Programa", "left"],
                  ["Estado", "left"],
                  ["Módulos", "right"],
                  ["Horas", "right"],
                  ["Grupos", "right"],
                  ["Última edición", "left"],
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
            {visibles.map((p, i) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => onAbrirPrograma(p.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className={`${mono} grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[11px] font-bold text-muted-foreground`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {p.horas} h · programa base
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <ChipEstado estado={p.estado} />
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold`}>
                  {p.modulos}
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold`}>
                  {p.horas} h
                </td>
                <td className="px-4 py-3.5 text-right">
                  {p.gruposActivos > 0 ? (
                    <span
                      className={`inline-flex h-[26px] items-center gap-1.5 rounded-full bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
                    >
                      <span className={`${mono} font-bold`}>{p.gruposActivos}</span>
                      activos
                    </span>
                  ) : (
                    <span className={`${mono} text-[12px] text-muted-foreground`}>—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-muted-foreground">
                  {p.ultimaEdicion} · {p.editadoPor}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    aria-label={`Más acciones de ${p.nombre}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-[15px] font-bold">Ningún programa con ese filtro</p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              Quite el filtro de estado o cree el programa que falta.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

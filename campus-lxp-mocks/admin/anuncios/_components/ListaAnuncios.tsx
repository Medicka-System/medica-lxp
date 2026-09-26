"use client";

/**
 * Lista: publicados / programados / borradores / vencidos, cada uno con prioridad, estado, a quién
 * llega, canales, publicación y vigencia, y vistas (enganche por xAPI). Buscar, filtrar, nuevo anuncio.
 */

import {
  ChevronDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { mono, softText, focusRing, PRIORIDAD, ESTADO, ICONO_CANAL, NOMBRE_CANAL } from "./ui";
import type { RolStaff, EstadoAnuncio, Canal, TipoAlcance, Anuncio } from "./tipos";

export type ListaAnunciosProps = {
  rol: RolStaff;
  conteos: Record<EstadoAnuncio, number>;
  resumen: string;
  filtro: EstadoAnuncio;
  setFiltro: (f: EstadoAnuncio) => void;
  busca: string;
  setBusca: (v: string) => void;
  alcance: TipoAlcance;
  onNuevoAnuncio: () => void;
  onEditar: (id: string) => void;
  onDuplicar: (id: string) => void;
  visibles: Anuncio[];
};

export function ListaAnuncios({ rol, conteos, resumen, filtro, setFiltro, busca, setBusca, alcance, onNuevoAnuncio, onEditar, onDuplicar, visibles }: ListaAnunciosProps) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Anuncios</h1>
            <span className="inline-flex h-[23px] items-center whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[10.5px] font-bold text-sidebar-foreground">
              {rol === "superadmin"
                ? "Alcance global"
                : rol === "admin"
                  ? "Alcance académico"
                  : "Solo sus grupos"}
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Comunicación oficial de la escuela. Todo anuncio lleva caducidad para que no se quede
            colgado.
          </p>
        </div>

        <button
          type="button"
          onClick={onNuevoAnuncio}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Nuevo anuncio
        </button>
      </div>

      {/* filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["publicado", "Publicados"],
              ["programado", "Programados"],
              ["borrador", "Borradores"],
              ["vencido", "Vencidos"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtro === id ? "text-white/70" : "text-muted-foreground"}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <label className="flex h-10 w-[250px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar anuncio</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título o alcance…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          Cualquier alcance
          <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>{resumen}</span>
      </div>

      {/* lista: a quién llegó, por dónde, hasta cuándo y cuántos lo vieron */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ["Anuncio", "flex-[1.6]"],
              ["A quién llega", "flex-1 min-w-0"],
              ["Canales", "shrink-0 w-[96px]"],
              ["Publicación y vigencia", "shrink-0 w-[150px]"],
              ["Vistas", "shrink-0 w-[92px] text-right"],
              ["", "shrink-0 w-[102px]"],
            ] as const
          ).map(([t, cls]) => (
            <span
              key={t || "acciones"}
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
              a.prioridad === "urgente" && a.estado === "publicado" ? "bg-[#fffdfd]" : ""
            }`}
          >
            <span className="min-w-0 flex-[1.6]">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${PRIORIDAD[a.prioridad].clase}`}
                >
                  {a.prioridad === "urgente" && (
                    <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  )}
                  {PRIORIDAD[a.prioridad].etiqueta}
                </span>
                <span
                  className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}
                >
                  {ESTADO[a.estado].etiqueta}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onEditar(a.id)}
                className={`mt-1.5 block w-full truncate text-left text-[13.5px] font-bold leading-snug ${focusRing}`}
              >
                {a.titulo}
              </button>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <Users aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="truncate text-[12px] font-semibold">{a.alcance.etiqueta}</span>
              </span>
              <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                {a.alcance.personas}
              </span>
            </span>

            <span className="flex w-[96px] shrink-0 gap-1.5">
              {(["app", "correo", "whatsapp"] as Canal[]).map((k) => {
                const Icono = ICONO_CANAL[k];
                const on = a.canales.includes(k);
                return (
                  <span
                    key={k}
                    title={NOMBRE_CANAL[k]}
                    className={`grid h-6 w-6 place-items-center rounded-[7px] ${
                      on ? "bg-accent text-accent-foreground" : "bg-muted text-[color:var(--track)]"
                    }`}
                  >
                    <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  </span>
                );
              })}
            </span>

            <span className="w-[150px] shrink-0">
              <span className="block text-[11.5px] font-semibold">{a.publicacion}</span>
              <span
                className={`${mono} mt-0.5 block text-[10.5px] ${
                  a.vigencia.startsWith("vence hoy")
                    ? "text-[color:var(--warning-foreground)]"
                    : "text-muted-foreground"
                }`}
              >
                {a.vigencia}
              </span>
            </span>

            <span className="w-[92px] shrink-0 text-right">
              <span className={`${mono} block text-[13px] font-bold`}>{a.vistas}</span>
              <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                {a.pctVisto} lo vio
              </span>
            </span>

            <span className="flex shrink-0 gap-0.5">
              {(
                [
                  ["Editar", Pencil, () => onEditar(a.id)],
                  ["Duplicar", Copy, () => onDuplicar(a.id)],
                  ["Más acciones", MoreHorizontal, () => {}],
                ] as const
              ).map(([label, Icono, fn]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${label}: ${a.titulo}`}
                  onClick={fn}
                  className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
              ))}
            </span>
          </div>
        ))}

        {visibles.length === 0 && (
          <div className="border-t border-border px-6 py-12 text-center">
            <p className="text-[15px] font-bold">Nada en esta bandeja</p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              Cambie de estado o publique el primer anuncio para esta audiencia.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

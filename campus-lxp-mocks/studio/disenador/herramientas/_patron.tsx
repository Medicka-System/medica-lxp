"use client";

/**
 * Studio · Herramientas — administrador de contenido clínico configurable
 *
 * Tres herramientas, UN patrón: sub-nav con las tres → buscador + filtros → CTA de crear →
 * tabla escaneable con estado y uso. El editor de cada una repite el mismo header contextual
 * (Vista previa · Guardar borrador · Publicar); lo que cambia es el cuerpo.
 *
 * Este archivo trae las piezas compartidas para que las tres pantallas se sientan de la misma
 * familia sin duplicar estilos:
 *   · <SubNavHerramientas>  la barra de las tres herramientas con sus conteos
 *   · <BarraListado>        buscador + grupos de filtros + botón crear
 *   · <TablaHerramienta>    cabecera + filas
 *   · <FilaHerramienta>     fila con ícono, nombre, submeta y celdas
 *   · <ChipEstado> <ChipUso> <ChipNeutro> <ChipPlaceholder>
 *   · <HeaderEditor> <FranjaContexto> <CampoTexto> <ChipsSelector>
 *
 * El contenido clínico real (fórmulas, rangos, prompts de IA) se define aparte: va marcado con
 * <ChipPlaceholder> para no confundir el andamio con el contenido.
 */

import type { ReactNode } from "react";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutTemplate,
  Link2,
  MonitorPlay,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, focusRingDark } from "@/components/tokens";

/* ───────────────────────── Estilo compartido ───────────────────────── */

export 
export 
export 
export 
export 
export 

export type EstadoHerramienta = "publicada" | "borrador";
export type Herramienta = "plantillas" | "calculadoras" | "simuladores";

/* ───────────────────────────── Chips ───────────────────────────── */

export function ChipEstado({ estado }: { estado: EstadoHerramienta }) {
  return estado === "publicada" ? (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
      Publicada
    </span>
  ) : (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
      Borrador
    </span>
  );
}

export function ChipNeutro({ children }: { children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}
    >
      {children}
    </span>
  );
}

/** Uso real de la herramienta: es lo que dice si vale la pena mantenerla. */
export function ChipUso({ n, unidad }: { n: number; unidad: string }) {
  if (!n) return <span className={`${mono} text-[12px] text-muted-foreground`}>—</span>;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}
    >
      <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
      <span className={`${mono} font-bold`}>{n}</span>
      {unidad}
    </span>
  );
}

/** Lo clínico se define aparte: esto marca el hueco sin fingir contenido. */
export function ChipPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
      {children}
    </span>
  );
}

/* ───────────────────── Sub-nav de las tres herramientas ───────────────────── */

const HERRAMIENTAS: { id: Herramienta; etiqueta: string; icono: typeof Calculator }[] = [
  { id: "plantillas", etiqueta: "Plantillas de reporte", icono: LayoutTemplate },
  { id: "calculadoras", etiqueta: "Calculadoras", icono: Calculator },
  { id: "simuladores", etiqueta: "Simuladores", icono: MonitorPlay },
];

export function SubNavHerramientas({
  activa,
  conteos,
  onIr,
}: {
  activa: Herramienta;
  conteos: Record<Herramienta, number>;
  onIr?: (h: Herramienta) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
        {HERRAMIENTAS.map(({ id, etiqueta, icono: Icono }) => (
          <button
            key={id}
            type="button"
            onClick={() => onIr?.(id)}
            aria-pressed={activa === id}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
              activa === id
                ? "bg-sidebar text-sidebar-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {etiqueta}
            <span
              className={`${mono} font-bold ${activa === id ? "text-white/70" : "text-muted-foreground"}`}
            >
              {conteos[id]}
            </span>
          </button>
        ))}
      </div>
      <p className="min-w-[240px] flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
        Contenido clínico configurable: se administra aquí y el alumno lo consume en el campus.
      </p>
    </div>
  );
}

/* ───────────────────────── Barra del listado ───────────────────────── */

export type GrupoFiltro = { id: string; opciones: { etiqueta: string; conteo?: number }[]; activa: string };

export function BarraListado({
  placeholder,
  busca,
  onBuscar,
  grupos,
  onFiltrar,
  cta,
  onCrear,
}: {
  placeholder: string;
  busca: string;
  onBuscar: (v: string) => void;
  grupos: GrupoFiltro[];
  onFiltrar: (grupo: string, valor: string) => void;
  cta: string;
  onCrear: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <label className="flex h-10 w-[280px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      {grupos.map((g) => (
        <div key={g.id} className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {g.opciones.map((o) => {
            const on = g.activa === o.etiqueta;
            return (
              <button
                key={o.etiqueta}
                type="button"
                onClick={() => onFiltrar(g.id, o.etiqueta)}
                aria-pressed={on}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  on
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {o.etiqueta}
                {o.conteo !== undefined && (
                  <span className={`${mono} font-bold ${on ? "text-white/70" : "text-muted-foreground"}`}>
                    {o.conteo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={onCrear}
        className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
      >
        <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
        {cta}
      </button>
    </div>
  );
}

/* ───────────────────────── Tabla del listado ───────────────────────── */

export function TablaHerramienta({
  columnas,
  children,
}: {
  columnas: [string, "left" | "right"][];
  children: ReactNode;
}) {
  return (
    <section className={`${card} mt-4 overflow-hidden`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            {columnas.map(([t, a], i) => (
              <th
                key={`${t}-${i}`}
                style={{ textAlign: a }}
                className={`${kicker} whitespace-nowrap px-4 py-2.5 text-muted-foreground`}
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

/** Encabezado de grupo dentro de la tabla (las calculadoras se agrupan por área). */
export function FilaGrupo({ titulo, n, columnas }: { titulo: string; n: number; columnas: number }) {
  return (
    <tr>
      <td colSpan={columnas} className="border-t border-border bg-muted px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className={`${kicker} text-muted-foreground`}>{titulo}</span>
          <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>{n}</span>
        </span>
      </td>
    </tr>
  );
}

export function FilaHerramienta({
  nombre,
  submeta,
  icono: Icono,
  destacada,
  celdas,
  onAbrir,
}: {
  nombre: string;
  submeta: string;
  icono: typeof Calculator;
  destacada?: boolean;
  celdas: { contenido: ReactNode; alinear?: "left" | "right" }[];
  onAbrir: () => void;
}) {
  return (
    <tr className="border-t border-border">
      <td className="p-0">
        <button
          type="button"
          onClick={onAbrir}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${focusRing} ${
            destacada ? "bg-accent" : "hover:bg-muted"
          }`}
        >
          <span
            aria-hidden
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${
              destacada ? "bg-primary text-[color:var(--sidebar)]" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icono className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold leading-snug">{nombre}</span>
            <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
              {submeta}
            </span>
          </span>
        </button>
      </td>
      {celdas.map((c, i) => (
        <td key={i} className="px-4 py-3.5" style={{ textAlign: c.alinear ?? "left" }}>
          {c.contenido}
        </td>
      ))}
      <td className="px-3 py-3.5 text-right">
        <button
          type="button"
          aria-label={`Más acciones de ${nombre}`}
          className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
        >
          <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

/* ───────────────────── Header contextual del editor ───────────────────── */

export function HeaderEditor({
  ruta,
  nombre,
  estado,
  guardado,
  onVistaPrevia,
  onGuardar,
  onPublicar,
}: {
  ruta: string;
  nombre: string;
  estado: EstadoHerramienta;
  guardado?: string;
  onVistaPrevia: () => void;
  onGuardar: () => void;
  onPublicar: () => void;
}) {
  return (
    <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
      <button
        type="button"
        aria-label="Volver al listado"
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
      >
        <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Herramientas</span>
        <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
        <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">{ruta}</span>
        <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
        <span className="truncate text-[14.5px] font-bold text-sidebar-foreground">{nombre}</span>
        {estado === "borrador" ? (
          <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
            Borrador
          </span>
        ) : (
          <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
            Publicada
          </span>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {guardado && (
          <span className={`${mono} inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-white/60`}>
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
            guardado {guardado}
          </span>
        )}
        {[
          { etiqueta: "Vista previa", icono: Eye, accion: onVistaPrevia },
          { etiqueta: "Guardar borrador", icono: Save, accion: onGuardar },
        ].map(({ etiqueta, icono: Icono, accion }) => (
          <button
            key={etiqueta}
            type="button"
            onClick={accion}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {etiqueta}
          </button>
        ))}
        <button
          type="button"
          onClick={onPublicar}
          className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white ${focusRingDark}`}
        >
          <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
          Publicar
        </button>
      </div>
    </header>
  );
}

export function FranjaContexto({
  items,
  children,
}: {
  items: [string, string][];
  children?: ReactNode;
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-5 border-b border-border bg-card px-6">
      {items.map(([t, v]) => (
        <span key={t} className="flex items-baseline gap-1.5">
          <span className={`${kicker} text-muted-foreground`}>{t}</span>
          <span className={`${mono} text-[14px] font-bold`}>{v}</span>
        </span>
      ))}
      {children && <span className="ml-auto">{children}</span>}
    </div>
  );
}

/* ───────────────────────── Campos del editor ───────────────────────── */

export function CampoTexto({
  label,
  valor,
  onChange,
  filas,
  mono: esMono,
  placeholder: phTexto,
  ayuda,
}: {
  label: string;
  valor: string;
  onChange?: (v: string) => void;
  filas?: number;
  mono?: boolean;
  placeholder?: string;
  ayuda?: string;
}) {
  const base = `mt-1.5 w-full rounded-[10px] border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground ${
    esMono ? mono + " font-semibold" : ""
  }`;
  return (
    <label className="mt-3 block">
      <span className="flex items-center gap-2">
        <span className="text-[11.5px] font-semibold">{label}</span>
        {ayuda && <ChipPlaceholder>{ayuda}</ChipPlaceholder>}
      </span>
      {filas ? (
        <textarea
          rows={filas}
          value={valor}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={phTexto}
          className={`${base} resize-none py-2.5 leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={phTexto}
          className={`${base} h-10`}
        />
      )}
    </label>
  );
}

export function ChipsSelector({
  label,
  opciones,
  valor,
  onChange,
}: {
  label: string;
  opciones: string[];
  valor: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="mt-3">
      <span className="block text-[11.5px] font-semibold">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange?.(o)}
            aria-pressed={o === valor}
            className={`h-[34px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
              o === valor
                ? "border-transparent bg-accent text-accent-foreground"
                : `border-border bg-card ${softText} hover:bg-muted`
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Estado vacío: mismo molde para las tres herramientas. */
export function VacioHerramienta({
  icono: Icono,
  titulo,
  explicacion,
  cta,
  secundaria,
  onCrear,
}: {
  icono: typeof Calculator;
  titulo: string;
  explicacion: string;
  cta: string;
  secundaria?: string;
  onCrear: () => void;
}) {
  return (
    <div className="mt-4 rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-14 text-center">
      <span
        aria-hidden
        className="inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground"
      >
        <Icono className="h-[26px] w-[26px]" strokeWidth={1.6} />
      </span>
      <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">{titulo}</h2>
      <p className={`mx-auto mt-2.5 max-w-[56ch] text-[13.5px] leading-relaxed ${softText}`}>
        {explicacion}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onCrear}
          className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {cta}
        </button>
        {secundaria && (
          <button
            type="button"
            className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            {secundaria}
          </button>
        )}
      </div>
      <p className="mt-5 text-[12px] text-muted-foreground">
        Las tres herramientas comparten el mismo patrón: lista filtrable, crear y editor con
        borrador / publicado.
      </p>
    </div>
  );
}

export const CONTEOS: Record<Herramienta, number> = {
  plantillas: 14,
  calculadoras: 9,
  simuladores: 6,
};

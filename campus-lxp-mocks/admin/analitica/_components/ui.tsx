"use client";

/** Estilos, marca de Eco y piezas compartidas de Analítica (SenalAccion, Cifra, Barras, Tarjeta, RotuloCapa). */

import {
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Senal, Barra } from "./tipos";

export function EcoMark({ size = 32, invertido = false }: { size?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className={`grid shrink-0 place-items-center ${
        invertido
          ? "bg-[color:var(--info-foreground)] text-white"
          : "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </svg>
    </span>
  );
}


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/** La señal accionable: es lo que convierte la métrica en decisión. */
export function SenalAccion({ senal }: { senal: Senal }) {
  const clase =
    senal.tono === "warn"
      ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
      : senal.tono === "info"
        ? "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        : "bg-accent text-accent-foreground";
  return (
    <div className="mt-3.5 border-t border-border pt-3.5">
      <span
        className={`inline-flex items-start gap-1.5 rounded-[9px] px-2.5 py-2 text-[11.5px] font-semibold leading-snug ${clase}`}
      >
        {senal.tono === "warn" && (
          <AlertTriangle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        )}
        {senal.texto}
      </span>
    </div>
  );
}

export function Cifra({
  valor,
  unidad,
  delta,
  positivo,
}: {
  valor: string;
  unidad: string;
  delta?: string;
  positivo?: boolean;
}) {
  return (
    <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
      <span
        className={`${mono} whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.03em]`}
      >
        {valor}
      </span>
      <span className="text-[12px] font-semibold leading-snug text-muted-foreground">{unidad}</span>
      {delta && (
        <span
          className={`ml-auto inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
            positivo
              ? "bg-accent text-accent-foreground"
              : "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
          }`}
        >
          {positivo ? (
            <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />
          ) : (
            <TrendingDown aria-hidden className="h-3 w-3" strokeWidth={2.2} />
          )}
          {delta}
        </span>
      )}
    </div>
  );
}

export function Barras({ filas, color = "primary" }: { filas: Barra[]; color?: "primary" | "sidebar" }) {
  return (
    <div className="mt-3.5 flex flex-col gap-2.5">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{f.etiqueta}</span>
            <span
              className={`${mono} shrink-0 text-[12px] font-bold ${
                f.alerta ? "text-[color:var(--warning-foreground)]" : ""
              }`}
            >
              {f.valor}
            </span>
          </div>
          <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
            <span
              aria-hidden
              className={`block h-full rounded-full ${
                f.alerta
                  ? "bg-[color:var(--warning)]"
                  : color === "sidebar"
                    ? "bg-sidebar"
                    : "bg-primary"
              }`}
              style={{ width: `${f.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Tarjeta({
  titulo,
  extra,
  children,
  senal,
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  senal?: Senal;
}) {
  return (
    <section className={`${card} flex flex-col p-[18px]`}>
      <div className="flex items-center gap-2.5">
        <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{titulo}</p>
        {extra}
      </div>
      {children}
      {senal && <SenalAccion senal={senal} />}
    </section>
  );
}

export function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      <span className="text-[11.5px] text-muted-foreground">{nota}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

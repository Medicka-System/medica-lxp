"use client";

/**
 * Lo que requiere atención sube arriba: la franja roja (solo integración caída) y los avisos
 * ámbar / violeta (claves sin rotar, aval por vencer, gasto de Eco).
 */

import {
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { mono, focusRing } from "./ui";
import type { AreaId, AvisoConfig, ConfiguracionData } from "./tipos";

export type FranjaAtencionProps = {
  critica: ConfiguracionData["critica"];
  avisos: AvisoConfig[];
  onAbrirArea: (id: AreaId) => void;
};

export function FranjaAtencion({ critica, avisos, onAbrirArea }: FranjaAtencionProps) {
  return (
    <>
      {/* ══ lo que requiere atención sube: no se esconde en su tarjeta ══ */}
      {critica && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-[18px] py-3.5">
          <span
            aria-hidden
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--destructive-foreground)]"
          >
            <AlertTriangle className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <p className="min-w-[280px] flex-1 text-[13px] leading-relaxed text-[color:var(--destructive-foreground)]">
            <span className="font-bold">{critica.titulo}</span> {critica.detalle}
          </p>
          <button
            type="button"
            onClick={() => onAbrirArea(critica.area)}
            className={`h-10 shrink-0 whitespace-nowrap rounded-[10px] border border-[color:var(--destructive-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--destructive-foreground)] ${focusRing}`}
          >
            {critica.cta}
          </button>
        </div>
      )}

      <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {avisos.map((v) => {
          const warn = v.tono === "warn";
          const clase = warn
            ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
            : "border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]";
          return (
            <li key={v.id} className={`rounded-xl border p-3.5 ${clase}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[12.5px] font-bold">{v.titulo}</span>
                <span className={`${mono} text-[12px] font-bold`}>{v.valor}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed">{v.detalle}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold">
                {v.area}
                <ChevronRight aria-hidden className="h-3 w-3" strokeWidth={2.2} />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

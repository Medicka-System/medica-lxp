"use client";

/**
 * Últimos cambios de configuración: quién, qué, dónde y cuándo. "Queda en auditoría".
 */

import {
  Lock,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing } from "./ui";
import type { ConfiguracionData } from "./tipos";

export type LogAuditoriaProps = {
  auditoria: ConfiguracionData["auditoria"];
  onVerLogCompleto: () => void;
};

export function LogAuditoria({ auditoria, onVerLogCompleto }: LogAuditoriaProps) {
  return (
    <>
      {/* ══ el gobierno se audita: el log vive aquí, no escondido en Seguridad ══ */}
      <section className={`${card} mt-6 p-[18px]`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <p className={`${kicker} text-muted-foreground`}>Últimos cambios de configuración</p>
          <span
            className={`inline-flex h-[21px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
          >
            <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
            Queda en auditoría
          </span>
          <button
            type="button"
            onClick={onVerLogCompleto}
            className={`ml-auto h-8 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver el log completo
          </button>
        </div>

        <ul className="mt-2.5 flex flex-col gap-0.5">
          {auditoria.cambios.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 transition-colors hover:bg-muted"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
              >
                {c.ini}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12.5px] leading-snug ${softText}`}>
                  <span className="font-bold text-foreground">{c.quien}</span> {c.accion}
                </span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                  {c.donde}
                </span>
              </span>
              <span className={`${mono} shrink-0 whitespace-nowrap text-[11px] text-muted-foreground`}>
                {c.cuando}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {auditoria.eventosMes.toLocaleString("es-MX")} eventos registrados este mes · retención{" "}
          {auditoria.retencionMeses} meses.
        </p>
      </section>
    </>
  );
}

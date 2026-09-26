"use client";

/**
 * CAPA 3 · Atención y actividad: lo que requiere su decisión (certificados, accesos,
 * escalaciones), la actividad del staff y el Ateneo global, y Eco sobre toda la operación.
 */

import {
  MessageCircle,
  Send,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, EcoMark, ICONO_DECISION, RotuloCapa } from "./ui";
import type { Decision, ActividadStaff, AdminHomeData } from "./tipos";

export type CapaAtencionProps = {
  decisiones: Decision[];
  actividad: ActividadStaff[];
  ateneo: AdminHomeData["ateneo"];
  eco: AdminHomeData["eco"];
  onEmitirCertificado: () => void;
  onPreguntarEco: (q: string) => void;
  onResolverSolicitud: (id: string) => void;
};

export function CapaAtencion({ decisiones, actividad, ateneo, eco, onEmitirCertificado, onPreguntarEco, onResolverSolicitud }: CapaAtencionProps) {
  return (
    <>
      {/* ══════════════ CAPA 3 · ATENCIÓN Y ACTIVIDAD ══════════════ */}
      <RotuloCapa color="var(--warning)" titulo="Atención y actividad" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* lo que exige su firma */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Requiere su decisión</p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {decisiones.map((d) => {
              const Icono = ICONO_DECISION[d.icono];
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-card text-[color:var(--warning-foreground)]"
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`${mono} text-[15px] font-extrabold`}>{d.n}</span>
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--warning-foreground)]">
                        {d.titulo}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-[color:var(--warning-foreground)]">
                      {d.detalle}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => (d.icono === "certificados" ? onEmitirCertificado() : onResolverSolicitud(d.id))}
                    className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                  >
                    {d.cta}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* lo que solo se observa */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Actividad del staff · hoy</p>
            <button
              type="button"
              className={`h-[30px] shrink-0 rounded-full px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Ver todo
            </button>
          </div>

          <ul className="mt-2.5 flex flex-col gap-0.5">
            {actividad.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 transition-colors hover:bg-muted">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-sidebar text-[10.5px] font-bold text-sidebar-foreground"
                >
                  {a.ini}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12.5px] leading-snug ${softText}`}>
                    <span className="font-bold text-foreground">{a.nombre}</span> {a.accion}
                  </span>
                  <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                    {a.meta}
                  </span>
                </span>
                <span
                  className={`inline-flex h-[19px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted px-[7px] text-[9.5px] font-semibold ${softText}`}
                >
                  {a.rol}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3.5 flex items-center gap-3 border-t border-border pt-3.5">
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
            >
              <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold">Ateneo global</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {ateneo.casos} casos presentados esta semana · {ateneo.comentarios} comentarios ·{" "}
                {ateneo.sinResponder} sin responder
              </span>
            </span>
            <button
              type="button"
              className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Abrir
            </button>
          </div>
        </section>

        {/* Eco: no repite las cifras de arriba, dice qué pide atención */}
        <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
          <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
            <EcoMark size={32} invertido />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                Sobre toda la operación
              </p>
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="flex justify-end">
              <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {eco.pregunta}
              </p>
            </div>

            <div className="mt-3 flex gap-2.5">
              <EcoMark size={26} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{eco.intro}</p>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {eco.puntos.map((p) => {
                    const tono =
                      p.tono === "critica"
                        ? "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]"
                        : p.tono === "media"
                          ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                          : "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]";
                    return (
                      <li key={p.titulo} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2.5 ${tono}`}>
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">{p.titulo}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug">{p.detalle}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.cierre}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-4 pb-3.5 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {eco.sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPreguntarEco(s)}
                  className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="mt-2.5 flex h-10 items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <span className="sr-only">Pregúntele a Eco sobre la operación</span>
              <input
                type="text"
                placeholder="Pregúntele a Eco sobre la operación…"
                className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

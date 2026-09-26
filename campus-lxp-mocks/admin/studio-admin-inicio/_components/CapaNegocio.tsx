"use client";

/**
 * CAPA 1 · Pulso del negocio: 4 KPIs, crecimiento y actividad (6/12 meses), avance de la escuela
 * con alumnos en riesgo, y la cartera desde CORA en solo lectura.
 */

import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Lock,
  TrendingUp,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, ICONO_KPI, RotuloCapa } from "./ui";
import type { Kpi, ActividadStaff, AdminHomeData } from "./tipos";

export type CapaNegocioProps = {
  kpis: Kpi[];
  tendencia: AdminHomeData["tendencia"];
  avance: AdminHomeData["avance"];
  riesgo: AdminHomeData["riesgo"];
  cartera: AdminHomeData["cartera"];
  actividad: ActividadStaff[];
  rango: "6m" | "12m";
  setRango: (r: "6m" | "12m") => void;
  onVerGrupo: (id: string) => void;
  onAbrirCORA: () => void;
};

export function CapaNegocio({ kpis, tendencia, avance, riesgo, cartera, actividad, rango, setRango, onVerGrupo, onAbrirCORA }: CapaNegocioProps) {
  return (
    <>
      {/* ══════════════ CAPA 1 · PULSO DEL NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Pulso del negocio" />

      <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icono = ICONO_KPI[k.icono];
          return (
            <li key={k.id} className={`${card} p-[18px]`}>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
                >
                  <Icono className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{k.titulo}</p>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2.5">
                <span className={`${mono} text-[34px] font-extrabold leading-none tracking-[-0.03em]`}>
                  {k.valor}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground">{k.unidad}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {k.delta && (
                  <span
                    className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
                      k.deltaPositivo ? "bg-accent text-accent-foreground" : `bg-muted ${softText}`
                    }`}
                  >
                    {k.deltaPositivo && <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />}
                    {k.delta}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {k.pie}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* tendencia */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Crecimiento y actividad</p>
            <div className="ml-auto flex gap-1 rounded-full bg-muted p-[3px]">
              {(
                [
                  ["6m", "6 meses"],
                  ["12m", "12 meses"],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRango(id)}
                  aria-pressed={rango === id}
                  className={`h-[26px] whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold transition-colors ${focusRing} ${
                    rango === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex h-[132px] items-end gap-2.5">
            {tendencia.puntos.map((p, i, arr) => {
              const ultimo = i === arr.length - 1;
              return (
                <span key={p.mes} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span
                    className={`${mono} text-[10px] font-bold ${ultimo ? "text-secondary" : "text-muted-foreground"}`}
                  >
                    {p.valor}
                  </span>
                  <span
                    aria-hidden
                    className="w-full rounded-t-[7px]"
                    style={{
                      height: p.altura,
                      background: ultimo ? "var(--primary)" : "#d6e3ea",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.mes}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-border pt-3.5">
            {tendencia.resumen.map((r, i) => (
              <span key={r.etiqueta} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="h-3.5 w-px bg-border" />}
                <span className="inline-flex items-baseline gap-1.5">
                  <span className={`${mono} text-[13px] font-bold`}>{r.valor}</span>
                  <span className="text-[11.5px] text-muted-foreground">{r.etiqueta}</span>
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* avance + riesgo */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Avance de la escuela</p>
          <div className="mt-4 flex flex-col gap-4">
            {avance.map((a) => (
              <div key={a.titulo}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{a.titulo}</span>
                  <span className={`${mono} shrink-0 text-[13px] font-bold`}>{a.pct}%</span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{a.detalle}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onVerGrupo("riesgo")}
            className={`mt-4 flex w-full items-center gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3 text-left ${focusRing}`}
          >
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
            >
              <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[color:var(--warning-foreground)]">
                {riesgo.n} alumnos en riesgo
              </span>
              <span className="mt-0.5 block text-[11px] text-[color:var(--warning-foreground)]">
                {riesgo.detalle}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
              strokeWidth={2}
            />
          </button>
        </section>

        {/* cartera: llega de CORA, solo lectura */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Cartera · desde CORA</p>
            <span
              className={`inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Solo lectura
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>
              {cartera.pctAlCorriente}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">al corriente</span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2.5">
            {cartera.cortes.map((c) => {
              const tono =
                c.tono === "ok"
                  ? "bg-accent text-accent-foreground"
                  : c.tono === "porVencer"
                    ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                    : "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]";
              return (
                <li key={c.etiqueta} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 ${tono}`}>
                  <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{c.etiqueta}</span>
                  <span className={`${mono} shrink-0 text-[13px] font-bold`}>{c.valor}</span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            La cobranza vive en CORA; aquí solo se refleja. Último corte: {cartera.ultimoCorte}.
          </p>
          <button
            type="button"
            onClick={onAbrirCORA}
            className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Abrir CORA
          </button>
        </section>
      </div>
    </>
  );
}

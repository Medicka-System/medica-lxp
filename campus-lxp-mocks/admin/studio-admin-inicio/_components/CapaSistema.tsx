"use client";

/**
 * CAPA 2 · Salud del sistema (solo el súper admin la ve): integraciones con semáforo, consumo y
 * costo de Eco contra el tope, almacenamiento / colas / LRS y alertas técnicas.
 */

import {
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, EcoMark, ICONO_INTEGRACION, ICONO_SISTEMA, SEMAFORO, RotuloCapa } from "./ui";
import type { Integracion, GastoIA, MedidorSistema, Alerta } from "./tipos";

export type CapaSistemaProps = {
  integraciones: Integracion[];
  gastoIA: GastoIA;
  sistema: MedidorSistema[];
  alertas: Alerta[];
  onVerAlerta: (id: string) => void;
  onIrAConfig: (area: string) => void;
  caidas: number;
};

export function CapaSistema({ integraciones, gastoIA, sistema, alertas, onVerAlerta, onIrAConfig, caidas }: CapaSistemaProps) {
  return (
    <>
      {/* ══════════════ CAPA 2 · SALUD DEL SISTEMA ══════════════ */}
      <RotuloCapa color="var(--sidebar)" titulo="Salud del sistema" nota="solo usted ve esta capa" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,1.1fr)]">
        {/* integraciones con semáforo */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Integraciones</p>
            {caidas > 0 && (
              <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-2 text-[10px] font-bold text-[color:var(--destructive-foreground)]">
                {caidas} caída{caidas > 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => onIrAConfig("Integraciones")}
              className={`ml-auto h-8 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Configurar
            </button>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2">
            {integraciones.map((it) => {
              const sem = SEMAFORO[it.estado];
              const Icono = ICONO_INTEGRACION[it.icono];
              return (
                <li
                  key={it.id}
                  className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${sem.borde} ${sem.fondoFila}`}
                >
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${sem.clase}`}
                  >
                    <Icono className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{it.nombre}</span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        it.estado === "ok"
                          ? "text-muted-foreground"
                          : it.estado === "caida"
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                      }`}
                    >
                      {it.detalle}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`${mono} whitespace-nowrap text-[10.5px] text-muted-foreground`}>
                      {it.meta}
                    </span>
                    <span
                      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${sem.clase}`}
                    >
                      <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-current" />
                      {sem.etiqueta}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Eco: servicio con presupuesto */}
        <section className={`${card} border-[color:var(--info-border)] p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <EcoMark size={30} />
            <p className={`${kicker} min-w-0 flex-1 text-[color:var(--info-foreground)]`}>
              Eco · consumo del periodo
            </p>
            <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[10.5px] font-bold text-accent-foreground">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-current" />
              Operativo
            </span>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>
              {gastoIA.monto}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {gastoIA.moneda} en {gastoIA.periodo}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="h-[7px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
              role="progressbar"
              aria-valuenow={gastoIA.pctTope}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Consumo contra el tope mensual"
            >
              <span
                className="block h-full rounded-full bg-[color:var(--info)]"
                style={{ width: `${gastoIA.pctTope}%` }}
              />
            </div>
            <span className={`${mono} shrink-0 text-[11.5px] font-bold text-[color:var(--info-foreground)]`}>
              {gastoIA.pctTope}% del tope
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tope mensual configurado: {gastoIA.tope}. Al 80% se le avisa; al 100% Eco se pausa.
          </p>

          <ul className="mt-3.5 flex flex-col gap-2 border-t border-border pt-3.5">
            {gastoIA.desglose.map((d) => (
              <li key={d.tarea} className="flex items-center gap-2.5">
                <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${softText}`}>
                  {d.tarea}
                </span>
                <span className={`${mono} shrink-0 text-[11.5px] font-bold`}>{d.monto}</span>
                <span className={`${mono} w-[34px] shrink-0 text-right text-[10.5px] text-muted-foreground`}>
                  {d.pct}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onIrAConfig("IA/Eco")}
            className={`mt-3.5 h-10 w-full rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            Modelos y costos por tarea
          </button>
        </section>

        {/* sistema + alertas */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Estado del sistema</p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {sistema.map((m) => {
              const Icono = ICONO_SISTEMA[m.icono];
              return (
                <li key={m.titulo} className="flex items-center gap-3 rounded-[11px] border border-border px-3.5 py-3">
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted ${softText}`}
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold">{m.titulo}</span>
                      <span className={`${mono} shrink-0 text-[12px] font-bold`}>{m.valor}</span>
                    </span>
                    {m.pct !== undefined && (
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${m.pct}%` }} />
                      </span>
                    )}
                    <span className="mt-1.5 block text-[10.5px] text-muted-foreground">{m.detalle}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className={`${kicker} mt-5 text-muted-foreground`}>Alertas pendientes</p>
          <ul className="mt-3 flex flex-col gap-2">
            {alertas.map((a) => {
              const critica = a.gravedad === "critica";
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onVerAlerta(a.id)}
                    className={`flex w-full items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-left ${focusRing} ${
                      critica
                        ? "border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]"
                        : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    }`}
                  >
                    <AlertTriangle
                      aria-hidden
                      className={`mt-0.5 h-[15px] w-[15px] shrink-0 ${
                        critica
                          ? "text-[color:var(--destructive-foreground)]"
                          : "text-[color:var(--warning-foreground)]"
                      }`}
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[12.5px] font-bold ${
                          critica
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                        }`}
                      >
                        {a.titulo}
                      </span>
                      <span
                        className={`mt-1 block text-[11.5px] leading-relaxed ${
                          critica
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                        }`}
                      >
                        {a.detalle}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className={`h-[15px] w-[15px] shrink-0 ${
                        critica
                          ? "text-[color:var(--destructive-foreground)]"
                          : "text-[color:var(--warning-foreground)]"
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

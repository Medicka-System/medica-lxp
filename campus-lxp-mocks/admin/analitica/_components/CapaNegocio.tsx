"use client";

/**
 * CAPA 1 · Negocio / crecimiento: alumnos activos, altas y bajas, retención por generación,
 * llenado de grupos y cartera de CORA (solo lectura). Cada bloque cierra con una señal accionable.
 */

import {
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Lock,
} from "lucide-react";
import {
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mono, Cifra, Barras, Tarjeta, RotuloCapa } from "./ui";
import type { AnaliticaData } from "./tipos";

export type CapaNegocioProps = {
  negocio: AnaliticaData["negocio"];
};

export function CapaNegocio({ negocio }: CapaNegocioProps) {
  return (
    <>
      {/* ══════════════ CAPA 1 · NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Negocio y crecimiento" nota="lo que revisa a diario" />

      <div className="mt-3.5 grid items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Alumnos activos" senal={negocio.activos.senal}>
          <Cifra {...negocio.activos} delta={negocio.activos.delta} positivo />
          <div className="mt-3.5 h-[74px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={negocio.activos.serie} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="x" hide />
                <YAxis hide domain={["dataMin - 40", "dataMax + 40"]} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "var(--border)" }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="var(--primary)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1.5 flex justify-between">
            {negocio.activos.serie.map((p) => (
              <span key={p.x} className="text-[9.5px] text-muted-foreground">
                {p.x}
              </span>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Altas y bajas" senal={negocio.altasBajas.senal}>
          <Cifra {...negocio.altasBajas} delta={negocio.altasBajas.delta} positivo />
          <Barras filas={negocio.altasBajas.barras} />
        </Tarjeta>

        <Tarjeta titulo="Retención por generación" senal={negocio.retencion.senal}>
          <Cifra {...negocio.retencion} delta={negocio.retencion.delta} />
          <Barras filas={negocio.retencion.barras} />
        </Tarjeta>

        <Tarjeta titulo="Llenado de grupos" senal={negocio.llenado.senal}>
          <Cifra {...negocio.llenado} delta={negocio.llenado.delta} positivo />
          <Barras filas={negocio.llenado.barras} />
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-3">
        <Tarjeta titulo="Conversión del embudo" senal={negocio.embudo.senal}>
          <div className="mt-3.5 flex flex-col gap-2">
            {negocio.embudo.etapas.map((e, i) => (
              <div key={e.etapa} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium">{e.etapa}</span>
                  <span className="mt-1.5 block h-[22px] overflow-hidden rounded-[7px] bg-[color:var(--track)]">
                    <span
                      aria-hidden
                      className={`block h-full ${i === 3 ? "bg-secondary" : "bg-primary"}`}
                      style={{ width: `${e.pct}%`, opacity: 1 - i * 0.12 }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`${mono} block text-[13px] font-bold`}>{e.valor}</span>
                  <span className={`${mono} block text-[10px] text-muted-foreground`}>{e.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Cartera y cobranza"
          senal={negocio.cartera.senal}
          extra={
            <span
              className={`inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              CORA · solo lectura
            </span>
          }
        >
          <Cifra {...negocio.cartera} delta={negocio.cartera.delta} />
          <Barras filas={negocio.cartera.barras} />
        </Tarjeta>

        <Tarjeta titulo="Ingreso por programa" senal={negocio.ingreso.senal}>
          <Barras filas={negocio.ingreso.filas} color="sidebar" />
        </Tarjeta>
      </div>
    </>
  );
}

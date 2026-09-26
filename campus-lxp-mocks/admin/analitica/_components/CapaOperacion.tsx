"use client";

/**
 * CAPA 3 · Operación, staff y comunidad: desempeño docente, actividad de diseñadores, salud del
 * Ateneo, y uso, costo y calidad de Eco (cuánto corrigen los docentes sus sugerencias).
 */

import { mono, Cifra, Barras, Tarjeta, RotuloCapa } from "./ui";
import type { Docente, AnaliticaData } from "./tipos";

export type CapaOperacionProps = {
  operacion: AnaliticaData["operacion"];
};

export function CapaOperacion({ operacion }: CapaOperacionProps) {
  return (
    <>
      {/* ══════════════ CAPA 3 · OPERACIÓN ══════════════ */}
      <RotuloCapa
        color="var(--sidebar)"
        titulo="Operación, staff y comunidad"
        nota="quién sostiene la operación y a qué costo"
      />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* desempeño docente */}
        <Tarjeta titulo="Desempeño docente" senal={operacion.docentes.senal}>
          <div className="mt-3 flex flex-col">
            <div className="flex items-center gap-3 px-2 pb-2">
              {(
                [
                  ["Docente", "flex-[1.3]"],
                  ["Validados", "shrink-0 w-[66px] text-right"],
                  ["Respuesta", "shrink-0 w-[74px] text-right"],
                  ["Consultas", "shrink-0 w-[66px] text-right"],
                  ["", "shrink-0 w-[96px] text-right"],
                ] as const
              ).map(([t, cls]) => (
                <span
                  key={t || "estado"}
                  className={`${cls} whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`}
                >
                  {t}
                </span>
              ))}
            </div>

            {operacion.docentes.filas.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-3 border-t border-border px-2 py-2.5 ${
                  d.alerta ? "bg-[color:var(--warning-surface)]" : ""
                }`}
              >
                <span className="flex min-w-0 flex-[1.3] items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
                  >
                    {d.ini}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold">{d.nombre}</span>
                    <span className={`${mono} block text-[10px] text-muted-foreground`}>
                      {d.grupos}
                    </span>
                  </span>
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-right text-[12.5px] font-bold`}>
                  {d.validados}
                </span>
                <span
                  className={`${mono} w-[74px] shrink-0 text-right text-[12.5px] font-bold ${
                    d.alerta ? "text-[color:var(--warning-foreground)]" : ""
                  }`}
                >
                  {d.respuesta}
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-right text-[12.5px] font-bold`}>
                  {d.consultas}
                </span>
                <span className="w-[96px] shrink-0 text-right">
                  <span
                    className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
                      d.alerta
                        ? "border border-[color:var(--warning-border)] bg-card text-[color:var(--warning-foreground)]"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {d.estado}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        {/* actividad de diseño */}
        <Tarjeta titulo="Actividad de diseño" senal={operacion.diseno.senal}>
          <Cifra
            valor={operacion.diseno.valor}
            unidad="piezas publicadas"
            delta={operacion.diseno.delta}
            positivo
          />
          <Barras filas={operacion.diseno.barras} />
          <p className="mt-3 text-[11.5px] text-muted-foreground">{operacion.diseno.nota}</p>
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-2">
        {/* salud del Ateneo */}
        <Tarjeta titulo="Salud del Ateneo" senal={operacion.ateneo.senal}>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {operacion.ateneo.tarjetas.map((t) => (
              <div
                key={t.titulo}
                className={`rounded-[11px] border p-3 ${
                  t.ok
                    ? "border-border bg-card"
                    : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                }`}
              >
                <span
                  className={`${mono} block text-[20px] font-extrabold leading-none ${
                    t.ok ? "" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.valor}
                </span>
                <span
                  className={`mt-1.5 block text-[11px] font-bold ${
                    t.ok ? "" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.titulo}
                </span>
                <span
                  className={`mt-0.5 block text-[10.5px] ${
                    t.ok ? "text-muted-foreground" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.sub}
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        {/* uso y calidad de Eco: cuánto corrige el docente */}
        <Tarjeta titulo="Uso y calidad de Eco" senal={operacion.eco.senal}>
          <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
            <span
              className={`${mono} whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.03em]`}
            >
              {operacion.eco.global}
            </span>
            <span className="text-[12px] font-semibold leading-snug text-muted-foreground">
              de sus propuestas se aprueban sin cambios
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-3">
            {operacion.eco.tareas.map((t) => (
              <div key={t.tarea}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-medium">{t.tarea}</span>
                  <span className={`${mono} shrink-0 text-[12px] font-bold`}>
                    {t.aprobadoSinCambios}%
                  </span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className="block h-full rounded-full bg-[color:var(--info)]"
                    style={{ width: `${t.aprobadoSinCambios}%` }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">{t.nota}</p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-[color:var(--info-foreground)]">
              {operacion.eco.gasto}
            </span>
            <span className={`${mono} shrink-0 text-[11px] font-bold text-[color:var(--info-foreground)]`}>
              {operacion.eco.porCaso}
            </span>
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

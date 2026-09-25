"use client";

/**
 * CAPA 2 · Aprendizaje (LRS/xAPI, el diferenciador): avance real por programa, dónde se atoran
 * los alumnos (qué contenido mejorar), competencia I-AIM agregada, y decaimiento / efectividad del
 * repaso espaciado. Incluye a Eco como analista conversacional.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Send,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mono, kicker, softText, card, focusRing, EcoMark, Tarjeta, RotuloCapa } from "./ui";
import type { AnaliticaData } from "./tipos";

export type CapaAprendizajeProps = {
  aprendizaje: AnaliticaData["aprendizaje"];
  pregunta: string;
  setPregunta: (v: string) => void;
  onPreguntarEco: (q: string) => void;
  onVerDetalle: (id: string) => void;
};

export function CapaAprendizaje({ aprendizaje, pregunta, setPregunta, onPreguntarEco, onVerDetalle }: CapaAprendizajeProps) {
  return (
    <>
      {/* ══════════════ CAPA 2 · APRENDIZAJE (LRS) ══════════════ */}
      <RotuloCapa
        color="var(--info-foreground)"
        titulo="Aprendizaje"
        nota="la capa profunda · cada interacción entra por xAPI al LRS"
      />

      {/* Eco analista: abre la capa, no es un widget al margen */}
      <section className={`${card} relative mt-3.5 overflow-hidden border-[color:var(--info-border)]`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(100deg, rgba(238,242,255,.9) 0%, rgba(255,255,255,0) 52%)",
          }}
        />
        <div className="relative grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <EcoMark size={38} invertido />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-[15px] font-bold leading-tight">Eco, su analista</p>
                  <span className="inline-flex h-[21px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                    <TrendingUp aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                    Lee el LRS completo
                  </span>
                </div>
                <p className={`mt-1 text-[12.5px] ${softText}`}>
                  Pregunte en sus palabras: cruza avance, evaluaciones, casos y consultas.
                </p>
              </div>
            </div>

            <form
              className="mt-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-muted px-4"
              onSubmit={(e) => {
                e.preventDefault();
                onPreguntarEco(pregunta);
              }}
            >
              <span className="sr-only">Preguntarle a Eco</span>
              <input
                type="text"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder="¿Qué programa tiene peor retención y por qué?"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Preguntar"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            </form>

            <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
              {[
                "¿Dónde están fallando los alumnos este mes?",
                "¿Qué módulo hay que revisar?",
                "¿El repaso espaciado está sirviendo?",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPreguntarEco(s)}
                  className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* respuesta: análisis + acción sugerida */}
          <div className="min-w-0 xl:border-l xl:border-border xl:pl-6">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {aprendizaje.eco.pregunta}
              </p>
            </div>

            <div className="mt-3 flex gap-2.5">
              <EcoMark size={28} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] leading-relaxed ${softText}`}>{aprendizaje.eco.intro}</p>

                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {aprendizaje.eco.evidencias.map((e) => (
                    <li
                      key={e.titulo}
                      className="flex items-start gap-2.5 rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 py-2.5"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--warning-foreground)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                          {e.titulo}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--warning-foreground)]">
                          {e.detalle}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className={`mt-3 text-[13px] leading-relaxed ${softText}`}>
                  <span className="font-bold text-foreground">Acción sugerida:</span>{" "}
                  {aprendizaje.eco.accion}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {aprendizaje.eco.botones.map((b, i) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onVerDetalle(b)}
                      className={`h-9 whitespace-nowrap rounded-[9px] px-3.5 text-[12.5px] transition-colors ${focusRing} ${
                        i === 0
                          ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                          : i === 1
                            ? "border border-border bg-card font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                            : "font-semibold text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* dónde se atoran */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Dónde se atoran</p>
            <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
              vía LRS
            </span>
            <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
              rezago = no la terminan en el plazo del grupo
            </span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2">
            {aprendizaje.atoros.map((a) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-center gap-3.5 rounded-[11px] border px-3.5 py-3 ${
                  a.critico
                    ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border-border bg-card"
                }`}
              >
                <span className="min-w-[180px] flex-[1.3]">
                  <span className="block text-[12.5px] font-bold">{a.modulo}</span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      a.critico ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {a.leccion}
                  </span>
                </span>

                <span className="flex min-w-[140px] flex-1 items-center gap-2.5">
                  <span
                    className="h-[7px] flex-1 overflow-hidden rounded-full"
                    style={{ background: a.critico ? "rgba(146,64,14,.15)" : "var(--track)" }}
                  >
                    <span
                      aria-hidden
                      className={`block h-full rounded-full ${
                        a.critico ? "bg-[color:var(--warning)]" : "bg-primary"
                      }`}
                      style={{ width: `${a.rezago * 2}%` }}
                    />
                  </span>
                  <span
                    className={`${mono} shrink-0 whitespace-nowrap text-[11px] ${
                      a.critico ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {a.detalle}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => onVerDetalle(a.id)}
                  className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] border bg-card px-3 text-[12px] font-bold ${focusRing} ${
                    a.critico
                      ? "border-[color:var(--warning-border)] text-[color:var(--warning-foreground)]"
                      : "border-border text-secondary"
                  }`}
                >
                  {a.critico ? "Revisar" : "Ver"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* I-AIM agregada */}
        <Tarjeta titulo="Competencia I-AIM de la escuela" senal={aprendizaje.iaim.senal}>
          <div className="mt-3.5 flex flex-col gap-3">
            {aprendizaje.iaim.dominios.map((d) => (
              <div key={d.dominio}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.dominio}</span>
                  <span
                    className={`${mono} shrink-0 text-[13px] font-bold ${
                      d.flojo ? "text-[color:var(--warning-foreground)]" : ""
                    }`}
                  >
                    {d.valor}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className={`block h-full rounded-full ${
                      d.flojo ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${d.valor}%` }}
                  />
                </div>
                <p
                  className={`mt-1 text-[10.5px] ${
                    d.flojo ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                  }`}
                >
                  {d.nota}
                </p>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-2">
        {/* avance real contra el esperado */}
        <Tarjeta titulo="Avance real por programa" senal={aprendizaje.avance.senal}>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Horas acreditadas contra las esperadas a la fecha, no inscritos.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {aprendizaje.avance.programas.map((p) => (
              <div key={p.programa}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {p.programa}
                  </span>
                  <span
                    className={`${mono} shrink-0 text-[10.5px] ${
                      p.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {p.horas}
                  </span>
                </div>
                <div className="relative mt-1.5 h-[9px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className={`block h-full rounded-full ${
                      p.alerta ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${p.real}%` }}
                  />
                  <span
                    aria-hidden
                    title="avance esperado"
                    className="absolute -top-[3px] h-[15px] w-[2px] rounded-full bg-sidebar"
                    style={{ left: `${p.esperado}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span aria-hidden className="h-[11px] w-[2px] rounded-full bg-sidebar" />
            la marca es el avance esperado a la fecha
          </p>
        </Tarjeta>

        {/* decaimiento y repaso espaciado */}
        <Tarjeta titulo="Decaimiento y repaso espaciado" senal={aprendizaje.repaso.senal}>
          <div className="mt-3.5 h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aprendizaje.repaso.serie} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="x"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="sinRepaso"
                  name="Sin repaso"
                  stroke="var(--warning)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="conRepaso"
                  name="Con repaso espaciado"
                  stroke="var(--secondary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3.5">
            {[
              { t: "Sin repaso", c: "var(--warning)", v: aprendizaje.repaso.retSin },
              { t: "Con repaso espaciado", c: "var(--secondary)", v: aprendizaje.repaso.retCon },
            ].map((l) => (
              <span key={l.t} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-[3px] w-2.5 rounded-full" style={{ background: l.c }} />
                <span className={`text-[11.5px] font-medium ${softText}`}>{l.t}</span>
                <span className={`${mono} text-[11.5px] font-bold`}>{l.v}</span>
              </span>
            ))}
          </div>
        </Tarjeta>
      </div>
    </>
  );
}

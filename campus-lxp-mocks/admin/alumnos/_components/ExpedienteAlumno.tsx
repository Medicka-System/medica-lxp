"use client";

/**
 * Expediente del alumno: avance académico del campus (cursos, casos, competencia I-AIM, horas,
 * certificados, badges), actividad, y el bloque ADMINISTRATIVO de CORA en solo lectura —claramente
 * marcado—. Acciones: ver bitácora, contactar, ver historial. Nada de CORA se edita aquí.
 */

import {
  AlertTriangle,
  Award,
  ChevronLeft,
  Clock,
  ExternalLink,
  History,
  Lock,
  MessageCircle,
  NotebookText,
  ScanLine,
  Send,
  X,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, ESTADO, ICONO_ACTIVIDAD, Avatar, EcoMark } from "./ui";
import type { Expediente } from "./tipos";

export type ExpedienteAlumnoProps = {
  expediente: Expediente;
  setVista: (v: "lista" | "expediente") => void;
  ecoAbierto: boolean;
  setEcoAbierto: (v: boolean) => void;
  onVerBitacora: (id: string) => void;
  onContactar: (id: string) => void;
  onVerHistorial: (id: string) => void;
  onPreguntarEco: (q: string) => void;
  onAbrirCORA: (id: string) => void;
};

export function ExpedienteAlumno({ expediente, setVista, ecoAbierto, setEcoAbierto, onVerBitacora, onContactar, onVerHistorial, onPreguntarEco, onAbrirCORA }: ExpedienteAlumnoProps) {
  const e = expediente;
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
        {/* identidad + acciones (ninguna edita CORA) */}
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a Alumnos"
            className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>

          <Avatar ini={e.ini} size={52} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">
                {e.nombre}
              </h1>
              {e.senal && (
                <span
                  className={`inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[e.estado].clase}`}
                >
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  {e.senal}
                </span>
              )}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              {e.programa} · {e.grupo} ·{" "}
              <span className={`${mono} text-muted-foreground`}>{e.matricula}</span>
            </p>
          </div>

          <div className="mt-1.5 flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => onVerBitacora(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Ver su bitácora
            </button>
            <button
              type="button"
              onClick={() => onVerHistorial(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Historial
            </button>
            <button
              type="button"
              onClick={() => onContactar(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Contactarlo
            </button>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {/* avance contra lo esperado */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Avance en el campus</p>

              <div className="mt-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13.5px] font-bold">{e.curso.titulo}</span>
                  <span className={`${mono} ml-auto text-[16px] font-extrabold`}>
                    {e.curso.avance}%
                  </span>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${e.curso.avance}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute top-0 h-full w-[2px] bg-sidebar"
                    style={{ left: `${e.curso.esperado}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`${mono} text-[11px] text-muted-foreground`}>
                    {e.curso.posicion} · esperado {e.curso.esperado}%
                  </span>
                  <span className="ml-auto inline-flex h-5 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                    {e.curso.esperado - e.curso.avance} pts abajo
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2.5">
                {(
                  [
                    [Clock, e.cifras.horas, "acreditadas de 1000", false],
                    [ScanLine, e.cifras.casos, e.cifras.casosNota ?? "casos validados", true],
                    [Award, e.cifras.certificados, "certificado de módulo", false],
                    [Award, e.cifras.insignias, "insignias", false],
                  ] as const
                ).map(([Icono, v, t, warn], i) => (
                  <div
                    key={i}
                    className={`min-w-0 flex-1 rounded-[11px] border p-3 ${
                      warn
                        ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                        : "border-border bg-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                        warn ? "text-[color:var(--warning-foreground)]" : "text-accent-foreground"
                      }`}
                    >
                      <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{v}</p>
                    <p
                      className={`mt-1 text-[10.5px] leading-snug ${
                        warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                      }`}
                    >
                      {t}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* competencia I-AIM, del LRS */}
            <section className={`${card} p-[18px]`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Competencia I-AIM</p>
                <span
                  className={`${mono} ml-auto inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] text-muted-foreground`}
                >
                  del LRS · xAPI
                </span>
              </div>

              <div className="mt-3.5 flex flex-col gap-3.5">
                {e.iaim.dominios.map((d) => (
                  <div key={d.nombre}>
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.nombre}</span>
                      <span
                        className={`${mono} shrink-0 text-[13px] font-bold ${
                          d.valor < 55 ? "text-[color:var(--warning-foreground)]" : ""
                        }`}
                      >
                        {d.valor}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                      <span
                        className={`block h-full rounded-full ${
                          d.valor < 55 ? "bg-[color:var(--warning)]" : "bg-primary"
                        }`}
                        style={{ width: `${d.valor}%` }}
                      />
                    </div>
                    {d.nota && (
                      <p className="mt-1 text-[10.5px] text-[color:var(--warning-foreground)]">
                        {d.nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className={`mt-3.5 border-t border-border pt-3 text-[11.5px] leading-relaxed ${softText}`}>
                Competencia general <span className={`${mono} font-bold text-foreground`}>{e.iaim.general}</span>{" "}
                · {e.iaim.nota}
              </p>
            </section>

            {/* actividad: la última conexión es la primera pista de abandono */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Actividad</p>
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {e.actividad.map((a) => {
                  const Icono = ICONO_ACTIVIDAD[a.icono];
                  return (
                    <li
                      key={a.titulo}
                      className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-3 ${
                        a.alerta ? "bg-[color:var(--warning-surface)]" : ""
                      }`}
                    >
                      <Icono
                        aria-hidden
                        className={`mt-px h-[15px] w-[15px] shrink-0 ${
                          a.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[12.5px] font-bold ${
                            a.alerta ? "text-[color:var(--warning-foreground)]" : ""
                          }`}
                        >
                          {a.titulo}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11.5px] leading-snug ${
                            a.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                          }`}
                        >
                          {a.detalle}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* rail: CORA en solo lectura + Eco */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>
                  Administrativo · CORA
                </p>
                <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                  <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  Solo lectura
                </span>
              </div>

              <div className="p-4">
                <dl className="flex flex-col gap-2.5">
                  {e.cora.campos.map((c) => (
                    <div key={c.etiqueta} className="flex items-baseline gap-2.5">
                      <dt className="w-[104px] shrink-0 text-[11.5px] text-muted-foreground">
                        {c.etiqueta}
                      </dt>
                      <dd
                        className={`min-w-0 flex-1 text-right text-[12.5px] font-semibold ${
                          c.mono ? `${mono} font-bold` : ""
                        }`}
                      >
                        {c.valor}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* el único rojo, y es dato del ERP */}
                {e.cora.pagoVencido && (
                  <div className="mt-3.5 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-3">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-[color:var(--destructive-foreground)]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-[color:var(--destructive-foreground)]">
                        {e.cora.pagoVencido.titulo}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[color:var(--destructive-foreground)]">
                        {e.cora.pagoVencido.detalle}
                      </span>
                    </span>
                  </div>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Alta, inscripción, matrícula y cobranza se editan en CORA. Aquí solo se reflejan; el
                  corte es de {e.cora.corte}.
                </p>
                <button
                  type="button"
                  onClick={() => onAbrirCORA(e.id)}
                  className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Abrir su ficha en CORA
                </button>
              </div>
            </section>

            {/* Eco: cruza señales, no repite cifras */}
            {ecoAbierto && (
              <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
                <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
                  <EcoMark size={32} invertido />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                    <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                      Sobre este alumno
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEcoAbierto(false)}
                    aria-label="Cerrar Eco"
                    className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
                  >
                    <X aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                  </button>
                </div>

                <div className="px-4 py-3.5">
                  <div className="flex justify-end">
                    <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                      {e.eco.pregunta}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2.5">
                    <EcoMark size={26} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] leading-relaxed ${softText}`}>{e.eco.respuesta}</p>

                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {e.eco.puntos.map((p) => (
                          <li
                            key={p.texto}
                            className={`flex items-start gap-2 rounded-[9px] px-2.5 py-2 ${
                              p.tono === "warn"
                                ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                            <span className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug">
                              {p.texto}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                        <span className="font-bold text-foreground">Sugerencia:</span> {e.eco.sugerencia}
                      </p>

                      <button
                        type="button"
                        onClick={() => onContactar(e.id)}
                        className={`mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                      >
                        <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {e.eco.cta}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 pb-3.5 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {e.eco.sugerencias.map((s) => (
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
                    onSubmit={(ev) => ev.preventDefault()}
                  >
                    <span className="sr-only">Pregúntele a Eco</span>
                    <input
                      type="text"
                      placeholder="Pregúntele a Eco…"
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
            )}
          </div>
        </div>
      </div>
  );
}

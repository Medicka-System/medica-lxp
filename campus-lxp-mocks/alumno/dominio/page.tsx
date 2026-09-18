"use client";

/**
 * Mi dominio · tablero de maestría — Campus Virtual · Médica Capacitación (LXP)
 *
 * El "cómo voy de verdad": competencia I-AIM (Indicación · Adquisición · Interpretación · Decisión),
 * no porcentaje de curso. La competencia DECAE con el tiempo —sobre todo Adquisición—, así que la
 * pantalla muestra nivel, TENDENCIA y qué toca repasar, con gancho al simulador o a la lección.
 *
 * Jerarquía: una frase antes que un número (anillo + lectura en palabras) → los cuatro dominios con
 * su delta y su línea de tendencia → qué repasar ahora (el decaimiento es el tema, no una nota al
 * pie) → cruce dominio × área → horas e hitos (motivación, no indicador de competencia).
 *
 * Animación: anillo y barras animan al montar y se detienen con prefers-reduced-motion
 * (hook useReducedMotion, sin keyframes externos).
 *
 * Stubs: onPracticar · onRepasar · onVerHito
 */

import { useEffect, useMemo, useState } from "react";
import { Award, Check, Clock } from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type DominioIAIM = "Indicación" | "Adquisición" | "Interpretación" | "Decisión médica";
export type EstadoDominio = "solido" | "repaso" | "caida";

export type NivelDominio = {
  dominio: DominioIAIM;
  nivel: number;
  estado: EstadoDominio;
  /** Cambio del mes: positivo, negativo o 0 (estable). */
  delta: number;
  /** Serie de los últimos meses, para la línea de tendencia. */
  serie: number[];
  nota: string;
};

export type AreaDominio = {
  area: string;
  /** Un valor por dominio, en el orden de DOMINIOS. */
  valores: number[];
  practica: string;
};

export type RepasoSugerido = {
  id: string;
  tema: string;
  dominio: string;
  area: string;
  razon: string;
  cuando: string;
  hoy?: boolean;
};

export type Hito = {
  horas: string;
  titulo: string;
  meta: string;
  estado: "hecho" | "cerca" | "futuro";
};

export type DominioData = {
  general: { nivel: number; titular: string; detalle: string };
  dominios: NivelDominio[];
  repasos: RepasoSugerido[];
  minutosRepaso: number;
  areas: AreaDominio[];
  horas: { acreditadas: number; meta: number; siguienteHito: string; faltan: number };
  hitos: Hito[];
};

const DOMINIOS_CORTOS = ["Indicación", "Adquisición", "Interpretación", "Decisión"];

const MOCK: DominioData = {
  general: {
    nivel: 68,
    titular: "Lee cada vez mejor; la mano se le está enfriando.",
    detalle:
      "Subió 3 puntos en Interpretación y bajó 9 en Adquisición. Dos sesiones de práctica esta semana lo devuelven a su nivel.",
  },
  dominios: [
    {
      dominio: "Indicación",
      nivel: 82,
      estado: "solido",
      delta: 4,
      serie: [70, 72, 75, 78, 79, 82],
      nota: "Sabe cuándo pedir el estudio y cuándo no.",
    },
    {
      dominio: "Adquisición",
      nivel: 54,
      estado: "caida",
      delta: -9,
      serie: [68, 66, 63, 60, 57, 54],
      nota: "Decae si no practica: son manos, no teoría.",
    },
    {
      dominio: "Interpretación",
      nivel: 74,
      estado: "solido",
      delta: 3,
      serie: [62, 65, 68, 70, 71, 74],
      nota: "Lee bien; le falta cerrar causas.",
    },
    {
      dominio: "Decisión médica",
      nivel: 63,
      estado: "repaso",
      delta: 0,
      serie: [60, 62, 63, 63, 62, 63],
      nota: "Estable, pero sin práctica reciente.",
    },
  ],
  repasos: [
    {
      id: "r1",
      tema: "Medición de cortical renal",
      dominio: "Adquisición",
      area: "Renal",
      razon: "Último acierto hace 5 semanas",
      cuando: "hoy",
      hoy: true,
    },
    {
      id: "r2",
      tema: "Jet ureteral y obstrucción",
      dominio: "Interpretación",
      area: "Vías urinarias",
      razon: "Falló en su última simulación",
      cuando: "en 2 días",
    },
    {
      id: "r3",
      tema: "Ventana subcostal del hígado",
      dominio: "Adquisición",
      area: "Hígado",
      razon: "Sin práctica desde septiembre",
      cuando: "en 5 días",
    },
  ],
  minutosRepaso: 12,
  areas: [
    { area: "Renal", valores: [86, 58, 79, 68], practica: "14 casos" },
    { area: "Hígado y vía biliar", valores: [78, 52, 71, 64], practica: "11 casos" },
    { area: "Abdomen", valores: [74, 61, 66, 59], practica: "9 casos" },
    { area: "Obstétrico", valores: [69, 44, 58, 52], practica: "6 casos" },
    { area: "Doppler", valores: [58, 38, 47, 41], practica: "3 casos" },
    { area: "MSK", valores: [52, 33, 42, 36], practica: "1 caso" },
  ],
  horas: { acreditadas: 248, meta: 1000, siguienteHito: "250 h", faltan: 2 },
  hitos: [
    { horas: "100 h", titulo: "Bases del modo B", meta: "logrado en agosto", estado: "hecho" },
    { horas: "250 h", titulo: "Abdomen completo", meta: "a 2 horas", estado: "cerca" },
    { horas: "500 h", titulo: "Obstétrico y Doppler", meta: "siguiente meta", estado: "futuro" },
    { horas: "1000 h", titulo: "Diplomado acreditado", meta: "meta final", estado: "futuro" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const etiquetaEstado: Record<EstadoDominio, string> = {
  solido: "Sólido",
  repaso: "En repaso",
  caida: "En caída",
};
const claseEstado: Record<EstadoDominio, string> = {
  solido: "bg-accent text-accent-foreground",
  repaso:
    "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  caida:
    "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
};

/** Respeta la preferencia del sistema: sin animación de entrada si se pide reducir movimiento. */
function useReducedMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const cb = () => setReduce(mq.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return reduce;
}

/** Anillo de competencia general. Anima el trazo al montar salvo reduced-motion. */
function Anillo({ pct, size = 200, grosor = 14 }: { pct: number; size?: number; grosor?: number }) {
  const reduce = useReducedMotion();
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const r = size / 2 - grosor / 2 - 6;
  const c = 2 * Math.PI * r;
  const lleno = c * (1 - pct / 100);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Competencia general ${pct} por ciento`}
      className="shrink-0 -rotate-90"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={grosor} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={reduce || listo ? lleno : c}
        style={{
          transition: reduce ? "none" : "stroke-dashoffset 1.1s cubic-bezier(.22,.8,.26,1)",
        }}
      />
    </svg>
  );
}

/** Línea de tendencia: si sube va teal, si decae va ámbar. */
function Tendencia({ serie, sube }: { serie: number[]; sube: boolean }) {
  const w = 110,
    h = 44,
    min = Math.min(...serie) - 4,
    max = Math.max(...serie) + 4;
  const pts = serie.map(
    (v, i) => [(i * w) / (serie.length - 1), h - ((v - min) / (max - min)) * h] as const,
  );
  const color = sube ? "var(--primary)" : "var(--warning)";
  const ultimo = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0 overflow-visible">
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={ultimo[0]} cy={ultimo[1]} r={3.5} fill={color} />
    </svg>
  );
}

/** Barra que crece al montar (salvo reduced-motion). */
function Barra({ pct, alerta, alto = 8 }: { pct: number; alerta?: boolean; alto?: number }) {
  const reduce = useReducedMotion();
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div
      className="overflow-hidden rounded-full bg-[color:var(--track)]"
      style={{ height: alto }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${reduce || listo ? pct : 0}%`,
          background: alerta ? "var(--warning)" : "var(--primary)",
          transition: reduce ? "none" : "width .9s cubic-bezier(.22,.8,.26,1)",
        }}
      />
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function MiDominio({ data = MOCK }: { data?: DominioData }) {
  const { general, dominios, repasos, minutosRepaso, areas, horas, hitos } = data;

  /* ── Stubs ─────────────────────────────────────────────── */
  const onPracticar = (_id: string) => {};
  const onRepasar = (_id: string) => {};
  const onVerHito = (_h: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const pctHoras = useMemo(
    () => Math.round((horas.acreditadas / horas.meta) * 1000) / 10,
    [horas],
  );

  /** Escala de cuatro pasos; el rojo solo en el extremo bajo. */
  const celda = (v: number) => {
    const fondo =
      v >= 75
        ? "var(--secondary)"
        : v >= 60
          ? "var(--primary)"
          : v >= 45
            ? "var(--warning-border)"
            : "var(--destructive-border)";
    const tinta = v >= 60 ? "#fff" : "var(--foreground)";
    return (
      <span
        className={`grid h-11 place-items-center rounded-[9px] text-[13.5px] font-bold ${mono}`}
        style={{ background: fondo, color: tinta }}
      >
        {v}
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Panorama: una frase antes que un número ───── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.55fr]">
        <section className="relative overflow-hidden rounded-2xl p-7" style={{ background: "var(--sidebar)" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 62%)",
            }}
          />
          <svg
            aria-hidden
            viewBox="0 0 600 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[88px] w-full"
          >
            <path d="M0 70c96-30 168 22 264 6s168-46 336-12v56H0z" fill="rgba(255,255,255,.07)" />
            <path d="M0 90c120-24 192 14 300 2s180-32 300-8v36H0z" fill="rgba(255,255,255,.09)" />
          </svg>
          <div className="relative flex flex-wrap items-center gap-6">
            <span className="relative grid shrink-0 place-items-center">
              <Anillo pct={general.nivel} />
              <span className="absolute grid place-items-center text-center">
                <span
                  className={`${mono} block text-[40px] font-extrabold leading-none tracking-[-0.03em]`}
                  style={{ color: "var(--hero-ink)" }}
                >
                  {general.nivel}
                </span>
                <span
                  className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  competencia
                </span>
              </span>
            </span>
            <div className="min-w-[220px] flex-1 basis-[220px]">
              <p className={kicker} style={{ color: "var(--hero-ink-muted)" }}>
                Su dominio general
              </p>
              <p
                className="mt-3 text-[17px] font-bold leading-relaxed"
                style={{ color: "var(--hero-ink)" }}
              >
                {general.titular}
              </p>
              <p
                className="mt-2.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-soft, #dbe8f1)" }}
              >
                {general.detalle}
              </p>
            </div>
          </div>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2">
          {dominios.map((d) => {
            const sube = d.delta >= 0;
            return (
              <li
                key={d.dominio}
                className={`rounded-xl border bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
                  d.estado === "caida" ? "border-[color:var(--warning-border)]" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <p className="text-[15px] font-bold tracking-[-0.01em]">{d.dominio}</p>
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[d.estado]}`}
                  >
                    {etiquetaEstado[d.estado]}
                  </span>
                </div>
                <div className="mt-3.5 flex items-end gap-3.5">
                  <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}>
                    {d.nivel}
                  </span>
                  <span
                    className={`${mono} whitespace-nowrap pb-1.5 text-[13px] font-bold ${
                      d.delta === 0
                        ? "text-muted-foreground"
                        : sube
                          ? "text-secondary"
                          : "text-[color:var(--warning-foreground)]"
                    }`}
                  >
                    {d.delta === 0 ? "=" : `${d.delta > 0 ? "+" : "−"}${Math.abs(d.delta)} este mes`}
                  </span>
                  <span className="ml-auto">
                    <Tendencia serie={d.serie} sube={d.delta >= 0} />
                  </span>
                </div>
                <div className="mt-3.5">
                  <Barra pct={d.nivel} alerta={d.estado === "caida"} />
                </div>
                <p className={`mt-3 text-[12.5px] leading-snug ${softText}`}>{d.nota}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ───── Qué repasar ahora: el decaimiento es el tema ───── */}
      <section className={`${card} mt-7 overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className={`${kicker} text-[color:var(--warning-foreground)]`}>Qué repasar ahora</p>
            <p className={`mt-1.5 text-[14px] leading-snug ${softText}`}>
              La competencia decae sola. Estos temas volvieron a la fila porque ya toca.
            </p>
          </div>
          <span className={`${mono} ml-auto text-[12.5px] text-muted-foreground`}>
            {repasos.length} pendientes · {minutosRepaso} min aprox.
          </span>
        </div>
        <ul className="flex flex-col">
          {repasos.map((r, i) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-4 px-6 py-4 ${
                i ? "border-t border-border" : ""
              } ${r.hoy ? "bg-[color:var(--warning-surface)]" : ""}`}
            >
              <span
                aria-hidden
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  r.hoy ? "bg-card text-[color:var(--warning-foreground)]" : "bg-muted text-muted-foreground"
                }`}
              >
                <Clock className="h-[19px] w-[19px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-[220px] flex-1">
                <span className="block text-[15px] font-bold leading-snug">{r.tema}</span>
                <span className={`mt-0.5 block text-[12.5px] ${softText}`}>
                  {r.dominio} · {r.area} · {r.razon}
                </span>
              </span>
              <span
                className={`inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-bold ${
                  r.hoy
                    ? "bg-[color:var(--warning-foreground)] text-white"
                    : "border border-border bg-muted text-muted-foreground"
                }`}
              >
                {r.hoy ? "Toca hoy" : r.cuando}
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onPracticar(r.id)}
                  className={`h-11 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Practicar
                </button>
                <button
                  type="button"
                  onClick={() => onRepasar(r.id)}
                  className={`h-11 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Revisar lección
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── Cruce dominio × área + horas e hitos ───── */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className={`${card} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <p className={`${kicker} text-muted-foreground`}>Dominio por área clínica</p>
              <p className={`mt-1.5 text-[13.5px] leading-snug ${softText}`}>
                Donde el número baja, es que ahí practicó menos.
              </p>
            </div>
            <span className="ml-auto flex items-center gap-2">
              <span className="text-[11.5px] text-muted-foreground">bajo</span>
              {["var(--destructive-border)", "var(--warning-border)", "var(--primary)", "var(--secondary)"].map(
                (c) => (
                  <span
                    key={c}
                    aria-hidden
                    className="h-2.5 w-[22px] rounded-[3px]"
                    style={{ background: c }}
                  />
                ),
              )}
              <span className="text-[11.5px] text-muted-foreground">sólido</span>
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${kicker} pb-2 pr-2.5 text-left text-muted-foreground`}>Área</th>
                  {DOMINIOS_CORTOS.map((d) => (
                    <th
                      key={d}
                      className="px-1.5 pb-2 text-center text-[11px] font-semibold tracking-[0.06em] text-muted-foreground"
                    >
                      {d}
                    </th>
                  ))}
                  <th className={`${kicker} pb-2 pl-2.5 text-right text-muted-foreground`}>
                    Práctica
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => (
                  <tr key={a.area}>
                    <th className="whitespace-nowrap py-1.5 pr-2.5 text-left text-[13.5px] font-semibold">
                      {a.area}
                    </th>
                    {a.valores.map((v, i) => (
                      <td key={DOMINIOS_CORTOS[i]} className="px-1.5 py-1.5">
                        {celda(v)}
                      </td>
                    ))}
                    <td
                      className={`${mono} whitespace-nowrap py-1.5 pl-2.5 text-right text-[12px] text-muted-foreground`}
                    >
                      {a.practica}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="relative overflow-hidden rounded-2xl p-6" style={{ background: "var(--secondary)" }}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)",
              }}
            />
            <div className="relative">
              <p className={kicker} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
                Horas acreditadas
              </p>
              <div className="mt-3 flex items-end gap-2.5">
                <span
                  className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}
                  style={{ color: "var(--hero-ink)" }}
                >
                  {horas.acreditadas}
                </span>
                <span
                  className={`${mono} pb-1 text-[14px] font-semibold`}
                  style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
                >
                  / {horas.meta} h
                </span>
              </div>
              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,.22)" }}
                role="progressbar"
                aria-valuenow={pctHoras}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Horas acreditadas del diplomado"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pctHoras}%`, background: "var(--hero-ink)" }}
                />
              </div>
              <p
                className="mt-3.5 text-[13px] leading-relaxed"
                style={{ color: "var(--hero-ink-soft, #eafaf9)" }}
              >
                Le faltan{" "}
                <span className={`${mono} font-bold`} style={{ color: "var(--hero-ink)" }}>
                  {horas.faltan} h
                </span>{" "}
                para el hito de {horas.siguienteHito}.
              </p>
            </div>
          </section>

          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Hitos</p>
            <ol className="mt-4 flex flex-col">
              {hitos.map((h, i) => (
                <li key={h.horas} className="flex gap-3.5">
                  <span className="flex shrink-0 flex-col items-center">
                    <span
                      aria-hidden
                      className={`grid h-[26px] w-[26px] place-items-center rounded-full ${
                        h.estado === "hecho"
                          ? "bg-primary text-[color:var(--sidebar)]"
                          : h.estado === "cerca"
                            ? "border-2 border-primary bg-card"
                            : "border-2 border-[color:var(--track)] bg-card"
                      }`}
                    >
                      {h.estado === "hecho" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    {i < hitos.length - 1 && (
                      <span aria-hidden className="min-h-[22px] w-0.5 flex-1 bg-[color:var(--track)]" />
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 ${i < hitos.length - 1 ? "pb-5" : ""}`}>
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`${mono} text-[15px] font-extrabold ${
                          h.estado === "futuro" ? "text-muted-foreground" : ""
                        }`}
                      >
                        {h.horas}
                      </span>
                      <span
                        className={`text-[13.5px] ${
                          h.estado === "futuro" ? "font-medium text-muted-foreground" : "font-bold"
                        }`}
                      >
                        {h.titulo}
                      </span>
                      {h.estado === "cerca" && (
                        <span className="ml-auto inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                          Casi
                        </span>
                      )}
                    </span>
                    <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                      {h.meta}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => onVerHito(horas.siguienteHito)}
              className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              <Award aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Ver mis certificados
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

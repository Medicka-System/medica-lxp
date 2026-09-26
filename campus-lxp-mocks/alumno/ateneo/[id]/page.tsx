"use client";

/**
 * Ateneo · detalle de un caso — Campus Virtual · Médica Capacitación (LXP)
 * El hilo de interconsulta: visor DICOM (placeholder de Cornerstone3D), viñeta clínica,
 * sugerencias de diagnóstico votadas, conversación y cierre del docente.
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx).
 * Stubs: onComentar · onSugerirDiagnostico · onUpvote · onVotarDiagnostico · onVolver
 */

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Stethoscope,
  ThumbsUp,
} from "lucide-react";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Sugerencia = {
  id: string;
  diagnostico: string;
  autor: string;
  rol: string;
  argumento: string;
  votos: number;
  esDocente?: boolean;
};

export type Comentario = {
  id: string;
  autor: string;
  rol: string;
  hace: string;
  texto: string;
  votos: number;
  esDocente?: boolean;
  respuestas?: Comentario[];
};

export type CasoDetalle = {
  id: string;
  autor: { nombre: string; rol: string; sede: string };
  area: string;
  modulo: string;
  publicado: string;
  vineta: string;
  pregunta: string;
  tecnica: string;
  piezas: { tipo: "cine-loop" | "imagen"; etiqueta: string }[];
  votos: number;
  sugerencias: Sugerencia[];
  hilo: Comentario[];
  cierre?: { docente: string; veredicto: string; fecha: string };
};

const MOCK: CasoDetalle = {
  id: "c1",
  autor: { nombre: "Dr. Iván Torres", rol: "Urgencias", sede: "Puebla" },
  area: "Renal",
  modulo: "Módulo 4",
  publicado: "hace 2 h",
  pregunta: "¿Esta asimetría cortical es crónica o me está ganando el ángulo?",
  vineta:
    "Mujer de 46 años, dolor lumbar derecho de 3 días, sin fiebre. Creatinina normal, EGO con microhematuria. Estudio con vejiga parcialmente llena, sonda convexa 3.5 MHz.",
  tecnica: "Convexa 3.5 MHz · profundidad 14 cm · ganancia 62 · sin armónicas",
  piezas: [
    { tipo: "cine-loop", etiqueta: "riñón derecho · barrido longitudinal" },
    { tipo: "imagen", etiqueta: "riñón izquierdo · comparativo" },
    { tipo: "imagen", etiqueta: "vejiga · jet ureteral derecho" },
  ],
  votos: 12,
  sugerencias: [
    {
      id: "s1",
      diagnostico: "Nefropatía crónica incipiente del lado derecho",
      autor: "Dra. Karla Méndez",
      rol: "Medicina interna · Monterrey",
      argumento:
        "La cortical se ve homogéneamente adelgazada en los dos extremos del riñón, no solo donde el haz entra oblicuo. Eso habla de pérdida real, no de ángulo.",
      votos: 9,
    },
    {
      id: "s2",
      diagnostico: "Artefacto por ángulo de incidencia",
      autor: "Dr. Luis Arreola",
      rol: "Medicina familiar · CDMX",
      argumento:
        "En el loop, cuando la sonda se endereza al segundo 6, la cortical recupera espesor. Yo repetiría en decúbito lateral antes de concluir.",
      votos: 6,
    },
  ],
  hilo: [
    {
      id: "h1",
      autor: "Dra. Karla Méndez",
      rol: "Medicina interna · Monterrey",
      hace: "hace 1 h",
      texto:
        "¿Midió la cortical en los dos polos? Si solo midió el medio, el ángulo explica buena parte de la diferencia.",
      votos: 5,
      respuestas: [
        {
          id: "h1r1",
          autor: "Dr. Iván Torres",
          rol: "Autor del caso",
          hace: "hace 52 min",
          texto: "Medí en el polo inferior: 6 mm derecho contra 9 mm izquierdo. Subo la captura.",
          votos: 3,
        },
      ],
    },
    {
      id: "h2",
      autor: "Dr. Hugo Cuevas",
      rol: "Radiología · Guadalajara",
      hace: "hace 40 min",
      texto:
        "Me llama más la atención que el jet ureteral derecho tarda el doble en aparecer. Yo no cerraría solo con la cortical.",
      votos: 7,
    },
    {
      id: "h3",
      autor: "Dr. Alejandro Sandoval",
      rol: "Docente · Renal y abdomen",
      hace: "hace 20 min",
      texto:
        "Buen debate. Regla práctica: mida en los dos polos y en el mismo plano; si la diferencia se sostiene en ambos, es real. Aquí se sostiene, así que documente pérdida cortical derecha y correlacione con el jet.",
      votos: 14,
      esDocente: true,
    },
  ],
  cierre: {
    docente: "Dr. Alejandro Sandoval",
    veredicto:
      "Pérdida cortical derecha real, probablemente crónica, con jet ureteral retrasado del mismo lado. Reporte el hallazgo, no lo atribuya al ángulo, y solicite control en 4 semanas.",
    fecha: "hoy, 18:10",
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */

const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
const mono = "font-mono tabular-nums";
const kicker = "text-[11px] font-semibold uppercase tracking-[0.16em]";
const softText = "text-[color:var(--foreground-soft)]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

function Avatar({ nombre, size = 40, docente }: { nombre: string; size?: number; docente?: boolean }) {
  const iniciales = nombre
    .replace(/^(Dr\.|Dra\.)\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <span className="relative shrink-0">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        className="grid place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground"
      >
        {iniciales}
      </span>
      {docente && (
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]"
        >
          <BadgeCheck className="h-3 w-3" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}

function Comentarios({
  items,
  onUpvote,
  nivel = 0,
}: {
  items: Comentario[];
  onUpvote: (id: string) => void;
  nivel?: number;
}) {
  return (
    <ul className={`flex flex-col ${nivel === 0 ? "divide-y divide-border" : "mt-3 gap-3"}`}>
      {items.map((c) => (
        <li key={c.id} className={nivel === 0 ? "py-5 first:pt-0 last:pb-0" : ""}>
          <div
            className={`flex gap-3.5 ${
              nivel > 0 ? "rounded-[12px] border-l-2 border-border bg-muted p-3.5" : ""
            }`}
          >
            <Avatar nombre={c.autor} size={nivel > 0 ? 32 : 40} docente={c.esDocente} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-bold leading-snug">
                {c.autor}
                <span className="font-medium text-muted-foreground">{c.rol}</span>
                {c.esDocente && (
                  <span className="inline-flex h-5 items-center rounded-full bg-sidebar px-2 text-[10.5px] font-bold text-sidebar-foreground">
                    Docente
                  </span>
                )}
                <span className={`${mono} ml-auto text-[11.5px] font-normal text-muted-foreground`}>
                  {c.hace}
                </span>
              </p>
              <p
                className={`mt-2 text-[14.5px] leading-relaxed ${
                  c.esDocente ? "font-medium text-foreground" : softText
                }`}
              >
                {c.texto}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpvote(c.id)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ThumbsUp aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  <span className={mono}>{c.votos}</span>
                </button>
                <button
                  type="button"
                  className={`inline-flex h-9 items-center rounded-full px-2.5 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  Responder
                </button>
              </div>
              {c.respuestas && <Comentarios items={c.respuestas} onUpvote={onUpvote} nivel={nivel + 1} />}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function CasoAteneoDetalle({ data = MOCK }: { data?: CasoDetalle }) {
  const { autor, area, modulo, publicado, pregunta, vineta, tecnica, piezas, votos, sugerencias, hilo, cierre } =
    data;
  const [modo, setModo] = useState<"comentar" | "diagnostico">("comentar");
  const [texto, setTexto] = useState("");
  const [pieza, setPieza] = useState(0);
  const [siguiendo, setSiguiendo] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [miReaccion, setMiReaccion] = useState<"util" | "ojo" | null>("util");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onVolver = () => {};
  const onUpvote = (_id: string) => {};
  const onComentar = (_texto: string) => setTexto("");
  const onSugerirDiagnostico = (_texto: string) => setTexto("");
  const onVotarDiagnostico = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <button
        type="button"
        onClick={onVolver}
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold transition-colors hover:bg-accent ${focusRing}`}
      >
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Volver al Ateneo
      </button>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ══════════ CASO ══════════ */}
        <div className="min-w-0">
          <div className={`${card} overflow-hidden`}>
            {/* visor */}
            <div className="relative" style={{ background: "var(--wave-0)" }}>
              <div
                aria-hidden
                className="relative grid w-full place-items-center"
                style={{
                  aspectRatio: "16 / 10",
                  background:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                }}
              >
                <span
                  className={`${mono} px-4 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  visor DICOM · Cornerstone3D · {piezas[pieza].etiqueta}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                <button
                  type="button"
                  aria-label="Pieza anterior"
                  onClick={() => setPieza((p) => Math.max(0, p - 1))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
                <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                  {piezas.map((p, i) => (
                    <button
                      key={p.etiqueta}
                      type="button"
                      onClick={() => setPieza(i)}
                      aria-pressed={pieza === i}
                      className={`${mono} h-9 shrink-0 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                        pieza === i
                          ? "bg-primary text-[color:var(--sidebar)]"
                          : "bg-white/12 text-white hover:bg-white/20"
                      }`}
                    >
                      {p.tipo === "cine-loop" ? "loop" : `img ${i}`}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Pieza siguiente"
                  onClick={() => setPieza((p) => Math.min(piezas.length - 1, p + 1))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* viñeta */}
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar nombre={autor.nombre} />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold leading-snug">{autor.nombre}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {autor.rol} · {autor.sede} · {publicado}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSiguiendo((v) => !v)}
                  aria-pressed={siguiendo}
                  className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[12.5px] font-bold transition-colors ${focusRing} ${
                    siguiendo
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border bg-card text-secondary hover:bg-accent"
                  }`}
                >
                  {siguiendo ? "Siguiendo" : "Seguir"}
                </button>
                <span className="ml-auto flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                    {area}
                  </span>
                  <span className={`${mono} text-[11.5px] text-muted-foreground`}>{modulo}</span>
                </span>
              </div>

              <h1 className="mt-4 max-w-[46ch] text-[26px] font-extrabold leading-tight tracking-[-0.025em]">
                {pregunta}
              </h1>
              <p className={`mt-3 max-w-[70ch] text-[15px] leading-relaxed ${softText}`}>{vineta}</p>
              <p className={`${mono} mt-3 text-[11.5px] text-muted-foreground`}>{tecnica}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-b border-border pb-4">
                <span className="flex pl-1.5" aria-hidden>
                  {["KM", "LA", "HC", "+9"].map((i) => (
                    <span
                      key={i}
                      className={`-ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground ${mono}`}
                    >
                      {i}
                    </span>
                  ))}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  A <span className="font-semibold text-foreground">Karla</span> y{" "}
                  <span className={mono}>{votos - 1}</span> colegas les parece útil
                </span>
                <span className={`${mono} ml-auto text-[12.5px] text-muted-foreground`}>
                  {hilo.length} hilos · {sugerencias.length} diagnósticos propuestos
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    ["util", ThumbsUp, "Útil", votos],
                    ["ojo", Eye, "Buen ojo", 5],
                  ] as const
                ).map(([id, Icono, etiqueta, n]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMiReaccion(miReaccion === id ? null : id)}
                    aria-pressed={miReaccion === id}
                    className={`inline-flex h-10 items-center gap-[7px] rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
                      miReaccion === id
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border bg-card text-[color:var(--foreground-soft)] hover:bg-muted"
                    }`}
                  >
                    <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                    {etiqueta}
                    <span className={`${mono} text-muted-foreground`}>{n}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setModo("diagnostico")}
                  className={`inline-flex h-10 items-center gap-[7px] rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:bg-muted ${focusRing}`}
                >
                  <Stethoscope aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  Sugerir diagnóstico
                  <span className={`${mono} text-muted-foreground`}>{sugerencias.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModo("comentar")}
                  className={`inline-flex h-10 items-center gap-[7px] rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:bg-muted ${focusRing}`}
                >
                  <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  Comentar
                  <span className={`${mono} text-muted-foreground`}>{hilo.length}</span>
                </button>
                <button
                  type="button"
                  aria-label="Guardar"
                  aria-pressed={guardado}
                  onClick={() => setGuardado((v) => !v)}
                  className={`ml-auto grid h-10 w-10 place-items-center rounded-full border transition-colors ${focusRing} ${
                    guardado
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          {/* cierre del docente */}
          {cierre && (
            <section
              aria-label="Cierre del docente"
              className="mt-5 overflow-hidden rounded-xl"
              style={{ background: "var(--sidebar)" }}
            >
              <div className="flex flex-wrap items-start gap-4 p-6">
                <Avatar nombre={cierre.docente} size={44} docente />
                <div className="min-w-0 flex-1">
                  <p className={kicker} style={{ color: "var(--primary)" }}>
                    Cierre del docente · {cierre.fecha}
                  </p>
                  <p className="mt-2 text-[16px] font-bold" style={{ color: "var(--hero-ink)" }}>
                    {cierre.docente}
                  </p>
                  <p
                    className="mt-2 max-w-[66ch] text-[15px] leading-relaxed"
                    style={{ color: "var(--hero-ink-soft)" }}
                  >
                    {cierre.veredicto}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* hilo */}
          <section aria-label="Hilo de interconsulta" className={`${card} mt-5 p-6`}>
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">
              Interconsulta de la comunidad
            </h2>
            <div className="mt-5">
              <Comentarios items={hilo} onUpvote={onUpvote} />
            </div>
          </section>

          {/* compositor */}
          <section aria-label="Participar" className={`${card} mt-5 p-5 sm:p-6`}>
            <div
              role="tablist"
              aria-label="Cómo quiere participar"
              className="flex w-fit gap-1.5 rounded-full bg-muted p-1"
            >
              {(
                [
                  ["comentar", "Comentar"],
                  ["diagnostico", "Sugerir diagnóstico"],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={modo === id}
                  onClick={() => setModo(id)}
                  className={`h-10 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                    modo === id
                      ? "bg-sidebar text-sidebar-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <label htmlFor="aporte" className="sr-only">
              {modo === "comentar" ? "Su comentario" : "Su diagnóstico"}
            </label>
            <textarea
              id="aporte"
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                modo === "comentar"
                  ? "Pregunte o aporte lo que usted haría en este caso…"
                  : "Diagnóstico y el hallazgo en el que se apoya…"
              }
              className={`mt-4 w-full resize-none rounded-[11px] border border-border bg-card p-3.5 text-[14.5px] leading-relaxed text-foreground placeholder:text-muted-foreground ${focusRing}`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
                Sin datos del paciente. La comunidad ve su nombre y su sede.
              </p>
              <button
                type="button"
                onClick={() => (modo === "comentar" ? onComentar(texto) : onSugerirDiagnostico(texto))}
                disabled={!texto.trim()}
                className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
              >
                {modo === "comentar" ? (
                  <>
                    <MessageCircle aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    Publicar comentario
                  </>
                ) : (
                  <>
                    <Stethoscope aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    Proponer diagnóstico
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* ══════════ RAIL: diagnósticos propuestos ══════════ */}
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[92px]">
          <section className={`${card} p-5`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={`${kicker} text-muted-foreground`}>Diagnósticos propuestos</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {sugerencias.length}
              </span>
            </div>
            <ul className="mt-4 flex flex-col gap-4">
              {sugerencias.map((s) => (
                <li key={s.id} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <p className="text-[14.5px] font-bold leading-snug">{s.diagnostico}</p>
                  <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>{s.argumento}</p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Avatar nombre={s.autor} size={28} docente={s.esDocente} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">{s.autor}</span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">{s.rol}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onVotarDiagnostico(s.id)}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[12.5px] font-semibold transition-colors hover:bg-accent ${focusRing}`}
                    >
                      <ThumbsUp aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      <span className={mono}>{s.votos}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${kicker} text-muted-foreground`}>Reglas del Ateneo</h2>
            <ul className={`mt-3 flex flex-col gap-2.5 text-[13px] leading-snug ${softText}`}>
              <li>Nunca suba datos que identifiquen al paciente.</li>
              <li>Argumente con el hallazgo, no con la intuición.</li>
              <li>El cierre del docente es la referencia para el expediente.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

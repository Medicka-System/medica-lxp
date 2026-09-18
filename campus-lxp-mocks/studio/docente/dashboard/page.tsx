"use client";

/**
 * Studio · Inicio del DOCENTE — bandeja de trabajo
 *
 * El docente NO construye contenido (eso es el diseñador instruccional): opera y acompaña SUS
 * grupos — valida casos, revisa entregas, modera foros y da clase en vivo. Solo ve sus grupos
 * asignados.
 *
 * Por eso el home es una BANDEJA, no un dashboard: nada de gráficas ni métricas de vanidad. Lo
 * primero son las tres colas que dependen de él, cada una con su conteo y un solo CTA.
 *
 * Navegación en el HEADER (sin sidebar): Inicio · Validación · Grupos · Ateneo · Clases, más
 * utilidades (buscar, notificaciones, cuenta, volver al campus). El layout vive en
 * app/(studio-docente)/layout.tsx.
 *
 * Un solo color de atención: ÁMBAR para lo que realmente urge (casos con más de 72 h, grupos con
 * casos acumulados o alumnos atrasados). Sin rojo — nada aquí es dinero vencido.
 *
 * Stubs: onValidar · onRevisarEntrega · onModerarForo · onIniciarClase · onAbrirGrupo · onAbrirPost
 */

import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  MessageSquare,
  Play,
  ScanLine,
  Send,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoPendiente = "casos" | "entregas" | "foros";

export type LineaIA = { clase: "ok" | "criterio"; texto: string };

export type Pendiente = {
  tipo: TipoPendiente;
  titulo: string;
  n: number;
  unidad: string;
  /** lo que Eco ya hizo y lo que exige criterio humano */
  analisisIA: LineaIA[];
  cta: string;
  ctaSecundaria: string;
  /** solo lo que realmente urge se pinta en ámbar */
  urgente?: boolean;
};

export type ClaseEnVivo = {
  hoy: boolean;
  hora: string;
  cuando: string;
  tema: string;
  grupo: string;
  alumnos: number;
  plataforma: string;
  siguiente?: string;
};

export type GrupoDocente = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: "En línea" | "Mixta" | "Presencial";
  alumnos: number;
  avance: number;
  /** null = al día */
  atencion: string | null;
};

export type PostAteneo = {
  id: string;
  ini: string;
  autor: string;
  grupo: string;
  texto: string;
  meta: string;
  cuando: string;
  pideInterconsulta?: boolean;
};

export type Anuncio = {
  rotulo: string;
  texto: string;
  cta: string;
  video: { duracion: string; poster?: string; url?: string };
};

export type MensajeIA = {
  id: string;
  de: "docente" | "ia";
  texto: string;
  /** salida estructurada: Eco entrega trabajo hecho, no sólo prosa */
  tabla?: { quien: string; que: string; nota: string; porque: string }[];
  borrador?: string;
  acciones?: { etiqueta: string; primaria?: boolean }[];
};

export type Asistente = {
  abierto: boolean;
  resumen: string;
  sugerencias: string[];
  conversacion: MensajeIA[];
};

export type DocenteHomeData = {
  docente: { nombre: string; ini: string };
  fecha: string;
  anuncio: Anuncio;
  asistente: Asistente;
  totalPendientes: number;
  totalGrupos: number;
  totalAlumnos: number;
  pendientes: Pendiente[];
  clase: ClaseEnVivo;
  grupos: GrupoDocente[];
  ateneo: PostAteneo[];
};

const MOCK: DocenteHomeData = {
  docente: { nombre: "Dr. Sandoval", ini: "AS" },
  fecha: "martes 16 de septiembre",
  anuncio: {
    rotulo: "Anuncio",
    texto:
      "Los casos de la bitácora ya llegan con la serie completa: puede validar sin pedirle imágenes al alumno.",
    cta: "Ver anuncio",
    video: { duracion: "3:12" },
  },
  asistente: {
    abierto: false,
    resumen: "Ya revisó las entregas y los casos de hoy. Pídale el trabajo que quiera adelantar.",
    sugerencias: [
      "Resúmeme las entregas del Grupo B",
      "Dame los mejores casos de esta semana",
      "¿Qué calificación sugieres para estos y por qué?",
      "Redacta el feedback para los que reprobaron",
    ],
    conversacion: [
      { id: "m1", de: "docente", texto: "Resúmeme las entregas del Grupo B" },
      {
        id: "m2",
        de: "ia",
        texto:
          "Revisé las 6 entregas del Módulo 04. Cuatro son autoevaluaciones que ya califiqué; dos son tareas abiertas con nota sugerida.",
        tabla: [
          { quien: "Dra. K. Méndez", que: "Tarea · caso renal", nota: "9.2", porque: "Gradación correcta, falta medir cortical en ambos polos" },
          { quien: "Dr. H. Cuevas", que: "Tarea · caso renal", nota: "7.5", porque: "Confunde quiste parapiélico con cáliz; el resto está bien" },
          { quien: "4 alumnos", que: "Autoevaluación", nota: "8.8 prom", porque: "Ya calificadas — solo falta liberarlas" },
        ],
        acciones: [
          { etiqueta: "Aprobar las 4 calificadas", primaria: true },
          { etiqueta: "Abrir las 2 tareas" },
        ],
      },
      { id: "m3", de: "docente", texto: "Redacta el feedback para el que reprobó" },
      {
        id: "m4",
        de: "ia",
        texto: "Borrador para Dr. H. Cuevas, en su tono habitual:",
        borrador:
          "Doctor: su barrido y la ventana son correctos. El punto a corregir es la lectura del seno renal — lo que identificó como cáliz dilatado no comunica con el resto del sistema, así que se trata de un quiste parapiélico. Repita el corte longitudinal y compare con Doppler antes de cerrar el grado. Vuelva a subir el caso y lo revisamos.",
        acciones: [{ etiqueta: "Usar este texto", primaria: true }, { etiqueta: "Editarlo" }],
      },
    ],
  },
  totalPendientes: 17,
  totalGrupos: 3,
  totalAlumnos: 68,
  pendientes: [
    {
      tipo: "casos",
      titulo: "Casos por validar",
      n: 9,
      unidad: "de sus alumnos",
      analisisIA: [
        { clase: "ok", texto: "7 listos para confirmar — hallazgos y diagnóstico coinciden con la rúbrica" },
        { clase: "criterio", texto: "2 requieren su criterio — 3 llevan más de 72 h en cola" },
      ],
      cta: "Revisar y aprobar en lote",
      ctaSecundaria: "Ver los 2 dudosos primero",
      urgente: true,
    },
    {
      tipo: "entregas",
      titulo: "Entregas por revisar",
      n: 6,
      unidad: "tareas y autoevaluaciones",
      analisisIA: [
        { clase: "ok", texto: "4 autoevaluaciones ya calificadas — solo falta que las libere" },
        { clase: "criterio", texto: "2 abiertas con nota sugerida — Eco explica por qué propone cada una" },
      ],
      cta: "Revisar notas sugeridas",
      ctaSecundaria: "Liberar las 4 calificadas",
    },
    {
      tipo: "foros",
      titulo: "Foros con actividad",
      n: 2,
      unidad: "hilos sin respuesta",
      analisisIA: [
        { clase: "ok", texto: "2 borradores de respuesta listos — con la fuente del módulo citada" },
        { clase: "criterio", texto: "1 lleva 14 h sin contestar — Grupo B, gradación II–III" },
      ],
      cta: "Leer y publicar",
      ctaSecundaria: "Editar el borrador",
    },
  ],
  clase: {
    hoy: true,
    hora: "19:00",
    cuando: "en 2 h 40 min",
    tema: "Hidronefrosis: casos difíciles del módulo 4",
    grupo: "Grupo B · Nov 2026",
    alumnos: 28,
    plataforma: "Zoom",
    siguiente: "jueves 19:00 · Grupo A",
  },
  grupos: [
    { id: "g1", nombre: "Grupo B · Nov 2026", programa: "Ultrasonografía Médica", modalidad: "En línea", alumnos: 28, avance: 48, atencion: "4 casos acumulados" },
    { id: "g2", nombre: "Grupo A · Sep 2026", programa: "Ultrasonografía Médica", modalidad: "Mixta", alumnos: 24, avance: 72, atencion: null },
    { id: "g3", nombre: "Grupo POCUS · Oct 2026", programa: "POCUS en Urgencias", modalidad: "Presencial", alumnos: 16, avance: 34, atencion: "2 alumnos atrasados" },
  ],
  ateneo: [
    { id: "p1", ini: "IT", autor: "Dr. Iván Torres", grupo: "Grupo B", texto: "¿Esta asimetría cortical es crónica o me está ganando el ángulo?", meta: "7 comentarios · 2 diagnósticos", cuando: "hace 2 h", pideInterconsulta: true },
    { id: "p2", ini: "KM", autor: "Dra. Karla Méndez", grupo: "Grupo A", texto: "En equipos portátiles, ¿qué preset usan de entrada para riñón?", meta: "encuesta · 86 votos", cuando: "hace 4 h" },
    { id: "p3", ini: "LA", autor: "Dr. Luis Arreola", grupo: "Grupo POCUS", texto: "Acreditó el Módulo 3 · Hígado y vía biliar", meta: "11 felicitaciones", cuando: "ayer" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ICONO_PENDIENTE: Record<TipoPendiente, typeof ScanLine> = {
  casos: ScanLine,
  entregas: ClipboardCheck,
  foros: MessageSquare,
};

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function DocenteInicio({ data = MOCK }: { data?: DocenteHomeData }) {
  const {
    fecha,
    anuncio,
    asistente,
    totalPendientes,
    totalGrupos,
    totalAlumnos,
    pendientes,
    clase,
    grupos,
    ateneo,
  } = data;

  /* ── Stubs ─────────────────────────────────────────────── */
  const onValidar = () => {};
  const onRevisarEntrega = () => {};
  const onModerarForo = () => {};
  const onIniciarClase = () => {};
  const onVerAnuncio = () => {};
  const onPedirAlAsistente = (_peticion: string) => {};
  const onAprobarLote = (_tipo: TipoPendiente) => {};
  const [iaAbierta, setIaAbierta] = useState(asistente.abierto);
  const [peticion, setPeticion] = useState("");
  const onAbrirGrupo = (_id: string) => {};
  const onAbrirPost = (_id: string) => {};
  const accion: Record<TipoPendiente, () => void> = {
    casos: onValidar,
    entregas: onRevisarEntrega,
    foros: onModerarForo,
  };
  /* ──────────────────────────────────────────────────────── */

  const sinPendientes = pendientes.every((p) => p.n === 0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      {/* ══════ 1 · El anuncio vive en una tira: el docente entra a trabajar ══════ */}
      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-3.5 py-2.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sidebar text-sidebar-foreground"
        >
          <Play className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span
          className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold ${softText}`}
        >
          {anuncio.rotulo}
        </span>
        <p className={`min-w-0 flex-1 truncate text-[12.5px] ${softText}`}>{anuncio.texto}</p>
        <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>{fecha}</span>
        <button
          type="button"
          onClick={onVerAnuncio}
          className={`h-8 shrink-0 whitespace-nowrap rounded-lg border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          {anuncio.cta} · {anuncio.video.duracion}
        </button>
      </div>

      {/* ══════ 3 · Eco: el docente le pide trabajo en lenguaje natural ══════ */}
      {!iaAbierta && (
        <section
          aria-label="Eco"
          className="relative mt-3.5 overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(238,242,255,.95) 0%, rgba(255,255,255,0) 58%)",
            }}
          />
          <div className="relative flex flex-wrap items-center gap-3.5">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
            >
              <Sparkles className="h-[21px] w-[21px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[14.5px] font-bold leading-snug">Eco</p>
                <span className="inline-flex h-[21px] items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                  Propone · usted confirma
                </span>
              </div>
              <p className={`mt-1 text-[12.5px] ${softText}`}>{asistente.resumen}</p>
            </div>
            <button
              type="button"
              onClick={() => setIaAbierta(true)}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-[color:var(--info-foreground)] px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-sidebar ${focusRing}`}
            >
              <Sparkles aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Abrir Eco
            </button>
          </div>

          <form
            className="relative mt-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              onPedirAlAsistente(peticion);
              setIaAbierta(true);
            }}
          >
            <label className="flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4">
              <span className="sr-only">Pedirle trabajo a Eco</span>
              <input
                type="text"
                value={peticion}
                onChange={(e) => setPeticion(e.target.value)}
                placeholder="Pídale a Eco: “resúmeme las entregas del Grupo B”…"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Send
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 text-[color:var(--info-foreground)]"
                strokeWidth={1.75}
              />
            </label>
          </form>

          <div className="relative mt-2.5 flex gap-2 overflow-x-auto">
            {asistente.sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onPedirAlAsistente(s);
                  setIaAbierta(true);
                }}
                className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-1 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {/* ══════ PENDIENTES · protagonista ══════ */}
          <section className="mt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Pendientes de hoy</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {totalPendientes} en total · {totalGrupos} grupos · {totalAlumnos} alumnos
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-[color:var(--info-foreground)]">
                <Sparkles aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Eco propone; usted confirma. Nada se asienta sin su aprobación.
              </span>
            </div>

            {sinPendientes ? (
              /* día limpio: la bandeja lo dice y ofrece el siguiente paso */
              <div className="mt-3.5 rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-9 py-11 text-center">
                <span
                  aria-hidden
                  className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground"
                >
                  <Check className="h-[26px] w-[26px]" strokeWidth={2.2} />
                </span>
                <h3 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">
                  Bandeja al día
                </h3>
                <p className={`mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-relaxed ${softText}`}>
                  No hay casos, entregas ni foros esperando. Cuando un alumno suba un caso o
                  entregue una tarea, aparecerá aquí.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  {["Ver lo que ya validó", "Preparar la clase del jueves"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendientes.map((p) => {
                  const Icono = ICONO_PENDIENTE[p.tipo];
                  return (
                    <li key={p.tipo}>
                      <article
                        className={`flex h-full flex-col rounded-xl border bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
                          p.urgente ? "border-[color:var(--warning-border)]" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] ${
                              p.urgente
                                ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          </span>
                          <p className="min-w-0 flex-1 text-[14px] font-bold leading-snug">
                            {p.titulo}
                          </p>
                          {p.urgente && (
                            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                              <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                              Urge
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-baseline gap-2.5">
                          <span
                            className={`${mono} text-[44px] font-extrabold leading-none tracking-[-0.03em]`}
                          >
                            {p.n}
                          </span>
                          <span className="text-[13px] font-semibold text-muted-foreground">
                            {p.unidad}
                          </span>
                        </div>

                        <div className="mt-3.5 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
                          <Sparkles
                            aria-hidden
                            className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]"
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                            Eco ya los analizó
                          </span>
                        </div>

                        <ul className="mt-3 flex flex-1 flex-col gap-2">
                          {p.analisisIA.map((l) => (
                            <li key={l.texto} className="flex items-start gap-2">
                              {l.clase === "ok" ? (
                                <Check
                                  aria-hidden
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
                                  strokeWidth={2.6}
                                />
                              ) : (
                                <TriangleAlert
                                  aria-hidden
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                                  strokeWidth={2}
                                />
                              )}
                              <span
                                className={`min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed ${
                                  l.clase === "ok"
                                    ? "text-foreground"
                                    : "text-[color:var(--warning-foreground)]"
                                }`}
                              >
                                {l.texto}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={() => onAprobarLote(p.tipo)}
                          className={`mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-bold transition-colors ${focusRing} ${
                            p.urgente
                              ? "bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                              : "bg-accent text-accent-foreground hover:bg-[color:var(--track)]"
                          }`}
                        >
                          {p.cta}
                          <ArrowRight aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={accion[p.tipo]}
                          className={`mt-1.5 h-9 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
                        >
                          {p.ctaSecundaria}
                        </button>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ══════ MIS GRUPOS · solo los que imparte ══════ */}
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Mis grupos</h2>
              <button
                type="button"
                className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Ver todos
                <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className={`${card} mt-3.5 overflow-hidden`}>
              <div className="flex items-center gap-4 bg-muted px-[18px] py-2.5">
                {(
                  [
                    ["Grupo", "flex-[1.4]"],
                    ["Alumnos", "shrink-0"],
                    ["Avance del programa", "flex-1 min-w-[120px]"],
                    ["Estado", "shrink-0 w-[170px] text-right"],
                    ["", "shrink-0 w-[17px]"],
                  ] as const
                ).map(([t, cls]) => (
                  <span
                    key={t || "chev"}
                    className={`${kicker} ${cls} whitespace-nowrap text-muted-foreground`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {grupos.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onAbrirGrupo(g.id)}
                  className={`flex w-full items-center gap-4 border-t border-border px-[18px] py-4 text-left transition-colors hover:bg-muted ${focusRing}`}
                >
                  <span className="min-w-0 flex-[1.4]">
                    <span className="block text-[14px] font-bold leading-snug">{g.nombre}</span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {g.programa} · {g.modalidad}
                    </span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold ${softText}`}
                  >
                    <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    <span className={`${mono} font-bold text-foreground`}>{g.alumnos}</span>
                    alumnos
                  </span>
                  <span className="flex min-w-[120px] flex-1 items-center gap-2.5">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${g.avance}%` }}
                      />
                    </span>
                    <span className={`${mono} shrink-0 text-[12.5px] font-bold`}>{g.avance}%</span>
                  </span>
                  <span className="w-[170px] shrink-0 text-right">
                    {g.atencion ? (
                      <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                        <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                        {g.atencion}
                      </span>
                    ) : (
                      <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                        <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                        Al día
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="h-[17px] w-[17px] shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ══════ RAIL: asistente abierto, o clase en vivo + Ateneo ══════ */}
        <div className="mt-5 min-w-0">
          {/* con el asistente abierto la clase de hoy se colapsa a una tira: el CTA con hora crítica no desaparece */}
          {iaAbierta && clase.hoy && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-sidebar px-3.5 py-3">
              <span
                aria-hidden
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-primary text-[color:var(--sidebar)]"
              >
                <Video className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`${mono} text-[15px] font-extrabold`} style={{ color: "var(--hero-ink)" }}>
                    {clase.hora}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--hero-ink-muted)" }}>
                    {clase.cuando}
                  </span>
                </span>
                <span
                  className="mt-0.5 block truncate text-[11.5px]"
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  {clase.grupo} · {clase.tema}
                </span>
              </span>
              <button
                type="button"
                onClick={onIniciarClase}
                className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
              >
                Iniciar clase
              </button>
            </div>
          )}

          {iaAbierta ? (
            /* panel conversacional: Eco entrega trabajo hecho y el docente actúa sobre eso */
            <aside
              aria-label="Eco"
              className="sticky top-4 flex max-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
            >
              <div className="flex items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
                >
                  <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--info-foreground)]">
                    Propone · usted confirma
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIaAbierta(false)}
                  aria-label="Cerrar Eco"
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
                >
                  <X aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                {asistente.conversacion.map((m) =>
                  m.de === "docente" ? (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-[84%] rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                        {m.texto}
                      </p>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                      >
                        <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-relaxed ${softText}`}>{m.texto}</p>

                        {m.tabla && (
                          <>
                            <ul className="mt-2.5 overflow-hidden rounded-[11px] border border-border">
                              {m.tabla.map((r, i) => (
                                <li
                                  key={r.quien}
                                  className={`flex items-start gap-2.5 px-3 py-2.5 ${
                                    i ? "border-t border-border" : ""
                                  }`}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-bold">{r.quien}</span>
                                    <span className="mt-px block text-[10.5px] text-muted-foreground">
                                      {r.que}
                                    </span>
                                    <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>
                                      {r.porque}
                                    </span>
                                  </span>
                                  <span
                                    className={`${mono} inline-flex h-[26px] shrink-0 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[12px] font-bold text-[color:var(--info-foreground)]`}
                                  >
                                    {r.nota}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                              Son propuestas: ninguna nota queda asentada hasta que usted la apruebe.
                            </p>
                          </>
                        )}

                        {m.borrador && (
                          <div className="mt-2.5 rounded-[11px] border border-border bg-muted px-3.5 py-3">
                            <p className={`text-[12.5px] leading-relaxed ${softText}`}>{m.borrador}</p>
                          </div>
                        )}

                        {m.acciones && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {m.acciones.map((a) => (
                              <button
                                key={a.etiqueta}
                                type="button"
                                className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                                  a.primaria
                                    ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                                    : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                              >
                                {a.primaria ? (
                                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                                ) : (
                                  <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                                )}
                                {a.etiqueta}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="shrink-0 border-t border-border bg-card px-4 pb-4 pt-3">
                <div className="flex gap-1.5 overflow-x-auto">
                  {asistente.sugerencias.slice(1).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onPedirAlAsistente(s)}
                      className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <form
                  className="mt-2.5 flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onPedirAlAsistente(peticion);
                    setPeticion("");
                  }}
                >
                  <span className="sr-only">Pedirle trabajo a Eco</span>
                  <input
                    type="text"
                    value={peticion}
                    onChange={(e) => setPeticion(e.target.value)}
                    placeholder="Pídale trabajo a Eco…"
                    className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    aria-label="Enviar"
                    className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
                  >
                    <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </aside>
          ) : clase.hoy ? (
            /* el único botón invertido de la pantalla: no compite con las colas */            <section
              className="relative overflow-hidden rounded-[14px] p-5"
              style={{ background: "var(--sidebar)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 140% at 88% 0%, rgba(26,136,128,.62) 0%, rgba(15,45,82,0) 62%)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                }}
              />
              <div className="relative">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 text-[11px] font-bold text-[color:var(--sidebar)]">
                  <Video aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                  Clase en vivo · hoy
                </span>
                <div className="mt-3.5 flex items-baseline gap-2.5">
                  <span
                    className={`${mono} text-[34px] font-extrabold leading-none tracking-[-0.03em]`}
                    style={{ color: "var(--hero-ink)" }}
                  >
                    {clase.hora}
                  </span>
                  <span className="text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
                    {clase.cuando}
                  </span>
                </div>
                <p
                  className="mt-3 text-[15.5px] font-bold leading-snug"
                  style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
                >
                  {clase.tema}
                </p>
                <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
                  {clase.grupo} · {clase.alumnos} alumnos · {clase.plataforma}
                </p>
                <button
                  type="button"
                  onClick={onIniciarClase}
                  className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-card text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  <Video aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
                  Iniciar clase
                </button>
                {clase.siguiente && (
                  <div className="mt-3 flex items-center gap-2.5 border-t border-white/20 pt-3">
                    <span
                      className="min-w-0 flex-1 text-[11.5px] leading-relaxed"
                      style={{ color: "var(--hero-ink-muted)" }}
                    >
                      La siguiente: {clase.siguiente}
                    </span>
                    <button
                      type="button"
                      className="h-8 shrink-0 whitespace-nowrap rounded-full border border-white/30 px-2.5 text-[11.5px] font-semibold text-white"
                    >
                      Mis clases
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className={`${card} rounded-[14px] p-5`}>
              <span
                className={`inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[11px] font-bold ${softText}`}
              >
                <Calendar aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                Sin clase hoy
              </span>
              <p className={`${kicker} mt-3.5 text-muted-foreground`}>Próxima clase</p>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span className={`${mono} text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>
                  {clase.hora}
                </span>
                <span className="text-[12.5px] text-muted-foreground">{clase.cuando}</span>
              </div>
              <p className="mt-3 text-[14.5px] font-bold leading-snug">{clase.tema}</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {clase.grupo} · {clase.alumnos} alumnos · {clase.plataforma}
              </p>
              <button
                type="button"
                className={`mt-4 h-11 w-full rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                Ver mis clases
              </button>
            </section>
          )}

          {/* Ateneo: vistazo accionable de SUS grupos, no el muro completo */}
          <section className={`${card} mt-5 p-5`}>
            <div className="flex items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Ateneo · de sus grupos</h2>
              <button
                type="button"
                className={`ml-auto h-[30px] rounded-full px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                Ver todo
              </button>
            </div>
            <ul className="mt-2.5 flex flex-col gap-0.5">
              {ateneo.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirPost(p.id)}
                    className={`flex w-full gap-2.5 rounded-[10px] px-2.5 py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-[11.5px] font-bold text-sidebar-foreground"
                    >
                      {p.ini}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-bold">{p.autor}</span>
                        <span
                          className={`inline-flex h-[19px] items-center rounded-full border border-border bg-muted px-1.5 text-[10px] font-semibold ${softText}`}
                        >
                          {p.grupo}
                        </span>
                        {p.pideInterconsulta && (
                          <span className="inline-flex h-[19px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                            Pide interconsulta
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-1 block text-[12.5px] font-medium leading-relaxed ${softText}`}
                        style={{ textWrap: "pretty" }}
                      >
                        {p.texto}
                      </span>
                      <span className={`${mono} mt-1 block text-[11px] text-muted-foreground`}>
                        {p.meta} · {p.cuando}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Studio · Clases (docente) — sesiones en vivo
 *
 * El video NO corre aquí: la clase se lanza a Zoom, o la sesión de ultrasonido se abre en MiCo+
 * (Mindray) y se ejecuta en el equipo. Esta pantalla programa, inicia y recupera.
 *
 * La grabación de Zoom vuelve sola ~20 min después y se liga a la lección del grupo; la de MiCo+
 * se graba en el equipo y espera a que el técnico la libere. Se dice en pantalla para que el
 * docente no se pregunte dónde quedó su video.
 *
 * Solo ve las clases de SUS grupos. Un solo color de atención: ÁMBAR para la clase de hoy y para
 * la grabación que aún no está ligada.
 *
 * Stubs: onIniciarClase · onAbrirMiCo · onProgramarClase · onVerGrabacion · onPreguntarEco ·
 *        onVerAsistencia · onLigarLeccion · onEditarClase
 */

import { useMemo, useState } from "react";
import {
  BookCopy,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Send,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, kicker, softText, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";


/** Sonda: MiCo+ no es una videollamada, es el equipo transmitiendo. */
function SondaIcon({ className = "", strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6v8a3 3 0 0 1-6 0z" />
      <path d="M12 14v3" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0z" />
    </svg>
  );
}

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoSesion = "zoom" | "mico";

export type ClaseProgramada = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  alumnos: number;
  dia: string;
  hora: string;
  duracion: string;
  leccion?: string;
  hoy?: boolean;
  empiezaEn?: string;
  materialAdjunto?: number;
};

export type Grabacion = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  fecha: string;
  duracion: string;
  asistieron: number;
  total: number;
  ligada: boolean;
  poster?: string;
};

export type RespuestaEco = {
  pregunta: string;
  intro: string;
  temas: { fecha: string; tema: string; asistencia: string }[];
  remate: string;
  acciones: { etiqueta: string; primaria?: boolean }[];
};

export type ClasesData = {
  clases: ClaseProgramada[];
  grabaciones: Grabacion[];
  gruposFiltro: string[];
  resumenMes: { titulo: string; valor: string; detalle: string }[];
  eco: { respuesta: RespuestaEco; sugerencias: string[] };
  totalGrabaciones: number;
};

const MOCK: ClasesData = {
  totalGrabaciones: 18,
  gruposFiltro: ["Todas", "Grupo B", "Grupo A", "POCUS"],
  clases: [
    {
      id: "cl1",
      tipo: "zoom",
      tema: "Hidronefrosis: casos difíciles del módulo 4",
      grupo: "Grupo B · Nov 2026",
      alumnos: 28,
      dia: "hoy",
      hora: "19:00",
      duracion: "90 min",
      leccion: "M04 · L3",
      hoy: true,
      empiezaEn: "2 h 40 min",
      materialAdjunto: 2,
    },
    { id: "cl2", tipo: "zoom", tema: "Doppler renal: cuándo sí aporta", grupo: "Grupo A · Sep 2026", alumnos: 24, dia: "jue 18 sep", hora: "19:00", duracion: "90 min", leccion: "M08 · L1" },
    { id: "cl3", tipo: "mico", tema: "Barrido renal en vivo con el equipo", grupo: "Grupo POCUS · Oct 2026", alumnos: 16, dia: "vie 19 sep", hora: "18:30", duracion: "60 min", leccion: "M02 · L4" },
    { id: "cl4", tipo: "zoom", tema: "Informe estructurado: cómo dictarlo", grupo: "Grupo B · Nov 2026", alumnos: 28, dia: "lun 22 sep", hora: "19:00", duracion: "75 min", leccion: "M04 · L6" },
    { id: "cl5", tipo: "mico", tema: "Doppler color paso a paso (manos a la sonda)", grupo: "Grupo A · Sep 2026", alumnos: 24, dia: "mié 24 sep", hora: "20:00", duracion: "90 min", leccion: "M08 · L3" },
    { id: "cl6", tipo: "zoom", tema: "Ateneo de urgencias: casos de guardia", grupo: "Grupo POCUS · Oct 2026", alumnos: 16, dia: "jue 25 sep", hora: "19:00", duracion: "60 min" },
  ],
  grabaciones: [
    { id: "g1", tipo: "zoom", tema: "Gradación de hidronefrosis I a IV", grupo: "Grupo B · Nov 2026", fecha: "11 sep", duracion: "1:24:10", asistieron: 26, total: 28, ligada: true },
    { id: "g2", tipo: "mico", tema: "Barrido hepático con el equipo", grupo: "Grupo A · Sep 2026", fecha: "9 sep", duracion: "58:32", asistieron: 21, total: 24, ligada: true },
    { id: "g3", tipo: "zoom", tema: "Vía biliar: signos que no se pierden", grupo: "Grupo B · Nov 2026", fecha: "4 sep", duracion: "1:12:45", asistieron: 24, total: 28, ligada: true },
    { id: "g4", tipo: "zoom", tema: "Introducción al Doppler color", grupo: "Grupo A · Sep 2026", fecha: "2 sep", duracion: "1:31:02", asistieron: 19, total: 24, ligada: false },
  ],
  resumenMes: [
    { titulo: "Clases dadas", valor: "7", detalle: "de 9 programadas" },
    { titulo: "Horas en vivo", valor: "9.5 h", detalle: "4 en MiCo+" },
    { titulo: "Asistencia media", valor: "88%", detalle: "sube 4 pts vs agosto" },
    { titulo: "Grabaciones ligadas", valor: "17 de 18", detalle: "1 pendiente" },
  ],
  eco: {
    respuesta: {
      pregunta: "¿Qué temas cubrí este mes con el Grupo B?",
      intro: "Tres sesiones, todas del módulo 4:",
      temas: [
        { fecha: "11 sep", tema: "Gradación I a IV", asistencia: "26/28" },
        { fecha: "4 sep", tema: "Vía biliar", asistencia: "24/28" },
        { fecha: "28 ago", tema: "Anatomía renal", asistencia: "27/28" },
      ],
      remate: "No ha tocado Doppler renal con este grupo, y la lección 5 ya está abierta.",
      acciones: [{ etiqueta: "Programar esa clase", primaria: true }, { etiqueta: "Copiar el resumen" }],
    },
    sugerencias: [
      "Prepárame un resumen de la última clase",
      "¿Quién ha faltado más?",
      "Sugiéreme el tema del jueves",
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const card = "rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";

const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

/** Zoom en azul, MiCo+ en teal con sonda: se distinguen sin leer. */
function ChipTipo({ tipo, chico = false }: { tipo: TipoSesion; chico?: boolean }) {
  const base = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold ${
    chico ? "h-[21px] px-2 text-[10px]" : "h-6 px-2.5 text-[11px]"
  }`;
  if (tipo === "zoom") {
    return (
      <span className={`${base} border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]`}>
        <Video aria-hidden className={chico ? "h-[11px] w-[11px]" : "h-3 w-3"} strokeWidth={1.75} />
        Zoom
      </span>
    );
  }
  return (
    <span className={`${base} border-[#a7e0dd] bg-accent text-accent-foreground`}>
      <SondaIcon className={chico ? "h-[11px] w-[11px]" : "h-3 w-3"} />
      MiCo+{chico ? "" : " en vivo"}
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Clases({ data = MOCK }: { data?: ClasesData }) {
  const { clases, grabaciones, gruposFiltro, resumenMes, eco, totalGrabaciones } = data;
  const [filtroGrupo, setFiltroGrupo] = useState(gruposFiltro[0]);
  const [programando, setProgramando] = useState(false);
  const [tipoNueva, setTipoNueva] = useState<TipoSesion>("zoom");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onIniciarClase = (_id: string) => {};
  const onAbrirMiCo = (_id: string) => {};
  const onProgramarClase = () => setProgramando(false);
  const onVerGrabacion = (_id: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onVerAsistencia = (_id: string) => {};
  const onLigarLeccion = (_id: string) => {};
  const onEditarClase = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const hoy = clases.find((c) => c.hoy);
  const proximas = clases.filter((c) => !c.hoy);
  const visibles = useMemo(
    () =>
      filtroGrupo === gruposFiltro[0]
        ? grabaciones
        : grabaciones.filter((g) => g.grupo.includes(filtroGrupo.replace("POCUS", "POCUS"))),
    [grabaciones, filtroGrupo, gruposFiltro],
  );

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      {/* cabecera */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Clases</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            Sus sesiones en vivo. El video corre en Zoom o en el equipo Mindray; aquí las programa,
            las inicia y recupera la grabación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProgramando(true)}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Programar clase
        </button>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* ══════ La clase de hoy: única urgencia de la pantalla ══════ */}
          {hoy && (
            <section className="overflow-hidden rounded-2xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]">
              <div className="flex flex-wrap items-start gap-5 px-6 py-5">
                <div className="min-w-[280px] flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                      <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
                      Hoy
                    </span>
                    <ChipTipo tipo={hoy.tipo} />
                    <span className={`${mono} text-[11.5px] text-[color:var(--warning-foreground)]`}>
                      {hoy.duracion}
                    </span>
                  </div>

                  <p
                    className="mt-3.5 text-[21px] font-extrabold leading-tight tracking-[-0.02em]"
                    style={{ textWrap: "pretty" }}
                  >
                    {hoy.tema}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[color:var(--warning-foreground)]">
                    {hoy.grupo} · {hoy.alumnos} alumnos
                    {hoy.leccion && (
                      <>
                        {" "}
                        · ligada a <span className={`${mono} font-bold`}>{hoy.leccion}</span>
                      </>
                    )}
                  </p>

                  <div className="mt-4 flex items-baseline gap-2.5">
                    <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.02em]`}>
                      {hoy.hora}
                    </span>
                    <span className="text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
                      empieza en {hoy.empiezaEn}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => (hoy.tipo === "zoom" ? onIniciarClase(hoy.id) : onAbrirMiCo(hoy.id))}
                      className={`inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      {hoy.tipo === "zoom" ? (
                        <Video aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                      ) : (
                        <SondaIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                      )}
                      {hoy.tipo === "zoom" ? "Iniciar clase" : "Abrir sesión"}
                    </button>
                    {hoy.materialAdjunto ? (
                      <button
                        type="button"
                        className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[13px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
                      >
                        <BookCopy aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        Material adjunto · {hoy.materialAdjunto}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEditarClase(hoy.id)}
                      className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[13px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
                    >
                      <Pencil aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      Editar
                    </button>
                  </div>

                  {/* lo que pasa fuera de la plataforma, dicho en voz activa */}
                  <p className="mt-3.5 text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                    {hoy.tipo === "zoom"
                      ? "La clase corre en Zoom; la grabación cae en la lección del grupo al terminar, sin que usted la suba."
                      : "La sesión se transmite desde el equipo Mindray; la grabación queda ahí y se sube cuando el técnico la libera."}
                  </p>
                </div>

                <div
                  aria-hidden
                  className="relative grid w-[300px] shrink-0 place-items-center overflow-hidden rounded-xl"
                  style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
                >
                  <span className="absolute inset-0" style={{ background: rayas }} />
                  <span className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-white/[0.14] text-white">
                    {hoy.tipo === "zoom" ? (
                      <Video className="h-6 w-6" strokeWidth={1.75} />
                    ) : (
                      <SondaIcon className="h-6 w-6" />
                    )}
                  </span>
                  <span
                    className={`${mono} absolute bottom-2.5 left-2.5 text-[9.5px] uppercase tracking-[0.14em]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    {hoy.tipo === "zoom" ? "sala de Zoom · lista" : "equipo Mindray · enlazado"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ══════ Próximas ══════ */}
          <section className={`${card} mt-5 overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-3 px-[18px] py-3.5">
              <h2 className={`${kicker} text-muted-foreground`}>Próximas clases</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {proximas.length} programadas
              </span>
              <button
                type="button"
                className={`ml-auto inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Calendar aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Ver en calendario
              </button>
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted px-[18px] py-2.5">
              {(
                [
                  ["Cuándo", "shrink-0 w-[92px]"],
                  ["Tipo", "shrink-0 w-[132px]"],
                  ["Tema y grupo", "min-w-0 flex-[1.4]"],
                  ["Alumnos", "shrink-0 w-[96px]"],
                  ["Dura", "shrink-0 w-[66px]"],
                  ["", "shrink-0 w-[150px]"],
                ] as const
              ).map(([t, cls]) => (
                <span
                  key={t || "acc"}
                  className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
                >
                  {t}
                </span>
              ))}
            </div>

            {proximas.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted"
              >
                <span className="w-[92px] shrink-0">
                  <span className="block text-[12px] font-bold">{c.dia}</span>
                  <span className={`${mono} mt-0.5 block text-[13px] font-bold text-muted-foreground`}>
                    {c.hora}
                  </span>
                </span>
                <span className="w-[132px] shrink-0">
                  <ChipTipo tipo={c.tipo} chico />
                </span>
                <span className="min-w-0 flex-[1.4]">
                  <span className="block truncate text-[13.5px] font-bold leading-snug">{c.tema}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {c.grupo} · {c.leccion ? `ligada a ${c.leccion}` : "sin lección ligada"}
                  </span>
                </span>
                <span className={`inline-flex w-[96px] shrink-0 items-center gap-1.5 text-[12px] font-semibold ${softText}`}>
                  <Users aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span className={`${mono} font-bold text-foreground`}>{c.alumnos}</span>
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-[11.5px] text-muted-foreground`}>
                  {c.duracion}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => (c.tipo === "zoom" ? onEditarClase(c.id) : onAbrirMiCo(c.id))}
                    className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    {c.tipo === "zoom" ? "Ver detalles" : "Abrir sesión"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Más acciones de ${c.tema}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                  </button>
                </span>
              </div>
            ))}
          </section>

          {/* ══════ Grabaciones ══════ */}
          <section className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={`${kicker} text-muted-foreground`}>Clases pasadas y grabaciones</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {totalGrabaciones} sesiones este ciclo
              </span>
              <div className="ml-auto flex gap-1 rounded-full border border-border bg-card p-[3px]">
                {gruposFiltro.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFiltroGrupo(g)}
                    aria-pressed={filtroGrupo === g}
                    className={`h-[30px] whitespace-nowrap rounded-full px-3 text-[11.5px] font-semibold transition-colors ${focusRing} ${
                      filtroGrupo === g
                        ? "bg-sidebar text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3 grid gap-3.5 lg:grid-cols-2">
              {visibles.map((g) => (
                <li key={g.id}>
                  <article className={`${card} flex gap-4 rounded-xl p-3.5 transition-colors hover:border-primary`}>
                    <button
                      type="button"
                      onClick={() => onVerGrabacion(g.id)}
                      aria-label={`Ver la grabación de ${g.tema}`}
                      className={`relative grid w-[188px] shrink-0 place-items-center overflow-hidden rounded-[10px] p-0 ${focusRing}`}
                      style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
                    >
                      {g.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.poster} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                      )}
                      <span
                        aria-hidden
                        className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                      >
                        <Play className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span
                        className={`${mono} absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white`}
                        style={{ background: "rgba(15,45,82,.82)" }}
                      >
                        {g.duracion}
                      </span>
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChipTipo tipo={g.tipo} chico />
                        <span className={`${mono} text-[11px] text-muted-foreground`}>{g.fecha}</span>
                      </div>
                      <p className="mt-2 text-[14px] font-bold leading-snug" style={{ textWrap: "pretty" }}>
                        {g.tema}
                      </p>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">{g.grupo}</p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold ${softText}`}
                        >
                          <Users aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                          <span className={`${mono} font-bold text-foreground`}>
                            {g.asistieron}/{g.total}
                          </span>
                          asistieron
                        </span>
                        {g.ligada ? (
                          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                            <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
                            En la videoteca del grupo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onLigarLeccion(g.id)}
                            className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                          >
                            <BookCopy aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                            Ligarla a una lección
                          </button>
                        )}
                      </div>

                      <div className="mt-auto flex items-center gap-1.5 pt-3">
                        <button
                          type="button"
                          onClick={() => onVerGrabacion(g.id)}
                          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-accent px-3.5 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                        >
                          <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Ver grabación
                        </button>
                        <button
                          type="button"
                          onClick={() => onVerAsistencia(g.id)}
                          className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                        >
                          Lista de asistencia
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Las grabaciones llegan solas de Zoom, unos 20 minutos después de terminar, y se ligan a
              la lección de la clase. Las sesiones de MiCo+ se graban en el equipo y se suben cuando el
              técnico las libera.
            </p>
          </section>
        </div>

        {/* ══════ Rail: Eco ligero + su mes ══════ */}
        <div className="min-w-0">
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
              <EcoMark size={32} invertido />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                  Sobre sus clases
                </p>
              </div>
            </div>

            <div className="px-4 py-3.5">
              <div className="flex justify-end">
                <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                  {eco.respuesta.pregunta}
                </p>
              </div>

              <div className="mt-3 flex gap-2.5">
                <EcoMark size={26} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[12.5px] leading-relaxed ${softText}`}>{eco.respuesta.intro}</p>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {eco.respuesta.temas.map((t) => (
                      <li
                        key={t.fecha}
                        className="flex items-center gap-2.5 rounded-[9px] border border-border px-2.5 py-2"
                      >
                        <span className={`${mono} shrink-0 text-[10.5px] font-bold text-muted-foreground`}>
                          {t.fecha}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                          {t.tema}
                        </span>
                        <span className={`${mono} shrink-0 text-[10.5px] font-bold text-secondary`}>
                          {t.asistencia}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.respuesta.remate}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {eco.respuesta.acciones.map((a) => (
                      <button
                        key={a.etiqueta}
                        type="button"
                        onClick={() => (a.primaria ? setProgramando(true) : onPreguntarEco(a.etiqueta))}
                        className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[12px] font-semibold transition-colors ${focusRing} ${
                          a.primaria
                            ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                            : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {a.primaria && <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />}
                        {a.etiqueta}
                      </button>
                    ))}
                  </div>
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
                <span className="sr-only">Pregúntele a Eco sobre sus clases</span>
                <input
                  type="text"
                  placeholder="Pregúntele a Eco sobre sus clases…"
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

          <section className={`${card} mt-4 p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Su septiembre</p>
            <ul className="mt-3.5 flex flex-col gap-3">
              {resumenMes.map((r) => (
                <li key={r.titulo} className="flex items-baseline gap-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold">{r.titulo}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.detalle}</span>
                  </span>
                  <span className={`${mono} shrink-0 text-[17px] font-extrabold tracking-[-0.02em]`}>
                    {r.valor}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* ══════ Programar clase ══════ */}
      {programando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Programar clase"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center gap-3 px-6 pb-1 pt-5">
              <div className="min-w-0 flex-1">
                <p className={`${kicker} text-secondary`}>Programar clase</p>
                <p className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.02em]">
                  Una sesión en vivo con su grupo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgramando(false)}
                aria-label="Cerrar"
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
              >
                <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 pt-4">
              <span className="block text-[11.5px] font-semibold">Tipo de sesión</span>
              <div className="mt-2 flex gap-2.5">
                {(
                  [
                    ["zoom", "Clase en Zoom", "Usted expone; la grabación cae sola en la lección."],
                    ["mico", "Ultrasonido en vivo · MiCo+", "Transmite desde el equipo Mindray. Se graba en el equipo."],
                  ] as const
                ).map(([id, titulo, sub]) => {
                  const on = tipoNueva === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTipoNueva(id)}
                      aria-pressed={on}
                      className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${focusRing} ${
                        on ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${
                          on ? "bg-primary text-[color:var(--sidebar)]" : `bg-muted ${softText}`
                        }`}
                      >
                        {id === "zoom" ? <Video className="h-4 w-4" strokeWidth={1.75} /> : <SondaIcon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug">{titulo}</span>
                        <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {(
                  [
                    ["Grupo", "Grupo B · Nov 2026 · 28 alumnos"],
                    ["Lección ligada (opcional)", "M04 · L5 · Doppler renal aplicado"],
                  ] as const
                ).map(([label, valor]) => (
                  <label key={label} className="min-w-[220px] flex-1">
                    <span className="block text-[11.5px] font-semibold">{label}</span>
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5">
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{valor}</span>
                      <ChevronDown aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="block text-[11.5px] font-semibold">Tema de la clase</span>
                <input
                  type="text"
                  defaultValue="Doppler renal: cuándo sí aporta"
                  className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors focus:border-secondary"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                {(
                  [
                    ["Fecha", "jue 25 de septiembre, 2026", "min-w-[220px] flex-[1.7]"],
                    ["Hora", "19:00", "min-w-[110px] flex-1"],
                    ["Duración", "90 min", "min-w-[110px] flex-1"],
                  ] as const
                ).map(([label, valor, ancho]) => (
                  <label key={label} className={ancho}>
                    <span className="block text-[11.5px] font-semibold">{label}</span>
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5">
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{valor}</span>
                      <ChevronDown aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-border bg-muted px-3.5 py-3">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2.4} />
                <p className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
                  {tipoNueva === "zoom"
                    ? "Se avisa a los alumnos y aparece en su calendario del campus. La liga de Zoom se genera al guardar."
                    : "Se avisa a los alumnos y se reserva el equipo. El enlace de MiCo+ se genera al guardar."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
                no choca con otra clase suya
              </span>
              <button
                type="button"
                onClick={() => setProgramando(false)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onProgramarClase}
                className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                Programar la clase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

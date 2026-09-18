"use client";

/**
 * Studio · Grupos (docente) — seguimiento de sus alumnos
 *
 * El docente entra a responder "¿cómo va mi grupo? ¿quién necesita ayuda?". Es seguimiento en el
 * TIEMPO, distinto del home (pendientes de hoy).
 *
 * Límites de rol, visibles en la pantalla:
 *   · No configura el grupo (fechas, contenido, overrides son del diseñador instruccional).
 *   · El avance de aprendizaje —casos, competencia, entregas, actividad— es del campus.
 *   · Lo administrativo formal (inscripción, calificaciones oficiales) vive en CORA: se consulta
 *     con deep-link, nunca se edita aquí.
 *
 * Un solo color de atención: ÁMBAR para riesgo/intervención. El VIOLETA es Eco.
 *
 * Stubs: onAbrirGrupo · onAbrirAlumno · onEnviarConsulta · onVerBitacora · onPreguntarEco · onFiltrar
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Lock,
  MessageCircle,
  MoreHorizontal,
  NotebookText,
  ScanLine,
  Search,
  Send,
  TriangleAlert,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";
import { Avatar } from "@/components/Avatar";


/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoGrupo = "al-dia" | "con-rezago" | "requiere-atencion";

export type GrupoDocente = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: "En línea" | "Mixta" | "Presencial";
  alumnos: number;
  avance: number;
  enRiesgo: number;
  estado: EstadoGrupo;
  moduloEnCurso: string;
  inicio: string;
  /** por qué requieren intervención, en palabras */
  resumenRiesgo: string;
};

export type SenalRiesgo = "sin-actividad" | "reprobando" | "casos-rechazados";

export type AlumnoSeguimiento = {
  id: string;
  ini: string;
  nombre: string;
  moduloEnCurso: string;
  avance: number;
  casosSubidos: number;
  casosValidados: number;
  entregas: string;
  competencia: number;
  ultimaActividad: string;
  sinActividad?: boolean;
  /** null = sin señal: va al día */
  senal: { tipo: SenalRiesgo; motivo: string } | null;
};

export type ResumenGrupo = { etiqueta: string; valor: string; nota: string; atencion?: boolean };

export type MensajeEco = {
  id: string;
  de: "docente" | "eco";
  texto: string;
  alumnos?: { ini: string; nombre: string; motivo: string }[];
  destacado?: string;
  involucrados?: string[];
  acciones?: { etiqueta: string; primaria?: boolean; icono?: "consulta" | "bitacora" | "clase" }[];
};

export type GruposData = {
  grupos: GrupoDocente[];
  /** grupo abierto en el detalle */
  detalle: {
    grupoId: string;
    resumen: ResumenGrupo[];
    alumnos: AlumnoSeguimiento[];
    conteos: { todos: number; atencion: number; sinActividad: number; alDia: number };
  };
  eco: { resumenGlobal: string; conversacion: MensajeEco[]; sugerencias: string[] };
};

const MOCK: GruposData = {
  grupos: [
    {
      id: "gb",
      nombre: "Grupo B · Nov 2026",
      programa: "Ultrasonografía Médica",
      modalidad: "En línea",
      alumnos: 28,
      avance: 48,
      enRiesgo: 4,
      estado: "requiere-atencion",
      moduloEnCurso: "M04 · Interpretación renal",
      inicio: "inició el 3 nov",
      resumenRiesgo: "2 sin actividad, 1 reprobando, 1 con casos rechazados",
    },
    {
      id: "ga",
      nombre: "Grupo A · Sep 2026",
      programa: "Ultrasonografía Médica",
      modalidad: "Mixta",
      alumnos: 24,
      avance: 72,
      enRiesgo: 0,
      estado: "al-dia",
      moduloEnCurso: "M07 · Obstétrico II",
      inicio: "inició el 8 sep",
      resumenRiesgo: "El grupo más atrasado va 2 lecciones detrás.",
    },
    {
      id: "gp",
      nombre: "Grupo POCUS · Oct 2026",
      programa: "POCUS en Urgencias",
      modalidad: "Presencial",
      alumnos: 16,
      avance: 34,
      enRiesgo: 2,
      estado: "con-rezago",
      moduloEnCurso: "M02 · Ventanas y artefactos",
      inicio: "inició el 20 oct",
      resumenRiesgo: "2 sin actividad en más de una semana",
    },
  ],
  detalle: {
    grupoId: "gb",
    conteos: { todos: 28, atencion: 4, sinActividad: 2, alDia: 24 },
    resumen: [
      { etiqueta: "Avance del grupo", valor: "48%", nota: "la mediana va en M04 · L2" },
      { etiqueta: "Requieren intervención", valor: "4", nota: "de 28 alumnos", atencion: true },
      { etiqueta: "Casos validados", valor: "38", nota: "11 en cola de validación" },
      { etiqueta: "Actividad esta semana", valor: "21", nota: "de 28 entraron al campus" },
    ],
    alumnos: [
      { id: "a1", ini: "HC", nombre: "Dr. Hugo Cuevas", moduloEnCurso: "M04 · L3", avance: 34, casosSubidos: 3, casosValidados: 1, entregas: "4 / 6", competencia: 58, ultimaActividad: "sin actividad hace 9 días", sinActividad: true, senal: { tipo: "sin-actividad", motivo: "Sin actividad · 2 casos rechazados" } },
      { id: "a2", ini: "PN", nombre: "Dra. P. Navarro", moduloEnCurso: "M03 · L5", avance: 28, casosSubidos: 2, casosValidados: 2, entregas: "3 / 6", competencia: 52, ultimaActividad: "sin actividad hace 12 días", sinActividad: true, senal: { tipo: "sin-actividad", motivo: "Sin actividad · va 2 módulos atrás" } },
      { id: "a3", ini: "JG", nombre: "Dr. Jorge Guzmán", moduloEnCurso: "M04 · L2", avance: 41, casosSubidos: 4, casosValidados: 3, entregas: "5 / 6", competencia: 61, ultimaActividad: "activo ayer", senal: { tipo: "reprobando", motivo: "Reprobó la autoevaluación 2 veces" } },
      { id: "a4", ini: "MP", nombre: "Dr. Mario Prado", moduloEnCurso: "M04 · L1", avance: 38, casosSubidos: 2, casosValidados: 0, entregas: "4 / 6", competencia: 55, ultimaActividad: "activo hace 3 días", senal: { tipo: "casos-rechazados", motivo: "2 casos rechazados seguidos" } },
      { id: "a5", ini: "IT", nombre: "Dr. Iván Torres", moduloEnCurso: "M04 · L3", avance: 52, casosSubidos: 6, casosValidados: 5, entregas: "6 / 6", competencia: 74, ultimaActividad: "activo hoy", senal: null },
      { id: "a6", ini: "KM", nombre: "Dra. Karla Méndez", moduloEnCurso: "M04 · L4", avance: 58, casosSubidos: 7, casosValidados: 7, entregas: "6 / 6", competencia: 81, ultimaActividad: "activo hoy", senal: null },
      { id: "a7", ini: "RS", nombre: "Dra. Renata Salas", moduloEnCurso: "M04 · L2", avance: 46, casosSubidos: 5, casosValidados: 4, entregas: "6 / 6", competencia: 69, ultimaActividad: "activo hoy", senal: null },
      { id: "a8", ini: "LA", nombre: "Dr. Luis Arreola", moduloEnCurso: "M04 · L1", avance: 44, casosSubidos: 4, casosValidados: 4, entregas: "5 / 6", competencia: 66, ultimaActividad: "activo hace 2 días", senal: null },
      { id: "a9", ini: "FS", nombre: "Dra. F. Solís", moduloEnCurso: "M03 · L6", avance: 40, casosSubidos: 4, casosValidados: 3, entregas: "5 / 6", competencia: 63, ultimaActividad: "activo hace 4 días", senal: null },
    ],
  },
  eco: {
    resumenGlobal:
      "el Grupo B es el que más necesita su atención —cuatro alumnos y todos atorados en el mismo tema, la medición de cortical.",
    sugerencias: ["Resúmeme el avance", "¿A quién contacto esta semana?", "Compáralo con el Grupo A"],
    conversacion: [
      { id: "e1", de: "docente", texto: "¿Quién está batallando en este grupo?" },
      {
        id: "e2",
        de: "eco",
        texto: "Cuatro, y no por la misma razón:",
        alumnos: [
          { ini: "HC", nombre: "Dr. Hugo Cuevas", motivo: "No entra desde hace 9 días y arrastra 2 casos rechazados" },
          { ini: "PN", nombre: "Dra. P. Navarro", motivo: "12 días sin actividad; va 2 módulos atrás del grupo" },
          { ini: "JG", nombre: "Dr. Jorge Guzmán", motivo: "Entra a diario pero reprobó la autoevaluación dos veces" },
          { ini: "MP", nombre: "Dr. Mario Prado", motivo: "Sube casos, se los rechazan: no ajusta la técnica" },
        ],
        destacado:
          "A Guzmán y Prado los alcanza con una consulta; a los dos que no entran, conviene llamarles.",
        acciones: [
          { etiqueta: "Mandarles consulta", primaria: true, icono: "consulta" },
          { etiqueta: "Ver sus bitácoras", icono: "bitacora" },
        ],
      },
      { id: "e3", de: "docente", texto: "¿Qué tema se les está dificultando?" },
      {
        id: "e4",
        de: "eco",
        texto: "Uno solo, y es el mismo en todas las señales: medición de cortical.",
        destacado:
          "Es la pregunta 4 de la autoevaluación (la falló el 62% del grupo), el motivo de 3 de los 5 casos rechazados y el tema de 5 consultas esta semana.",
        involucrados: ["HC", "JG", "MP", "PN", "+4"],
        acciones: [{ etiqueta: "Llevarlo a la clase del jueves", icono: "clase" }],
      },
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<EstadoGrupo, { texto: string; atencion: boolean }> = {
  "al-dia": { texto: "Al día", atencion: false },
  "con-rezago": { texto: "Con rezago", atencion: true },
  "requiere-atencion": { texto: "Requiere atención", atencion: true },
};


/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Grupos({ data = MOCK }: { data?: GruposData }) {
  const { grupos, detalle, eco } = data;
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [filtroGrupos, setFiltroGrupos] = useState<"todos" | "riesgo" | "al-dia">("todos");
  const [filtroAlumnos, setFiltroAlumnos] = useState<"atencion" | "todos" | "sin-actividad" | "al-dia">(
    "atencion",
  );
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirGrupo = (_id: string) => setVista("detalle");
  const onAbrirAlumno = (_id: string) => {};
  const onEnviarConsulta = (_ids: string[]) => {};
  const onVerBitacora = (_id: string) => {};
  const onVerCasos = (_id: string) => {};
  const onPreguntarEco = (_q: string) => setEcoAbierto(true);
  const onFiltrar = (_f: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const grupoAbierto = grupos.find((g) => g.id === detalle.grupoId) ?? grupos[0];
  const totalAlumnos = grupos.reduce((s, g) => s + g.alumnos, 0);
  const totalRiesgo = grupos.reduce((s, g) => s + g.enRiesgo, 0);

  const gruposVisibles = useMemo(
    () =>
      grupos.filter((g) =>
        filtroGrupos === "riesgo" ? g.enRiesgo > 0 : filtroGrupos === "al-dia" ? g.enRiesgo === 0 : true,
      ),
    [grupos, filtroGrupos],
  );

  const alumnosVisibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return detalle.alumnos
      .filter((a) => {
        if (filtroAlumnos === "atencion") return !!a.senal;
        if (filtroAlumnos === "sin-actividad") return !!a.sinActividad;
        if (filtroAlumnos === "al-dia") return !a.senal;
        return true;
      })
      .filter((a) => !q || a.nombre.toLowerCase().includes(q));
  }, [detalle.alumnos, filtroAlumnos, busca]);

  /* ─────────── Eco: panel o riel ─────────── */
  const EcoPanel = ecoAbierto ? (
    <aside
      aria-label="Eco"
      className="flex max-h-full w-[352px] shrink-0 flex-col self-start overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
        <EcoMark size={34} invertido />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight">Eco</p>
          <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
            Analiza · usted acompaña
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEcoAbierto(false)}
          aria-label="Cerrar Eco"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
        >
          <X aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
        {eco.conversacion.map((m) =>
          m.de === "docente" ? (
            <div key={m.id} className="flex shrink-0 justify-end">
              <p className="max-w-[86%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {m.texto}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex shrink-0 gap-2.5">
              <EcoMark size={26} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{m.texto}</p>

                {m.alumnos && (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {m.alumnos.map((a) => (
                      <li
                        key={a.ini}
                        className="flex gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5"
                      >
                        <Avatar ini={a.ini} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">{a.nombre}</span>
                          <span className={`mt-0.5 block text-[11px] leading-snug ${softText}`}>
                            {a.motivo}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {m.destacado &&
                  (m.involucrados ? (
                    <div className="mt-2.5 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2.5">
                      <p className="text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                        {m.destacado}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {m.destacado}
                    </p>
                  ))}

                {m.involucrados && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="flex pl-1.5" aria-hidden>
                      {m.involucrados.map((i) => (
                        <span
                          key={i}
                          className={`${mono} -ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground`}
                        >
                          {i}
                        </span>
                      ))}
                    </span>
                    <span className="text-[11px] text-muted-foreground">8 alumnos involucrados</span>
                  </div>
                )}

                {m.acciones && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.acciones.map((a) => (
                      <button
                        key={a.etiqueta}
                        type="button"
                        onClick={() => onEnviarConsulta([])}
                        className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                          a.primaria
                            ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                            : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {a.icono === "consulta" && (
                          <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {a.icono === "clase" && (
                          <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
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

      <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
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
          className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
          onSubmit={(e) => e.preventDefault()}
        >
          <span className="sr-only">Preguntarle a Eco sobre este grupo</span>
          <input
            type="text"
            placeholder="Pregúntele a Eco sobre este grupo…"
            className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
          >
            <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  ) : (
    <aside
      aria-label="Eco"
      className="flex w-14 shrink-0 flex-col items-center gap-3 self-start rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
    >
      <button
        type="button"
        onClick={() => setEcoAbierto(true)}
        aria-label="Abrir Eco"
        className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
      >
        <EcoMark size={19} invertido />
      </button>
      <span
        aria-hidden
        className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--info-foreground)]"
        style={{ writingMode: "vertical-rl" }}
      >
        Eco
      </span>
    </aside>
  );

  /* ═══════════════════ Lista de sus grupos ═══════════════════ */
  if (vista === "lista") {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-6 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mis grupos</h1>
            <span className={`${mono} text-[12px] text-muted-foreground`}>
              {grupos.length} grupos · {totalAlumnos} alumnos · {totalRiesgo} requieren intervención
            </span>
            <div className="ml-auto flex gap-1 rounded-full border border-border bg-card p-[3px]">
              {(
                [
                  ["todos", "Todos"],
                  ["riesgo", "Con alumnos en riesgo"],
                  ["al-dia", "Al día"],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFiltroGrupos(id);
                    onFiltrar(id);
                  }}
                  aria-pressed={filtroGrupos === id}
                  className={`h-[34px] whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                    filtroGrupos === id
                      ? "bg-sidebar text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Eco cruza los tres grupos antes de que el docente entre */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-[18px] py-3.5">
            <EcoMark size={30} invertido />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              <span className="font-bold">Eco revisó sus tres grupos:</span> {eco.resumenGlobal}
            </p>
            <button
              type="button"
              onClick={() => onAbrirGrupo(grupoAbierto.id)}
              className={`h-[38px] shrink-0 whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-sidebar ${focusRing}`}
            >
              Ver el {grupoAbierto.nombre.split(" · ")[0]}
            </button>
          </div>

          <ul className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {gruposVisibles.map((g) => {
              const est = ESTADO[g.estado];
              return (
                <li key={g.id}>
                  <article
                    className={`flex h-full flex-col rounded-[14px] border bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
                      est.atencion ? "border-[color:var(--warning-border)]" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`${mono} grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-sidebar text-[12px] font-bold text-sidebar-foreground`}
                      >
                        {g.nombre.split(" ")[1]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-bold leading-tight">{g.nombre}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {g.programa} · {g.modalidad}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                          est.atencion
                            ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {est.atencion ? (
                          <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                        ) : (
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                        )}
                        {est.texto}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>
                          {g.alumnos}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground">alumnos</span>
                      </span>
                      <span aria-hidden className="h-[26px] w-px bg-border" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className={`${mono} text-[24px] font-extrabold tracking-[-0.02em]`}>
                            {g.avance}%
                          </span>
                          <span className="text-[11.5px] text-muted-foreground">avance del grupo</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${g.avance}%` }}
                          />
                        </span>
                      </span>
                    </div>

                    {/* a quién atender: el silencio también se declara */}
                    <div
                      className={`mt-4 flex-1 rounded-[11px] px-3.5 py-3 ${
                        g.enRiesgo
                          ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {g.enRiesgo ? (
                          <TriangleAlert
                            aria-hidden
                            className="h-[15px] w-[15px] shrink-0 text-[color:var(--warning-foreground)]"
                            strokeWidth={2}
                          />
                        ) : (
                          <Check
                            aria-hidden
                            className="h-[15px] w-[15px] shrink-0 text-secondary"
                            strokeWidth={2.4}
                          />
                        )}
                        <p
                          className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${
                            g.enRiesgo ? "text-[color:var(--warning-foreground)]" : softText
                          }`}
                        >
                          {g.enRiesgo ? (
                            <>
                              <span className="font-bold">
                                {g.enRiesgo} alumnos necesitan intervención
                              </span>
                              <br />
                              {g.resumenRiesgo}
                            </>
                          ) : (
                            <>Nadie requiere intervención. {g.resumenRiesgo}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2.5">
                      <span className={`${mono} min-w-0 flex-1 text-[11px] text-muted-foreground`}>
                        {g.inicio} · cursando {g.moduloEnCurso.split(" · ")[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAbrirGrupo(g.id)}
                        className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-[13.5px] font-bold transition-colors ${focusRing} ${
                          g.enRiesgo
                            ? "bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                            : "bg-accent text-accent-foreground hover:bg-[color:var(--track)]"
                        }`}
                      >
                        Ver el grupo
                        <ChevronRight aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>

        {EcoPanel}
      </div>
    );
  }

  /* ═══════════════════ Detalle del grupo ═══════════════════ */
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-6 pt-5">
      <div className="min-w-0 flex-1">
        {/* cabecera + límite de rol declarado */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a mis grupos"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">
              {grupoAbierto.nombre}
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {grupoAbierto.programa} · {grupoAbierto.modalidad} · {grupoAbierto.alumnos} alumnos ·
              cursando {grupoAbierto.moduloEnCurso}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-2.5">
            <span
              className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Inscripción y calificaciones oficiales: CORA
            </span>
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Consultarlo en CORA
              <ExternalLink aria-hidden className="h-3 w-3" strokeWidth={1.75} />
            </button>
          </span>
        </div>

        {/* cuatro cifras de seguimiento */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {detalle.resumen.map((r) => (
            <div
              key={r.etiqueta}
              className={`rounded-xl border bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
                r.atencion ? "border-[color:var(--warning-border)]" : "border-border"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  r.atencion ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                }`}
              >
                {r.etiqueta}
              </p>
              <p
                className={`${mono} mt-2 text-[26px] font-extrabold leading-none tracking-[-0.02em] ${
                  r.atencion ? "text-[color:var(--warning-foreground)]" : ""
                }`}
              >
                {r.valor}
              </p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{r.nota}</p>
            </div>
          ))}
        </div>

        {/* filtros de alumnos: el trabajo real arranca en "requieren atención" */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Alumnos</h2>
          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ["atencion", "Requieren atención", detalle.conteos.atencion],
                ["todos", "Todos", detalle.conteos.todos],
                ["sin-actividad", "Sin actividad", detalle.conteos.sinActividad],
                ["al-dia", "Al día", detalle.conteos.alDia],
              ] as const
            ).map(([id, etiqueta, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFiltroAlumnos(id);
                  onFiltrar(id);
                }}
                aria-pressed={filtroAlumnos === id}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                  filtroAlumnos === id
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {etiqueta}
                <span
                  className={`${mono} font-bold ${
                    filtroAlumnos === id ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
          <label className="ml-auto flex h-9 w-[220px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold ${softText} ${focusRing}`}
          >
            Ordenar: riesgo primero
            <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        {/* acción en lote cuando el filtro es el de intervención */}
        {filtroAlumnos === "atencion" && detalle.conteos.atencion > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
            <TriangleAlert
              aria-hidden
              className="h-[17px] w-[17px] shrink-0 text-[color:var(--warning-foreground)]"
              strokeWidth={2}
            />
            <p className="min-w-[260px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              <span className="font-bold">
                {detalle.conteos.atencion} de {detalle.conteos.todos} necesitan que usted intervenga.
              </span>{" "}
              Dos no entran desde hace más de una semana, uno reprobó dos veces la autoevaluación y otro
              lleva dos casos rechazados seguidos.
            </p>
            <button
              type="button"
              onClick={() => onEnviarConsulta(alumnosVisibles.map((a) => a.id))}
              className={`h-10 shrink-0 whitespace-nowrap rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              Mandarles consulta a los {detalle.conteos.atencion}
            </button>
          </div>
        )}

        {/* tabla de seguimiento */}
        <section className={`${card} mt-3 overflow-hidden`}>
          <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
            {(
              [
                ["Alumno", "flex-[1.5]"],
                ["Avance del programa", "flex-[1.1] min-w-0"],
                ["Casos / validados", "shrink-0 w-[84px] text-center"],
                ["Entregas", "shrink-0 w-[74px] text-center"],
                ["I-AIM", "shrink-0 w-[62px] text-center"],
                ["Señal de intervención", "shrink-0 w-[238px]"],
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

          {alumnosVisibles.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
                a.senal ? "bg-[#fffdf7]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onAbrirAlumno(a.id)}
                className={`flex min-w-0 flex-[1.5] items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
                title="Ver su avance a detalle"
              >
                <Avatar ini={a.ini} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className={`${mono} text-[10.5px] text-muted-foreground`}>
                      {a.moduloEnCurso}
                    </span>
                    <span
                      className={`text-[10.5px] ${
                        a.sinActividad
                          ? "font-semibold text-[color:var(--warning-foreground)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {a.ultimaActividad}
                    </span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-[15px] w-[15px] shrink-0 text-[color:var(--track)]"
                  strokeWidth={2}
                />
              </button>

              <span className="flex min-w-0 flex-[1.1] items-center gap-2">
                <span className="h-1.5 min-w-[52px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className={`block h-full rounded-full ${
                      a.senal ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${a.avance}%` }}
                  />
                </span>
                <span className={`${mono} shrink-0 text-[12px] font-bold`}>{a.avance}%</span>
              </span>

              <span className={`${mono} w-[84px] shrink-0 text-center text-[12px] font-semibold`}>
                {a.casosSubidos} / {a.casosValidados}
              </span>
              <span className={`${mono} w-[74px] shrink-0 text-center text-[12px] font-semibold`}>
                {a.entregas}
              </span>
              <span className="w-[62px] shrink-0 text-center">
                <span
                  className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                    a.competencia >= 65
                      ? "bg-accent text-accent-foreground"
                      : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {a.competencia}
                </span>
              </span>

              {/* el motivo en palabras, no un puntaje */}
              <span className="w-[238px] shrink-0">
                {a.senal ? (
                  <span className="inline-flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[color:var(--warning-foreground)]">
                    <TriangleAlert aria-hidden className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {a.senal.motivo}
                  </span>
                ) : (
                  <span className={`${mono} text-[11px] text-muted-foreground`}>—</span>
                )}
              </span>

              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => onEnviarConsulta([a.id])}
                  aria-label={`Mandarle una consulta a ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerCasos(a.id)}
                  aria-label={`Ver los casos de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ScanLine aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerBitacora(a.id)}
                  aria-label={`Ver la bitácora de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <NotebookText aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Más acciones de ${a.nombre}`}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                >
                  <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </span>
            </div>
          ))}

          {filtroAlumnos !== "atencion" && (
            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-[18px] py-3">
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {alumnosVisibles.length} de {detalle.conteos.todos} alumnos
              </span>
              <button
                type="button"
                className={`ml-auto h-[34px] rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary ${focusRing}`}
              >
                Ver a los {detalle.conteos.todos}
              </button>
            </div>
          )}

          {alumnosVisibles.length === 0 && (
            <div className="border-t border-border px-6 py-10 text-center">
              <p className="text-[14px] font-bold">Nadie en esta lista</p>
              <p className={`mt-1.5 text-[12.5px] ${softText}`}>
                Con este filtro no queda ningún alumno. Pruebe con “Todos”.
              </p>
            </div>
          )}
        </section>
      </div>

      {EcoPanel}
    </div>
  );
}

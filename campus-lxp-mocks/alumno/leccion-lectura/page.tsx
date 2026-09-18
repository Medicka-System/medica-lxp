"use client";

/**
 * Lección · Campus Virtual — Médica Capacitación (LXP)
 * Destino de "Retomar": la sala de estudio. Cine-loop + lectura, en modo lectura del shell.
 *
 * Pedagogía visible, no decoración:
 *   · Objetivos antes de empezar (qué va a poder hacer al terminar).
 *   · Marcadores con tiempo sobre el loop: el video se estudia por hallazgos, no se ve en lineal.
 *   · Lectura editorial con medida de 66ch, perla clínica y figura con pie.
 *   · Punto de control de una pregunta al final; nada de exámenes disfrazados.
 *   · Notas propias ancladas al minuto que se está viendo.
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx) con el lateral colapsado. En modo lectura el
 * contenedor reescribe los tokens del sistema, y el shell se monta dentro de él, así que header y
 * rail adoptan el tono del tema en lugar de quedarse navy brillante — para eso el layout lee
 * data-tema-lectura / las variables heredadas en vez de colores fijos.
 * Stubs: onMarcarVista · onSiguiente · onAnterior · onSaltarA(seg) · onGuardarNota · onResponder
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Menu,
  Download,
  Lightbulb,
  Maximize2,
  NotebookPen,
  Pause,
  Play,
  Search,
  Volume2,
} from "lucide-react";
import { mono, kickerWide as kicker, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Marcador = { t: number; etiqueta: string };

export type TipoActividad =
  | "Lectura"
  | "Vídeo"
  | "Cine-loop"
  | "Tarea de práctica"
  | "Foro de discusión"
  | "Evaluación";

export type Actividad = {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  min: number;
  estado: "completada" | "actual" | "pendiente";
};

export type Tema = { clave: string; titulo: string; actividades: Actividad[] };

export type ModuloCurso = {
  clave: string;
  titulo: string;
  horas: number;
  estado: "completado" | "actual" | "pendiente";
  temas: Tema[];
};

export type LineaTranscripcion = { t: number; texto: string };

export type Nota = { id: string; t: number; texto: string };

export type LeccionData = {
  curso: { titulo: string; modulo: string };
  leccion: {
    id: string;
    indice: number;
    total: number;
    titulo: string;
    tipo: TipoActividad;
    duracion: string;
    lectura?: {
      minutos: number;
      figuras: number;
      autor: string;
      actualizado: string;
      leido: number;
      narracion?: { duracion: string; posicion: string; avance: number };
    };
    objetivos: string[];
    marcadores: Marcador[];
    perla: string;
    transcripcion: LineaTranscripcion[];
    cuerpo: { tipo: "parrafo" | "subtitulo" | "figura"; texto: string; pie?: string }[];
    control: { pregunta: string; opciones: string[]; correcta: number; explicacion: string };
  };
  modulos: ModuloCurso[];
  notas: Nota[];
};

const MOCK: LeccionData = {
  curso: { titulo: "Ultrasonografía Médica", modulo: "Módulo 4 · Interpretación renal" },
  leccion: {
    id: "l3",
    indice: 3,
    total: 6,
    titulo: "Hidronefrosis: gradación y trampas del modo B",
    tipo: "Vídeo",
    duracion: "18:40",
    lectura: {
      minutos: 10,
      figuras: 1,
      autor: "Dr. Alejandro Sandoval",
      actualizado: "4 de noviembre",
      leido: 35,
      narracion: { duracion: "9:40", posicion: "1:12", avance: 13 },
    },
    objetivos: [
      "Graduar hidronefrosis I–IV con criterios reproducibles.",
      "Distinguir dilatación real de quistes parapiélicos y vasos prominentes.",
      "Redactar el hallazgo con el lenguaje que espera el clínico que refiere.",
    ],
    marcadores: [
      { t: 42, etiqueta: "Ventana y ganancia de partida" },
      { t: 215, etiqueta: "Grado I: separación del seno" },
      { t: 408, etiqueta: "Grado II–III: cálices y adelgazamiento cortical" },
      { t: 672, etiqueta: "Trampa: quiste parapiélico" },
      { t: 905, etiqueta: "Trampa: vasos con Doppler" },
      { t: 1040, etiqueta: "Cómo se dicta el hallazgo" },
    ],
    perla:
      "Si la dilatación no comunica entre cálices, sospeche quiste parapiélico antes de reportar hidronefrosis: gire la sonda 90° y siga el trayecto.",
    transcripcion: [
      { t: 135, texto: "Fijamos la ventana: corte longitudinal, ganancia media y profundidad que deje la cortical completa en pantalla." },
      { t: 215, texto: "Aquí el líquido apenas separa el seno renal: eso es grado I, sin deformar cálices." },
      { t: 302, texto: "Si sube la ganancia, el seno se ve anecoico y aparece una dilatación que en realidad no existe." },
      { t: 408, texto: "Observe los cálices mayores redondeados y comunicantes; el parénquima ya se adelgaza: estamos entre grado II y III." },
      { t: 504, texto: "Mida la cortical antes de cerrar el grado. Menos de la mitad de lo esperado ya es grado IV." },
      { t: 672, texto: "Esta imagen parece dilatación, pero no comunica entre cálices: es un quiste parapiélico." },
      { t: 905, texto: "Con Doppler color, lo que parecía un cáliz dilatado se llena de señal: son vasos hiliares." },
      { t: 1040, texto: "Al dictar el hallazgo: grado, lado, causa visible y espesor cortical. En ese orden." },
    ],
    cuerpo: [
      {
        tipo: "parrafo",
        texto:
          "La hidronefrosis se gradúa por lo que ve, no por lo que mide. Antes de estimar un grado, fije la ventana: corte longitudinal del riñón, ganancia suficiente para distinguir grasa del seno y profundidad que deje la cortical completa en pantalla. Un barrido con ganancia alta convierte cualquier seno en una dilatación aparente.",
      },
      { tipo: "subtitulo", texto: "Los cuatro grados, en términos operativos" },
      {
        tipo: "parrafo",
        texto:
          "Grado I: el líquido separa el seno renal sin deformar cálices. Grado II: los cálices mayores se ven redondeados y comunicantes. Grado III: los cálices menores también se dilatan y el parénquima empieza a adelgazar. Grado IV: la cortical mide menos de la mitad de lo esperado y el riñón se ve como un saco septado.",
      },
      {
        tipo: "figura",
        texto: "esquema comparativo · grados I a IV en corte longitudinal",
        pie: "Figura 1. La progresión se lee de dentro hacia fuera: seno, cálices mayores, cálices menores, cortical.",
      },
      { tipo: "subtitulo", texto: "Dónde se equivoca casi todo el mundo" },
      {
        tipo: "parrafo",
        texto:
          "Dos estructuras imitan dilatación: el quiste parapiélico, que no comunica entre cálices, y los vasos hiliares prominentes, que el Doppler color resuelve en segundos. Una tercera trampa es la vejiga llena: dilata pelvis de forma fisiológica. Si el estudio lo permite, repita tras el vaciamiento antes de reportar.",
      },
      { tipo: "subtitulo", texto: "Cómo se dicta el hallazgo" },
      {
        tipo: "parrafo",
        texto:
          "El clínico que refiere necesita tres datos: grado, lado y si hay causa visible (litiasis, masa, globo vesical). Escriba en ese orden y cierre con el espesor cortical. Evite \"leve\" o \"moderada\" sin grado: no son reproducibles entre dos observadores.",
      },
    ],
    control: {
      pregunta:
        "Dilatación redondeada en el seno renal que no comunica entre cálices y no capta con Doppler. ¿Qué reporta?",
      opciones: [
        "Hidronefrosis grado II",
        "Probable quiste parapiélico",
        "Vasos hiliares prominentes",
      ],
      correcta: 1,
      explicacion:
        "La falta de comunicación entre cálices y la ausencia de señal Doppler orientan al quiste parapiélico. Gire la sonda 90° para confirmar que no sigue el trayecto calicial.",
    },
  },
  modulos: [
    {
      clave: "Módulo 1",
      titulo: "Física del ultrasonido y manejo del equipo",
      horas: 120,
      estado: "completado",
      temas: [],
    },
    {
      clave: "Módulo 2",
      titulo: "Abdomen superior: técnica y ventanas",
      horas: 140,
      estado: "completado",
      temas: [],
    },
    {
      clave: "Módulo 3",
      titulo: "Hígado y vía biliar",
      horas: 120,
      estado: "completado",
      temas: [],
    },
    {
      clave: "Módulo 4",
      titulo: "Interpretación renal y de vías urinarias",
      horas: 120,
      estado: "actual",
      temas: [
        {
          clave: "4.1",
          titulo: "Anatomía sonográfica del riñón y barrido completo",
          actividades: [
            { id: "a1", titulo: "Introducción al módulo", tipo: "Lectura", min: 10, estado: "completada" },
            { id: "a2", titulo: "¿Cómo se orienta el riñón en pantalla?", tipo: "Vídeo", min: 12, estado: "completada" },
            { id: "a3", titulo: "Barrido renal completo en 90 segundos", tipo: "Cine-loop", min: 2, estado: "completada" },
            { id: "a4", titulo: "Autoevaluación de anatomía", tipo: "Tarea de práctica", min: 30, estado: "completada" },
            { id: "a5", titulo: "PDF. Medidas normales por edad y talla", tipo: "Lectura", min: 10, estado: "completada" },
            { id: "a6", titulo: "Networking tema 4.1", tipo: "Foro de discusión", min: 10, estado: "pendiente" },
          ],
        },
        {
          clave: "4.2",
          titulo: "Hidronefrosis: gradación y trampas del modo B",
          actividades: [
            { id: "b1", titulo: "Objetivos y criterios de gradación", tipo: "Lectura", min: 10, estado: "completada" },
            { id: "b2", titulo: "Hidronefrosis: gradación y trampas del modo B", tipo: "Vídeo", min: 19, estado: "actual" },
            { id: "b3", titulo: "Infografía. Grados I a IV lado a lado", tipo: "Lectura", min: 10, estado: "pendiente" },
            { id: "b4", titulo: "Autoevaluación: ¿dilatación o quiste?", tipo: "Tarea de práctica", min: 30, estado: "pendiente" },
            { id: "b5", titulo: "Suba un caso con dilatación renal", tipo: "Tarea de práctica", min: 45, estado: "pendiente" },
            { id: "b6", titulo: "Para saber más: litiasis obstructiva", tipo: "Lectura", min: 10, estado: "pendiente" },
          ],
        },
        {
          clave: "4.3",
          titulo: "Quistes, litiasis y casos comentados",
          actividades: [
            { id: "c1", titulo: "Quiste simple vs. complejo", tipo: "Vídeo", min: 15, estado: "pendiente" },
            { id: "c2", titulo: "Litiasis y sombra acústica", tipo: "Cine-loop", min: 12, estado: "pendiente" },
            { id: "c3", titulo: "Evaluación del módulo 4", tipo: "Evaluación", min: 40, estado: "pendiente" },
          ],
        },
      ],
    },
    {
      clave: "Módulo 5",
      titulo: "Vías urinarias y vejiga",
      horas: 110,
      estado: "pendiente",
      temas: [],
    },
    {
      clave: "Módulo 6",
      titulo: "Tiroides y cuello",
      horas: 130,
      estado: "pendiente",
      temas: [],
    },
    {
      clave: "Módulo 7",
      titulo: "Doppler vascular",
      horas: 140,
      estado: "pendiente",
      temas: [],
    },
    {
      clave: "Módulo 8",
      titulo: "Casos integradores",
      horas: 120,
      estado: "pendiente",
      temas: [],
    },
  ],
  notas: [
    { id: "n1", t: 408, texto: "Medir cortical antes de cerrar el grado III." },
    { id: "n2", t: 672, texto: "Preguntar a Sandoval por el caso del lunes: ¿parapiélico?" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const reloj = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ───────────────── Modo lectura: tres temas de confort visual ─────────────────
 * En modo lectura el confort manda sobre la estética de marca: el tema reescribe los tokens del
 * sistema (background, card, foreground, border…) en el contenedor de la pantalla, así que TODA la
 * superficie se tiñe —barra, controles, tarjetas y texto— sin islas brillantes.
 * El menú lateral no se monta en esta pantalla y el header se reduce a la barra de lectura.
 */

export type TemaLectura = "claro" | "sepia" | "oscuro";

export const TEMAS_LECTURA: Record<
  TemaLectura,
  { etiqueta: string; muestra: string; vars: Record<string, string> }
> = {
  claro: {
    etiqueta: "claro",
    muestra: "rgb(248,249,250)",
    vars: {
      "--background": "#F8F9FA",
      "--card": "#FFFFFF",
      "--muted": "#F8F9FA",
      "--foreground": "#111827",
      "--foreground-soft": "#374151",
      "--muted-foreground": "#6B7280",
      "--border": "#E5E7EB",
      "--track": "#e8edf1",
      "--primary": "#53c3be",
      "--secondary": "#1a8880",
      "--accent": "#f0fafa",
      "--accent-foreground": "#1a8880",
      "--sidebar": "#0f2d52",
      "--sidebar-foreground": "#FFFFFF",
      "--sidebar-hover": "rgba(255,255,255,.08)",
      "--sidebar-active": "rgba(255,255,255,.12)",
    },
  },
  sepia: {
    etiqueta: "sepia",
    muestra: "rgb(244,236,216)",
    vars: {
      "--background": "#F4ECD8",
      "--card": "#FBF6EA",
      "--muted": "#F1E7CF",
      "--foreground": "#4A3A2C",
      "--foreground-soft": "#5B4636",
      "--muted-foreground": "#7A6752",
      "--border": "#E0D3B8",
      "--track": "#E6DAC2",
      "--primary": "#1F8A80",
      "--secondary": "#14655F",
      "--accent": "#EEE6D2",
      "--accent-foreground": "#14655F",
      "--sidebar": "#4A3A2C",
      "--sidebar-foreground": "#FBF6EA",
      "--sidebar-hover": "rgba(251,246,234,.10)",
      "--sidebar-active": "rgba(251,246,234,.16)",
    },
  },
  oscuro: {
    etiqueta: "oscuro",
    muestra: "rgb(26,26,26)",
    vars: {
      /* gris profundo, nunca negro puro */
      "--background": "#1A1A1A",
      "--card": "#242424",
      "--muted": "#2A2A2A",
      "--foreground": "#E0E0E0",
      "--foreground-soft": "#CBCBCB",
      "--muted-foreground": "#9E9E9E",
      "--border": "#333333",
      "--track": "#2E2E2E",
      "--primary": "#53c3be",
      "--secondary": "#63CFC9",
      "--accent": "#1E2E2D",
      "--accent-foreground": "#63CFC9",
      "--sidebar": "#2B2B2B",
      "--sidebar-foreground": "#F2F2F2",
      "--sidebar-hover": "rgba(255,255,255,.07)",
      "--sidebar-active": "rgba(255,255,255,.12)",
    },
  },
};

const TAMANOS = [15, 16.5, 18, 20] as const;

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Leccion({ data = MOCK }: { data?: LeccionData }) {
  const { curso, leccion, modulos, notas } = data;
  const [moduloAbierto, setModuloAbierto] = useState("Módulo 4");
  const [reproduciendo, setReproduciendo] = useState(false);
  const [segundo, setSegundo] = useState(504);
  const [nota, setNota] = useState("");
  const [eleccion, setEleccion] = useState<number | null>(null);
  const [vista, setVista] = useState<"leccion" | "contenido" | "notas">("leccion");
  const [buscaTranscripcion, setBuscaTranscripcion] = useState("");
  const [seguirVideo, setSeguirVideo] = useState(true);
  const [pestana, setPestana] = useState<"hallazgos" | "transcripcion">("transcripcion");

  /* modo lectura: tema y tamaño de letra, recordados entre sesiones */
  const [tema, setTema] = useState<TemaLectura>("claro");
  const [iTamano, setITamano] = useState(1);

  useEffect(() => {
    const t = window.localStorage.getItem("lectura-tema") as TemaLectura | null;
    if (t && t in TEMAS_LECTURA) setTema(t);
    const s = Number(window.localStorage.getItem("lectura-tamano"));
    if (Number.isFinite(s) && s >= 0 && s < TAMANOS.length) setITamano(s);
  }, []);

  const cambiarTema = (t: TemaLectura) => {
    setTema(t);
    window.localStorage.setItem("lectura-tema", t);
  };
  const cambiarTamano = (paso: number) => {
    const i = Math.min(TAMANOS.length - 1, Math.max(0, iTamano + paso));
    setITamano(i);
    window.localStorage.setItem("lectura-tamano", String(i));
  };

  /* ── Stubs ─────────────────────────────────────────────── */
  const onMarcarVista = () => {};
  const onSiguiente = () => {};
  const onAnterior = () => {};
  const onSaltarA = (s: number) => setSegundo(s);
  const onGuardarNota = (_t: number, _texto: string) => setNota("");
  const onResponder = (i: number) => setEleccion(i);
  /* ──────────────────────────────────────────────────────── */

  const esVideo = leccion.tipo === "Vídeo" || leccion.tipo === "Cine-loop";
  const duracionSeg = 1120;
  const pct = Math.round((segundo / duracionSeg) * 100);
  const acertado = eleccion === leccion.control.correcta;
  const actividades = modulos.flatMap((m) => m.temas.flatMap((t) => t.actividades));
  const hechas = actividades.filter((a) => a.estado === "completada").length;
  const avanceModulo = useMemo(
    () => (actividades.length ? Math.round((hechas / actividades.length) * 100) : 0),
    [hechas, actividades.length],
  );

  return (
    /* El tema tiñe de borde a borde: reescribe los tokens del sistema en este contenedor */
    <div
      data-tema-lectura={tema}
      style={TEMAS_LECTURA[tema].vars as React.CSSProperties}
      className="min-h-screen bg-background text-foreground transition-colors duration-300 motion-reduce:transition-none"
    >
      {/* ───── Barra de lectura: el header se minimiza y adopta el tono del tema ───── */}
      {!esVideo && (
        <header className="sticky top-0 z-30 flex h-[54px] items-center gap-3.5 border-b border-border bg-background px-5 transition-colors duration-300 motion-reduce:transition-none">
          <button
            type="button"
            aria-label="Volver al curso"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Ver el temario"
            onClick={() => setVista("contenido")}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Menu aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>

          <span className="flex min-w-0 flex-col leading-[1.25]">
            <span className="truncate text-[12.5px] font-semibold">{leccion.titulo}</span>
            <span className={`${mono} text-[10.5px] text-muted-foreground`}>
              {curso.modulo} · Lección {leccion.indice} · {leccion.tipo.toLowerCase()}
            </span>
          </span>

          <span className="ml-auto flex shrink-0 items-center gap-2.5">
            <span className="h-[5px] w-[120px] overflow-hidden rounded-full bg-[color:var(--track)]">
              <span
                aria-hidden
                className="block h-full rounded-full bg-primary"
                style={{ width: `${leccion.lectura?.leido ?? pct}%` }}
              />
            </span>
            <span className={`${mono} whitespace-nowrap text-[11px] font-bold text-muted-foreground`}>
              {leccion.lectura?.leido ?? pct}% leído
            </span>
          </span>

          <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />

          <span role="group" aria-label="Tema de lectura" className="flex shrink-0 items-center gap-1.5">
            {(Object.keys(TEMAS_LECTURA) as TemaLectura[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => cambiarTema(t)}
                aria-label={`Tema ${TEMAS_LECTURA[t].etiqueta}`}
                aria-pressed={tema === t}
                className={`h-[26px] w-[26px] rounded-full border-[1.5px] border-[color:var(--track)] transition-shadow ${focusRing} ${
                  tema === t ? "shadow-[0_0_0_2px_var(--secondary)]" : ""
                }`}
                style={{ background: TEMAS_LECTURA[t].muestra }}
              />
            ))}
          </span>

          <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />

          <span role="group" aria-label="Tamaño de la letra" className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => cambiarTamano(-1)}
              aria-label="Reducir la letra"
              disabled={iTamano === 0}
              className={`h-8 w-8 rounded-lg border border-border text-[12px] font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              A-
            </button>
            <span className={`${mono} w-[34px] text-center text-[10.5px] font-semibold text-muted-foreground`}>
              {TAMANOS[iTamano]}
            </span>
            <button
              type="button"
              onClick={() => cambiarTamano(1)}
              aria-label="Aumentar la letra"
              disabled={iTamano === TAMANOS.length - 1}
              className={`h-8 w-8 rounded-lg border border-border text-[15px] font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              A+
            </button>
          </span>

          <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />

          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label="Actividad anterior"
              className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onSiguiente}
              aria-label="Actividad siguiente"
              className={`grid h-9 w-9 place-items-center rounded-[9px] bg-primary text-[color:var(--sidebar)] ${focusRing}`}
            >
              <ChevronRight aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            </button>
          </span>
        </header>
      )}

      <div
        className="mx-auto w-full max-w-[1240px] px-5 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10"
        style={{ "--lectura-fs": `${TAMANOS[iTamano]}px` } as React.CSSProperties}
      >
      {/* ───── Encabezado de la lección ───── */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={onAnterior}
          className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold transition-colors hover:bg-accent ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Volver al curso
        </button>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-muted-foreground">
            {curso.titulo} · <span className="font-semibold text-foreground">{curso.modulo}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`${mono} text-[12.5px] text-muted-foreground`}>
            Lección {leccion.indice} de {leccion.total}
          </span>
          <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[color:var(--track)]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${avanceModulo}%` }} />
          </div>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ══════════ COLUMNA DE ESTUDIO ══════════ */}
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[32px]">
            {leccion.titulo}
          </h1>

          {/* ───── Reproductor del cine-loop (solo actividades de video) ───── */}
          {esVideo && (
          <section aria-label="Cine-loop de la lección" className={`${card} mt-5 overflow-hidden`}>
            <div className="relative" style={{ background: "var(--wave-0)" }}>
              <div
                aria-hidden
                className="relative grid w-full place-items-center"
                style={{
                  aspectRatio: "16 / 9",
                  background:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                }}
              >
                <span
                  className={`${mono} px-4 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  cine-loop · riñón derecho, eje longitudinal · grado II
                </span>
              </div>

              {/* controles */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-4 pb-3 pt-8"
                style={{ background: "linear-gradient(to top, rgba(15,45,82,.92), rgba(15,45,82,0))" }}
              >
                <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.25)" }}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  {leccion.marcadores.map((m) => (
                    <span
                      key={m.t}
                      aria-hidden
                      className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-full bg-white/70"
                      style={{ left: `${(m.t / duracionSeg) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReproduciendo((v) => !v)}
                    aria-label={reproduciendo ? "Pausar" : "Reproducir"}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)] transition-colors hover:bg-white"
                  >
                    {reproduciendo ? (
                      <Pause aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    ) : (
                      <Play aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    )}
                  </button>
                  <span className={`${mono} text-[12.5px]`} style={{ color: "var(--hero-ink)" }}>
                    {reloj(segundo)} / {leccion.duracion}
                  </span>
                  <Volume2
                    aria-hidden
                    className="ml-2 h-[18px] w-[18px]"
                    strokeWidth={1.75}
                    style={{ color: "var(--hero-ink-soft)" }}
                  />
                  <span
                    className={`${mono} ml-auto rounded-full px-2 py-1 text-[11px]`}
                    style={{ background: "rgba(255,255,255,.14)", color: "var(--hero-ink)" }}
                  >
                    1.0×
                  </span>
                  <Maximize2
                    aria-hidden
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.75}
                    style={{ color: "var(--hero-ink-soft)" }}
                  />
                </div>
              </div>
            </div>

            {/* título de la actividad + guardar nota al minuto actual */}
            <div className="flex items-center gap-4 border-t border-border px-5 py-4">
              <p className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug">{leccion.titulo}</p>
              <button
                type="button"
                onClick={() => onGuardarNota(segundo, nota)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                <NotebookPen aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Guardar nota
              </button>
            </div>

            {/* apoyos del loop: hallazgos marcados y transcripción, en el mismo contenedor */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 pt-4">
              <div
                role="tablist"
                aria-label="Apoyos del cine-loop"
                className="flex gap-1.5 rounded-full bg-muted p-1"
              >
                {(
                  [
                    ["hallazgos", `Hallazgos · ${leccion.marcadores.length}`],
                    ["transcripcion", "Transcripción"],
                  ] as const
                ).map(([id, etiqueta]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={pestana === id}
                    onClick={() => setPestana(id)}
                    className={`h-10 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                      pestana === id
                        ? "bg-sidebar text-sidebar-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>

              {pestana === "transcripcion" ? (
                <>
                  <label className="ml-auto flex h-11 w-full min-w-[200px] items-center gap-2 rounded-full border border-border bg-muted px-3.5 transition-colors focus-within:border-secondary sm:w-[240px]">
                    <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="sr-only">Buscar en la transcripción</span>
                    <input
                      type="search"
                      value={buscaTranscripcion}
                      onChange={(e) => setBuscaTranscripcion(e.target.value)}
                      placeholder="Buscar en la transcripción…"
                      className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeguirVideo((v) => !v)}
                    aria-pressed={seguirVideo}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
                      seguirVideo
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-2 w-2 rounded-full ${seguirVideo ? "bg-primary" : "bg-[color:var(--track)]"}`}
                    />
                    Seguir el video
                  </button>
                  <button
                    type="button"
                    aria-label="Descargar la transcripción"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <Download aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </button>
                </>
              ) : (
                <p className="ml-auto text-[12.5px] text-muted-foreground">
                  Salte al minuto del hallazgo que quiera repasar.
                </p>
              )}
            </div>

            {/* panel: hallazgos */}
            <div role="tabpanel" className={`px-5 pb-5 pt-4 ${pestana === "hallazgos" ? "" : "hidden"}`}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {leccion.marcadores.map((m) => {
                  const activo = Math.abs(m.t - segundo) < 60;
                  return (
                    <li key={m.t}>
                      <button
                        type="button"
                        onClick={() => onSaltarA(m.t)}
                        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${focusRing} ${
                          activo ? "bg-accent" : "hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`${mono} shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-bold ${
                            activo
                              ? "bg-primary text-[color:var(--sidebar)]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {reloj(m.t)}
                        </span>
                        <span
                          className={`min-w-0 text-[13.5px] leading-snug ${
                            activo ? "font-bold text-accent-foreground" : "font-medium text-foreground"
                          }`}
                        >
                          {m.etiqueta}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* panel: transcripción */}
            <div role="tabpanel" className={pestana === "transcripcion" ? "" : "hidden"}>
            <ul className="max-h-[320px] overflow-y-auto p-1.5">
              {leccion.transcripcion
                .filter((l) =>
                  !buscaTranscripcion.trim()
                    ? true
                    : l.texto.toLowerCase().includes(buscaTranscripcion.trim().toLowerCase()),
                )
                .map((l, i, arr) => {
                  const siguiente = arr[i + 1];
                  const on = segundo >= l.t && (!siguiente || segundo < siguiente.t);
                  return (
                    <li key={l.t}>
                      <button
                        type="button"
                        onClick={() => onSaltarA(l.t)}
                        aria-current={on ? "true" : undefined}
                        className={`flex w-full items-start gap-3.5 rounded-[10px] px-3.5 py-3 text-left transition-colors ${focusRing} ${
                          on ? "bg-accent" : "hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`${mono} shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-bold ${
                            on
                              ? "bg-primary text-[color:var(--sidebar)]"
                              : "bg-muted text-secondary"
                          }`}
                        >
                          {reloj(l.t)}
                        </span>
                        <span
                          className={`min-w-0 text-[14px] leading-[1.65] ${
                            on ? "font-semibold text-foreground" : "text-[color:var(--foreground-soft)]"
                          }`}
                        >
                          {l.texto}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
            </div>
          </section>
          )}

          {/* ───── Cabecera de lectura (actividades de tipo Lectura) ───── */}
          {!esVideo && leccion.lectura && (
            <section aria-label="Datos de la lectura" className={`${card} mt-5 overflow-hidden`}>
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-bold text-accent-foreground">
                    <NotebookPen aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {leccion.tipo}
                  </span>
                  <span className={`${mono} text-[12.5px] text-muted-foreground`}>
                    {leccion.lectura.minutos} min de lectura · {leccion.lectura.figuras} figura
                  </span>
                  <span className="ml-auto text-[12.5px] text-muted-foreground">
                    {leccion.lectura.autor} · actualizado el {leccion.lectura.actualizado}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3.5">
                  <div
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
                    role="progressbar"
                    aria-valuenow={leccion.lectura.leido}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Avance de la lectura"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${leccion.lectura.leido}%` }}
                    />
                  </div>
                  <span className={`${mono} shrink-0 text-[12px] font-bold text-muted-foreground`}>
                    {leccion.lectura.leido}% leído
                  </span>
                </div>

                {/* narración del texto en audio */}
                {leccion.lectura.narracion && (
                  <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[12px] border border-border bg-muted p-3.5">
                    <button
                      type="button"
                      onClick={() => setReproduciendo((v) => !v)}
                      aria-label={reproduciendo ? "Pausar la narración" : "Escuchar la narración"}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      {reproduciendo ? (
                        <Pause aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                      ) : (
                        <Play aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                      )}
                    </button>
                    <div className="min-w-[160px] flex-1">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[13px] font-bold">Escuchar la narración</span>
                        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
                          {leccion.lectura.narracion.posicion} / {leccion.lectura.narracion.duracion}
                        </span>
                      </div>
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]"
                        role="progressbar"
                        aria-valuenow={leccion.lectura.narracion.avance}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Avance de la narración"
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${leccion.lectura.narracion.avance}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${mono} h-8 shrink-0 rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                    >
                      1.0×
                    </button>
                    <button
                      type="button"
                      aria-label="Descargar el audio"
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                    >
                      <Download aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-border bg-muted px-6 py-3.5 sm:px-7">
                <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[color:var(--foreground-soft)]">
                  Puede subrayar y dejar notas mientras lee: se guardan en el párrafo donde va.
                </p>
                <button
                  type="button"
                  onClick={() => onGuardarNota(0, nota)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  <NotebookPen aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  Guardar nota
                </button>
              </div>
            </section>
          )}

          {/* ───── Lectura ───── */}
          <article className={`${card} mt-6 p-6 sm:p-8`}>
            <p className={`${kicker} text-secondary`}>Lectura de la lección</p>

            <div className="mt-4 max-w-[66ch]">
              {leccion.cuerpo.map((b, i) =>
                b.tipo === "subtitulo" ? (
                  <h2
                    key={i}
                    className="mt-8 text-[19px] font-extrabold leading-snug tracking-[-0.02em] first:mt-0"
                  >
                    {b.texto}
                  </h2>
                ) : b.tipo === "figura" ? (
                  <figure key={i} className="mt-6">
                    <div
                      aria-hidden
                      className="grid w-full place-items-center overflow-hidden rounded-[12px]"
                      style={{
                        height: 220,
                        background: "var(--muted)",
                        backgroundImage:
                          "repeating-linear-gradient(135deg, rgba(15,45,82,.07) 0 2px, transparent 2px 9px)",
                      }}
                    >
                      <span
                        className={`${mono} px-4 text-center text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground`}
                      >
                        {b.texto}
                      </span>
                    </div>
                    <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {b.pie}
                    </figcaption>
                  </figure>
                ) : (
                  <p
                    key={i}
                    className="mt-4 leading-[1.75] text-[color:var(--foreground-soft)]"
                    style={{ textWrap: "pretty", fontSize: "var(--lectura-fs, 16.5px)" }}
                  >
                    {b.texto}
                  </p>
                ),
              )}

              {/* perla clínica */}
              <aside className="mt-8 flex gap-3.5 rounded-[12px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-5">
                <Lightbulb
                  aria-hidden
                  className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--info-foreground)]"
                  strokeWidth={1.75}
                />
                <div className="min-w-0">
                  <p className={`${kicker} text-[color:var(--info-foreground)]`}>Perla clínica</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--info-foreground)]">
                    {leccion.perla}
                  </p>
                </div>
              </aside>
            </div>
          </article>

          {/* ───── Punto de control ───── */}
          <section aria-label="Punto de control" className={`${card} mt-6 p-6 sm:p-8`}>
            <p className={`${kicker} text-secondary`}>Punto de control · 1 pregunta</p>
            <p className="mt-3 max-w-[60ch] text-[17px] font-bold leading-snug">
              {leccion.control.pregunta}
            </p>
            <ul className="mt-5 flex max-w-[60ch] flex-col gap-2.5">
              {leccion.control.opciones.map((o, i) => {
                const elegida = eleccion === i;
                const esCorrecta = i === leccion.control.correcta;
                const revelado = eleccion !== null;
                return (
                  <li key={o}>
                    <button
                      type="button"
                      onClick={() => onResponder(i)}
                      aria-pressed={elegida}
                      className={`flex w-full items-center gap-3 rounded-[11px] border px-4 py-3.5 text-left text-[14.5px] transition-colors ${focusRing} ${
                        revelado && esCorrecta
                          ? "border-transparent bg-accent font-bold text-accent-foreground"
                          : elegida
                            ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] font-semibold text-[color:var(--warning-foreground)]"
                            : "border-border bg-card font-medium hover:bg-muted"
                      }`}
                    >
                      {revelado && esCorrecta ? (
                        <Check aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={2.2} />
                      ) : (
                        <Circle aria-hidden className="h-[18px] w-[18px] shrink-0 opacity-60" strokeWidth={1.75} />
                      )}
                      {o}
                    </button>
                  </li>
                );
              })}
            </ul>
            {eleccion !== null && (
              <p
                aria-live="polite"
                className="mt-4 max-w-[60ch] text-[14px] leading-relaxed text-[color:var(--foreground-soft)]"
              >
                <span className="font-bold text-foreground">
                  {acertado ? "Correcto. " : "Revise otra vez. "}
                </span>
                {leccion.control.explicacion}
              </p>
            )}
          </section>

          {/* ───── Navegación de lección ───── */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAnterior}
              className={`inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-[14px] font-semibold transition-colors hover:bg-accent ${focusRing}`}
            >
              <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
              Lección anterior
            </button>
            <button
              type="button"
              onClick={onMarcarVista}
              className={`inline-flex h-12 items-center gap-2.5 rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Check aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
              {esVideo ? "Marcar como vista y continuar" : "Marcar como leída y continuar"}
            </button>
            <button
              type="button"
              onClick={onSiguiente}
              className={`inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
            >
              Litiasis y sombra acústica
              <ChevronRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ══════════ RAIL: contenido del módulo + notas ══════════ */}
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[92px]">
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-baseline justify-between gap-3 border-b border-border p-5">
              <h2 className={`${kicker} text-muted-foreground`}>Contenido del curso</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {hechas}/{actividades.length}
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              {modulos.map((m) => {
                const abierto = moduloAbierto === m.clave;
                return (
                  <div key={m.clave} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setModuloAbierto(abierto ? "" : m.clave)}
                      aria-expanded={abierto}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${focusRing} ${
                        abierto ? "bg-muted" : "hover:bg-muted"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`${kicker} text-secondary`}>{m.clave}</span>
                          {m.estado === "completado" && (
                            <Check
                              aria-hidden
                              className="h-3.5 w-3.5 text-accent-foreground"
                              strokeWidth={2.4}
                            />
                          )}
                          <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                            {m.horas} h
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 block text-[13.5px] leading-snug ${
                            m.estado === "actual" ? "font-bold text-foreground" : "font-semibold text-foreground"
                          }`}
                        >
                          {m.titulo}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={`mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground transition-transform ${
                          abierto ? "rotate-180" : ""
                        }`}
                        strokeWidth={2}
                      />
                    </button>

                    {abierto &&
                      (m.temas.length === 0 ? (
                        <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-muted-foreground">
                          Se abre cuando acredite el módulo anterior.
                        </p>
                      ) : (
                        <div className="pb-2">
                          {m.temas.map((t) => (
                            <div key={t.clave} className="border-t border-border pt-4">
                              <p className="px-5 text-[13px] font-bold leading-snug text-secondary">
                                {t.clave} {t.titulo}
                              </p>
                              <ul className="mt-2 flex flex-col">
                                {t.actividades.map((a) => {
                                  const on = a.estado === "actual";
                                  const ok = a.estado === "completada";
                                  return (
                                    <li key={a.id}>
                                      <button
                                        type="button"
                                        aria-current={on ? "step" : undefined}
                                        className={`flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors ${focusRing} ${
                                          on ? "bg-accent" : "hover:bg-muted"
                                        }`}
                                      >
                                        <span
                                          aria-hidden
                                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                                            ok
                                              ? "bg-primary text-[color:var(--sidebar)]"
                                              : on
                                                ? "border-2 border-secondary bg-card"
                                                : "bg-[color:var(--track)]"
                                          }`}
                                        >
                                          {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span
                                            className={`block text-[13px] leading-snug ${
                                              on
                                                ? "font-bold text-accent-foreground"
                                                : "font-medium text-foreground"
                                            }`}
                                          >
                                            {a.titulo}
                                          </span>
                                          <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                            {a.tipo} · <span className={mono}>{a.min} min</span>
                                          </span>
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2">
              <NotebookPen aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
              <h2 className="text-[14.5px] font-bold">Sus notas</h2>
              <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
                {notas.length}
              </span>
            </div>

            <ul className="mt-3 flex flex-col divide-y divide-border">
              {notas.map((n) => (
                <li key={n.id} className="flex gap-3 py-3 first:pt-1">
                  <button
                    type="button"
                    onClick={() => onSaltarA(n.t)}
                    className={`${mono} h-6 shrink-0 rounded-[6px] bg-muted px-1.5 text-[11.5px] font-bold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    {reloj(n.t)}
                  </button>
                  <p className="min-w-0 text-[13px] leading-snug text-[color:var(--foreground-soft)]">
                    {n.texto}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-3">
              <label htmlFor="nota-nueva" className="sr-only">
                Nueva nota
              </label>
              <textarea
                id="nota-nueva"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                placeholder="Escriba lo que quiere recordar…"
                className={`w-full resize-none rounded-[10px] border border-border bg-card p-3 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground ${focusRing}`}
              />
              <button
                type="button"
                onClick={() => onGuardarNota(segundo, nota)}
                disabled={!nota.trim()}
                className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground ${focusRing}`}
              >
                Guardar en <span className={mono}>{reloj(segundo)}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Barra móvil: avance + marcar como vista */}
      <div className="fixed inset-x-0 bottom-[68px] z-20 border-t border-border bg-card px-4 py-2.5 lg:hidden">
        <div className="mx-auto flex max-w-[460px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={`${mono} text-[11px] text-muted-foreground`}>
              Lección {leccion.indice}/{leccion.total} · {reloj(segundo)}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onMarcarVista}
            className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)]"
          >
            <Check aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Vista
          </button>
        </div>
      </div>

      {/* Pestañas móviles (lección / contenido / notas) — la columna larga se navega por partes */}
      <div className="sr-only" aria-hidden>
        {vista}
        <button type="button" onClick={() => setVista("contenido")} />
      </div>
      </div>
    </div>
  );
}

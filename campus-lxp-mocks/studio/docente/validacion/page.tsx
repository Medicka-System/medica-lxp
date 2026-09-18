"use client";

/**
 * Studio · Validación de casos — la herramienta diaria del DOCENTE
 *
 * El alumno sube su caso (DICOM + hallazgos) en su bitácora. El docente lo juzga: APRUEBA o
 * RECHAZA con feedback. Al aprobar se acreditan las horas y se actualiza su competencia I-AIM.
 *
 * Reparto de trabajo: Eco pre-analiza TODO (compara la respuesta del alumno contra la verdad del
 * caso, propone veredicto, nota y borrador de feedback) pero NUNCA firma. El especialista es el
 * docente: sólo él tiene criterio clínico sobre la imagen, y su firma es la que acredita.
 *
 * Tres zonas: bandeja pre-analizada (izquierda) · detalle del caso con visor (centro, protagonista)
 * · Eco colapsable (derecha).
 *
 * Color: violeta = IA (nunca alerta) · ámbar = lo urgente (único color de atención) · sin rojo,
 * porque pedir corrección no es una falta.
 *
 * Stubs: onAbrirCaso · onAprobar · onRechazar · onAprobarLote · onEditarFeedback ·
 *        onAgregarBiblioteca · onAnotar · onPreguntarIA
 */

import { useMemo, useState } from "react";
import {
  BarChart3,
  BookCopy,
  Check,
  ChevronDown,
  Clock,
  Crop,
  Hand,
  ListTree,
  Minus,
  MoveUpRight,
  Pencil,
  Plus,
  Ruler,
  Search,
  Send,
  Sparkles,
  Sun,
  TriangleAlert,
  X,
} from "lucide-react";
import { mono, kicker, softText, focusRing, focusRingDark } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type VeredictoIA = "aprobar" | "revisar";
export type Confianza = "alta" | "media" | "baja";

export type CasoCola = {
  id: string;
  ini: string;
  alumno: string;
  grupo: string;
  modulo: string;
  organo: string;
  espera: string;
  /** > 72 h en cola: el único color de atención */
  urgente?: boolean;
  veredictoIA: VeredictoIA;
  confianza: Confianza;
};

export type Anotacion = { id: string; etiqueta: string; x: number; y: number; deIA?: boolean };

export type HallazgoClave = { id: string; texto: string; ancla?: string; medidoPorIA?: boolean };

export type VerdadDelCaso = {
  hallazgosClave: HallazgoClave[];
  puntosAprendizaje: number;
  erroresComunes: number;
};

export type PreAnalisis = {
  acerto: string[];
  omitio: string[];
  confundio: string[];
  veredicto: string;
  porque: string;
  notaSugerida: string;
  borradorFeedback: string;
};

export type CasoDetalle = {
  id: string;
  ini: string;
  alumno: string;
  grupo: string;
  modulo: string;
  espera: string;
  urgente?: boolean;
  escaladoPorIA?: boolean;
  confianza: Confianza;
  subido: string;
  piezas: number;
  loops: number;
  series: { id: string; nombre: string; meta: string; activa?: boolean }[];
  anotaciones: Anotacion[];
  respuestaAlumno: { vineta: string; hallazgos: string; diagnostico: string };
  ia: PreAnalisis;
  horasQueAcredita: number;
  dominio: string;
  /** el especialista confirma o corrige la estructura que Eco usó para juzgar */
  verdad: VerdadDelCaso;
};

export type MensajeIA = {
  id: string;
  de: "docente" | "ia";
  texto: string;
  tabla?: { quien: string; sintesis: string; nota: string; clase: "ok" | "warn" }[];
  fichas?: { titulo: string; porque: string }[];
  acciones?: { etiqueta: string; primaria?: boolean }[];
};

export type ValidacionData = {
  cola: { listos: CasoCola[]; criterio: CasoCola[]; totalListos: number };
  caso: CasoDetalle;
  asistente: { sugerencias: string[]; conversacion: MensajeIA[] };
  alumnoTotales: { horas: number; horasPrograma: number; dominioAntes: number; dominioDespues: number };
};

const MOCK: ValidacionData = {
  cola: {
    totalListos: 7,
    listos: [
      { id: "k1", ini: "KM", alumno: "Dra. Karla Méndez", grupo: "Grupo B", modulo: "M04", organo: "riñón", espera: "4 h", veredictoIA: "aprobar", confianza: "alta" },
      { id: "k2", ini: "LA", alumno: "Dr. Luis Arreola", grupo: "Grupo B", modulo: "M03", organo: "vesícula", espera: "6 h", veredictoIA: "aprobar", confianza: "alta" },
      { id: "k3", ini: "RS", alumno: "Dra. Renata Salas", grupo: "Grupo A", modulo: "M04", organo: "riñón", espera: "9 h", veredictoIA: "aprobar", confianza: "alta" },
      { id: "k4", ini: "MP", alumno: "Dra. Mariana Peña", grupo: "Grupo A", modulo: "M06", organo: "útero", espera: "1 día", veredictoIA: "aprobar", confianza: "alta" },
      { id: "k5", ini: "JC", alumno: "Dr. Javier Cano", grupo: "Grupo B", modulo: "M05", organo: "vejiga", espera: "1 día", veredictoIA: "aprobar", confianza: "media" },
    ],
    criterio: [
      { id: "c1", ini: "IT", alumno: "Dr. Iván Torres", grupo: "Grupo B", modulo: "M04", organo: "riñón", espera: "3 días", urgente: true, veredictoIA: "revisar", confianza: "baja" },
      { id: "c2", ini: "HC", alumno: "Dr. Hugo Cuevas", grupo: "Grupo POCUS", modulo: "M04", organo: "riñón", espera: "4 días", urgente: true, veredictoIA: "revisar", confianza: "baja" },
    ],
  },
  caso: {
    id: "c1",
    ini: "IT",
    alumno: "Dr. Iván Torres",
    grupo: "Grupo B · Nov 2026",
    modulo: "Módulo 04 · Interpretación renal",
    espera: "3 días esperando",
    urgente: true,
    escaladoPorIA: true,
    confianza: "baja",
    subido: "13 nov",
    piezas: 4,
    loops: 1,
    series: [
      { id: "s1", nombre: "longitudinal", meta: "18 img", activa: true },
      { id: "s2", nombre: "transversal", meta: "64 img" },
      { id: "s3", nombre: "Doppler", meta: "loop 4 s" },
    ],
    anotaciones: [
      { id: "a1", etiqueta: "Cálices dilatados", x: 34, y: 28 },
      { id: "a2", etiqueta: "Cortical 7.2 mm · medida por Eco", x: 48, y: 58, deIA: true },
    ],
    respuestaAlumno: {
      vineta: "Mujer de 46 años, dolor lumbar derecho de 3 días, creatinina normal.",
      hallazgos:
        "Dilatación pielocalicial derecha. Cálices redondeados. No logré medir bien la cortical; el jet ureteral se ve simétrico.",
      diagnostico: "Hidronefrosis grado II derecha, probablemente crónica.",
    },
    ia: {
      acerto: [
        "Identificó la dilatación pielocalicial y su lado",
        "Describió cálices redondeados y comunicantes",
      ],
      omitio: [
        "No midió la cortical: 7.2 mm según mi medición sobre la imagen",
        "No reportó el jet ureteral ausente en la segunda exploración",
      ],
      confundio: [
        "Grado II cuando la cortical adelgazada lo coloca en grado III",
        "Lo llama crónico sin dato que lo sostenga",
      ],
      veredicto: "Rechazar y pedir corrección",
      porque: "El grado no se sostiene sin medir cortical",
      notaSugerida: "7.0",
      borradorFeedback:
        "Doctor: la dilatación está bien identificada y la descripción de los cálices es correcta. Antes de cerrar el grado necesita medir la cortical en los dos polos — en su imagen mide 7.2 mm, lo que ya coloca el caso en grado III. Revise también el jet ureteral: en la segunda exploración está ausente del lado derecho, y eso apunta a obstrucción, no a cronicidad. Corrija esos dos puntos y vuelva a subir el caso.",
    },
    horasQueAcredita: 4,
    dominio: "Interpretación",
    verdad: {
      hallazgosClave: [
        { id: "h1", texto: "Dilatación pielocalicial con cálices comunicantes", ancla: "Cálices dilatados" },
        { id: "h2", texto: "Cortical adelgazada por debajo de 10 mm", ancla: "Cortical 7.2 mm", medidoPorIA: true },
      ],
      puntosAprendizaje: 2,
      erroresComunes: 3,
    },
  },
  asistente: {
    sugerencias: [
      "Resume los casos del Grupo B",
      "¿Cuáles son los mejores para la biblioteca?",
      "Redacta feedback para los rechazados",
      "¿Qué nota sugieres y por qué?",
    ],
    conversacion: [
      { id: "m1", de: "docente", texto: "Resume los casos del Grupo B" },
      {
        id: "m2",
        de: "ia",
        texto: "Los 5 casos del Grupo B son del Módulo 04. Cuatro cumplen la rúbrica; uno escalé a su criterio.",
        tabla: [
          { quien: "K. Méndez", sintesis: "grado III bien argumentado", nota: "9.4", clase: "ok" },
          { quien: "L. Arreola", sintesis: "colecistitis, mide pared", nota: "8.8", clase: "ok" },
          { quien: "J. Cano", sintesis: "globo vesical, falta residuo", nota: "8.0", clase: "ok" },
          { quien: "I. Torres", sintesis: "grado dudoso sin cortical", nota: "7.0", clase: "warn" },
        ],
        acciones: [{ etiqueta: "Aprobar los 4", primaria: true }, { etiqueta: "Abrir el dudoso" }],
      },
      { id: "m3", de: "docente", texto: "¿Cuáles son los mejores para la biblioteca?" },
      {
        id: "m4",
        de: "ia",
        texto: "Dos valen como material de estudio:",
        fichas: [
          { titulo: "K. Méndez · grado III derecho", porque: "Serie completa, cortical medida y jet documentado" },
          { titulo: "R. Salas · quiste parapiélico", porque: "Es la trampa clásica; sirve para el módulo 04" },
        ],
        acciones: [{ etiqueta: "Enviarlos a curaduría", primaria: true }],
      },
    ],
  },
  alumnoTotales: { horas: 252, horasPrograma: 1000, dominioAntes: 71, dominioDespues: 74 },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

function FilaCola({
  c,
  seleccionado,
  onClick,
}: {
  c: CasoCola;
  seleccionado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={seleccionado ? "true" : undefined}
      className={`flex w-full gap-2.5 rounded-r-[10px] border-l-[3px] p-3 text-left transition-colors ${focusRing} ${
        seleccionado ? "border-primary bg-accent" : "border-transparent hover:bg-muted"
      }`}
    >
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground"
      >
        {c.ini}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`min-w-0 flex-1 truncate text-[12.5px] ${
              seleccionado ? "font-bold text-accent-foreground" : "font-semibold text-foreground"
            }`}
          >
            {c.alumno}
          </span>
          <span
            className={`${mono} inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10.5px] ${
              c.urgente ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
            }`}
          >
            {c.urgente && <TriangleAlert aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
            {c.espera}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {c.grupo} · {c.modulo} · {c.organo}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[10px] font-bold ${
              c.veredictoIA === "aprobar"
                ? "bg-accent text-accent-foreground"
                : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
            }`}
          >
            {c.veredictoIA === "aprobar" ? (
              <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.6} />
            ) : (
              <TriangleAlert aria-hidden className="h-2.5 w-2.5" strokeWidth={2.2} />
            )}
            IA: {c.veredictoIA === "aprobar" ? "aprobar" : "revisar"}
          </span>
          <span className={`${mono} text-[10px] text-muted-foreground`}>confianza {c.confianza}</span>
        </span>
      </span>
    </button>
  );
}

function BloqueAnalisis({
  clase,
  titulo,
  items,
}: {
  clase: "ok" | "omitio" | "confundio";
  titulo: string;
  items: string[];
}) {
  const color =
    clase === "ok"
      ? "text-secondary"
      : clase === "omitio"
        ? "text-[color:var(--warning-foreground)]"
        : "text-[color:var(--info-foreground)]";
  const Icono = clase === "ok" ? Check : clase === "omitio" ? Minus : TriangleAlert;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icono aria-hidden className={`h-3.5 w-3.5 shrink-0 ${color}`} strokeWidth={2.4} />
        <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${color}`}>{titulo}</p>
      </div>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-[21px]">
        {items.map((t) => (
          <li key={t} className={`text-[12.5px] leading-relaxed ${softText}`}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function ValidacionCasos({ data = MOCK }: { data?: ValidacionData }) {
  const { cola, caso, asistente, alumnoTotales } = data;
  const [seleccion, setSeleccion] = useState(caso.id);
  const [nota, setNota] = useState(caso.ia.notaSugerida);
  const [feedback, setFeedback] = useState(caso.ia.borradorFeedback);
  const [iaAbierta, setIaAbierta] = useState(false);
  const [peticion, setPeticion] = useState("");
  const [herramienta, setHerramienta] = useState<"puntero" | "hallazgo" | "medida" | "region">("hallazgo");
  const [firmado, setFirmado] = useState(false);
  const [aBiblioteca, setABiblioteca] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirCaso = (id: string) => setSeleccion(id);
  const onAprobar = () => setFirmado(true);
  const onRechazar = () => {};
  const onAprobarLote = () => {};
  const onEditarFeedback = (_texto: string) => {};
  const onAgregarBiblioteca = () => {};
  const onAnotar = (_tipo: string) => {};
  const onEnriquecerVerdad = () => {};
  const onPreguntarIA = (_peticion: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const HERRAMIENTAS = useMemo(
    () =>
      [
        { id: "puntero", label: "Puntero", icono: Hand },
        { id: "hallazgo", label: "Marcar hallazgo", icono: MoveUpRight },
        { id: "medida", label: "Medir", icono: Ruler },
        { id: "region", label: "Región", icono: Crop },
      ] as const,
    [],
  );

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        {/* ════════ 1 · BANDEJA: cola ordenada por criterio requerido ════════ */}
        <aside className="flex w-[344px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-extrabold tracking-[-0.015em]">Por validar</h1>
              <span className={`${mono} text-[13px] font-bold text-muted-foreground`}>
                {cola.totalListos + cola.criterio.length}
              </span>
              <button
                type="button"
                className={`ml-auto inline-flex h-[30px] items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Grupo B
                <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            <label className="mt-2.5 flex h-9 items-center gap-2 rounded-[9px] border border-border bg-muted px-2.5 transition-colors focus-within:border-secondary">
              <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="sr-only">Buscar alumno o diagnóstico</span>
              <input
                type="search"
                placeholder="Buscar alumno o diagnóstico…"
                className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="mt-2.5 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
              <Sparkles
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]"
                strokeWidth={1.75}
              />
              <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[color:var(--info-foreground)]">
                Eco pre-analizó los {cola.totalListos + cola.criterio.length} y los ordenó por
                criterio requerido
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 px-4 pb-2 pt-3">
              <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">
                Listos para confirmar
              </h2>
              <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>
                {cola.totalListos}
              </span>
            </div>
            <div className="pr-4">
              {cola.listos.map((c) => (
                <FilaCola key={c.id} c={c} seleccionado={seleccion === c.id} onClick={() => onAbrirCaso(c.id)} />
              ))}
            </div>
            {cola.totalListos > cola.listos.length && (
              <button
                type="button"
                className={`mx-4 mt-1 h-[34px] text-[12px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
              >
                Ver los otros {cola.totalListos - cola.listos.length}
              </button>
            )}

            <div className="mt-1.5 flex items-center gap-2 border-t border-border px-4 pb-2 pt-4">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--warning)]" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--warning-foreground)]">
                Requieren su criterio
              </h2>
              <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>
                {cola.criterio.length}
              </span>
            </div>
            <div className="pb-4 pr-4">
              {cola.criterio.map((c) => (
                <FilaCola key={c.id} c={c} seleccionado={seleccion === c.id} onClick={() => onAbrirCaso(c.id)} />
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-muted px-4 py-3.5">
            <button
              type="button"
              onClick={onAprobarLote}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
              Aprobar los {cola.totalListos} listos
            </button>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Revisará un resumen antes de firmar. Su aprobación acredita las horas.
            </p>
          </div>
        </aside>

        {/* ════════ 2 · DETALLE: la imagen es lo primero ════════ */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3.5">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar text-[12px] font-bold text-sidebar-foreground"
            >
              {caso.ini}
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold leading-tight">{caso.alumno}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {caso.grupo} · {caso.modulo}
              </p>
            </div>
            {caso.urgente && (
              <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                {caso.espera}
              </span>
            )}
            {caso.escaladoPorIA && (
              <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                <Sparkles aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                Escalado por Eco · confianza {caso.confianza}
              </span>
            )}
            <span className="ml-auto flex gap-1.5">
              {["Caso anterior", "Siguiente"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  {t}
                </button>
              ))}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
            {/* visor */}
            <section className="overflow-hidden rounded-xl" style={{ background: "var(--sidebar)" }}>
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
                <span className={`${kicker} mr-1 text-white/55`}>Anotar</span>
                {HERRAMIENTAS.map(({ id, label, icono: Icono }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    aria-pressed={herramienta === id}
                    onClick={() => {
                      setHerramienta(id);
                      onAnotar(id);
                    }}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] transition-colors ${focusRingDark} ${
                      herramienta === id
                        ? "bg-primary text-[color:var(--sidebar)]"
                        : "bg-white/[0.08] text-white/80 hover:bg-white/20"
                    }`}
                  >
                    <Icono aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Ventana y nivel"
                  className={`grid h-9 w-9 place-items-center rounded-[9px] bg-white/[0.08] text-white/80 transition-colors hover:bg-white/20 ${focusRingDark}`}
                >
                  <Sun aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
                <span className="ml-auto flex items-center gap-2.5">
                  <span className={`${mono} text-[11px] text-white/60`}>serie 1/3 · 18/64</span>
                  <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/[0.16] px-2.5 text-[10.5px] font-bold text-primary">
                    <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.6} />
                    Anonimizado
                  </span>
                </span>
              </div>

              <div className="relative grid h-[300px] place-items-center" style={{ background: "#0a2140" }}>
                <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                <span
                  aria-hidden
                  className={`${mono} relative text-[10px] uppercase tracking-[0.16em]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  riñón derecho · longitudinal
                </span>
                {caso.anotaciones.map((a) => (
                  <span
                    key={a.id}
                    className="absolute flex items-center gap-1.5"
                    style={{ top: `${a.y}%`, left: `${a.x}%` }}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: a.deIA ? "var(--info)" : "var(--primary)",
                        boxShadow: "0 0 0 3px rgba(255,255,255,.28)",
                      }}
                    />
                    <span
                      className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold text-white"
                      style={{
                        background: "rgba(15,45,82,.9)",
                        borderColor: a.deIA ? "var(--info)" : "var(--primary)",
                      }}
                    >
                      {a.etiqueta}
                    </span>
                  </span>
                ))}
                <span className={`${mono} absolute bottom-3 right-3 text-[10px] text-white/60`}>
                  Cornerstone3D
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 px-3 py-2.5">
                {caso.series.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`w-[110px] shrink-0 rounded-lg border-[1.5px] p-1 text-left ${focusRingDark} ${
                      s.activa ? "border-primary bg-primary/[0.12]" : "border-white/[0.14]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="relative block w-full overflow-hidden rounded"
                      style={{ aspectRatio: "16 / 10", background: "#0a2140" }}
                    >
                      <span className="absolute inset-0" style={{ background: rayas }} />
                    </span>
                    <span
                      className={`mt-1 block text-[9.5px] font-semibold ${
                        s.activa ? "text-primary" : "text-white/70"
                      }`}
                    >
                      {s.nombre}
                    </span>
                    <span className={`${mono} block text-[9px] text-white/50`}>{s.meta}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* alumno vs IA */}
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <section className="rounded-xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
                <p className={`${kicker} text-muted-foreground`}>Lo que reportó el alumno</p>
                {(
                  [
                    ["Viñeta", caso.respuestaAlumno.vineta],
                    ["Hallazgos", caso.respuestaAlumno.hallazgos],
                    ["Diagnóstico presuntivo", caso.respuestaAlumno.diagnostico],
                  ] as const
                ).map(([t, v]) => (
                  <div key={t} className="mt-3.5">
                    <p className="text-[11px] font-bold">{t}</p>
                    <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>{v}</p>
                  </div>
                ))}
                <p className={`${mono} mt-4 border-t border-border pt-3 text-[11.5px] text-muted-foreground`}>
                  subido el {caso.subido} · {caso.piezas} piezas · {caso.loops} loop
                </p>
              </section>

              <section
                className="rounded-xl border border-[color:var(--info-border)] p-[18px] shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                style={{ background: "#fbfbff" }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                  >
                    <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
                  <span className="ml-auto inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                    Contra la verdad del caso
                  </span>
                </div>

                <div className="mt-3.5 flex flex-col gap-3.5">
                  <BloqueAnalisis clase="ok" titulo="Acertó" items={caso.ia.acerto} />
                  <BloqueAnalisis clase="omitio" titulo="Omitió" items={caso.ia.omitio} />
                  <BloqueAnalisis clase="confundio" titulo="Confundió" items={caso.ia.confundio} />
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Veredicto sugerido
                    </span>
                    <span className="mt-1 block text-[13.5px] font-bold">{caso.ia.veredicto}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {caso.ia.porque}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`${mono} block text-[26px] font-extrabold leading-none`}>
                      {caso.ia.notaSugerida}
                    </span>
                    <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>
                      nota sugerida
                    </span>
                  </span>
                </div>

                {/* el especialista confirma o corrige la verdad del caso: es lo que entrena al simulador */}
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em]">Verdad del caso</p>
                    <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
                      La usa el simulador
                    </span>
                    <button
                      type="button"
                      onClick={onEnriquecerVerdad}
                      className={`ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                    >
                      <ListTree aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Estructurar
                    </button>
                  </div>
                  <p className={`mt-2 text-[11.5px] leading-relaxed ${softText}`}>
                    Usted es quien tiene el criterio: confirme lo que midió Eco o corríjalo. Esto es
                    contra lo que se juzgan los próximos casos y lo que entrena al simulador.
                  </p>

                  <p className="mt-3.5 text-[11px] font-bold">Hallazgos clave</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {caso.verdad.hallazgosClave.map((hc) => (
                      <li
                        key={hc.id}
                        className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5"
                      >
                        <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium leading-relaxed">
                            {hc.texto}
                          </span>
                          {hc.ancla && (
                            <span
                              className={`mt-1.5 inline-flex h-5 items-center gap-1.5 rounded-full px-1.5 text-[10px] font-bold ${
                                hc.medidoPorIA
                                  ? "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                                  : "bg-accent text-accent-foreground"
                              }`}
                            >
                              {hc.medidoPorIA ? (
                                <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                              ) : (
                                <MoveUpRight aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                              )}
                              {hc.ancla}
                              {hc.medidoPorIA && " · medida por Eco"}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          aria-label={`Editar: ${hc.texto}`}
                          onClick={onEnriquecerVerdad}
                          className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                        >
                          <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        onClick={onEnriquecerVerdad}
                        className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[12px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                      >
                        <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                        Agregar hallazgo clave
                      </button>
                    </li>
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onEnriquecerVerdad}
                      className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      {caso.verdad.puntosAprendizaje} puntos de aprendizaje
                    </button>
                    <button
                      type="button"
                      onClick={onEnriquecerVerdad}
                      className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[12px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
                    >
                      <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                      {caso.verdad.erroresComunes} errores comunes
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* feedback editable */}
            <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Feedback para el alumno</p>
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                  <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                  Borrador de Eco
                </span>
                <span className="ml-auto flex gap-1.5">
                  {["Más breve", "Más exigente"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onPreguntarIA(t)}
                      className={`h-8 rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      {t}
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  onEditarFeedback(e.target.value);
                }}
                className="mt-3 w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary"
              />
              <p className="mt-2.5 text-[11.5px] text-muted-foreground">
                Puede editarlo libremente: el alumno recibe exactamente lo que usted firme.
              </p>
            </section>
          </div>

          {/* barra de firma */}
          <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-t border-border bg-card px-5 py-3.5">
            <label className="flex shrink-0 items-center gap-2.5">
              <span className="text-[11.5px] font-bold">Nota</span>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className={`${mono} h-11 w-[74px] rounded-[10px] border border-border bg-card px-3 text-center text-[15px] font-bold text-foreground outline-none transition-colors focus:border-secondary`}
              />
            </label>
            <p className="min-w-[200px] flex-1 text-[11.5px] leading-snug text-muted-foreground">
              Eco propone; <span className="font-bold text-foreground">usted firma</span>. Al aprobar
              se acreditan{" "}
              <span className={`${mono} font-bold text-foreground`}>{caso.horasQueAcredita} h</span> y
              se actualiza su competencia I-AIM.
            </p>
            {/* curaduría agrupada: nunca se interpone entre la nota y la decisión */}
            <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEnriquecerVerdad}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ListTree aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Verdad del caso
            </button>
            <button
              type="button"
              onClick={onAgregarBiblioteca}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <BookCopy aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Agregar a Biblioteca
            </button>
            </span>

            {/* decisión: se mantiene unida y siempre termina a la derecha, aunque la barra envuelva */}
            <span className="ml-auto flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onRechazar}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-bold text-foreground transition-colors hover:bg-muted ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Rechazar y pedir corrección
            </button>
            <button
              type="button"
              onClick={onAprobar}
              className={`inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
              Aprobar y acreditar
            </button>
            </span>
          </div>
        </div>

        {/* ════════ 3 · ASISTENTE DOCENTE (colapsable) ════════ */}
        {iaAbierta ? (
          <aside
            aria-label="Eco"
            className="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-[color:var(--info-border)] bg-card"
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
              >
                <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                <p className="mt-0.5 text-[11px] text-[color:var(--info-foreground)]">
                  Propone · usted firma
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
                        <ul className="mt-2.5 overflow-hidden rounded-[11px] border border-border">
                          {m.tabla.map((r, i) => (
                            <li
                              key={r.quien}
                              className={`flex items-center gap-2.5 px-2.5 py-2.5 ${
                                i ? "border-t border-border" : ""
                              }`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-[12px] font-bold">{r.quien}</span>
                                <span className="mt-px block text-[10.5px] text-muted-foreground">
                                  {r.sintesis}
                                </span>
                              </span>
                              <span
                                className={`${mono} inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11.5px] font-bold ${
                                  r.clase === "ok"
                                    ? "bg-accent text-accent-foreground"
                                    : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                                }`}
                              >
                                {r.nota}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {m.fichas && (
                        <ul className="mt-2.5 flex flex-col gap-1.5">
                          {m.fichas.map((f) => (
                            <li
                              key={f.titulo}
                              className="flex gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5"
                            >
                              <BookCopy
                                aria-hidden
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
                                strokeWidth={1.75}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[12px] font-bold">{f.titulo}</span>
                                <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>
                                  {f.porque}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {m.acciones && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {m.acciones.map((a) => (
                            <button
                              key={a.etiqueta}
                              type="button"
                              className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] transition-colors ${focusRing} ${
                                a.primaria
                                  ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                                  : "border border-border bg-card font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              {a.primaria && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />}
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

            <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
              <div className="flex gap-1.5 overflow-x-auto">
                {asistente.sugerencias.slice(2).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onPreguntarIA(s)}
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
                  onPreguntarIA(peticion);
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
        ) : (
          <aside className="flex w-14 shrink-0 flex-col items-center gap-2.5 border-l border-border bg-card py-3.5">
            <button
              type="button"
              onClick={() => setIaAbierta(true)}
              aria-label="Abrir Eco"
              className={`grid h-10 w-10 place-items-center rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
            >
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <span
              aria-hidden
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
              style={{ writingMode: "vertical-rl" }}
            >
              Asistente
            </span>
          </aside>
        )}
      </div>

      {/* ───── Firma: lo que cambia para el alumno, con cifras ───── */}
      {firmado && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Caso aprobado"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <span
                aria-hidden
                className="inline-grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"
              >
                <Check className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <h2 className="mt-3.5 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
                Caso aprobado y firmado por usted
              </h2>
              <p className={`mt-2 text-[13.5px] leading-relaxed ${softText}`}>
                {caso.alumno} · {caso.modulo}. Ya puede verlo en su bitácora con su feedback.
              </p>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[11px] border border-border bg-muted p-3.5">
                  <Clock aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
                  <p className={`${mono} mt-2 text-[22px] font-extrabold leading-none`}>
                    +{caso.horasQueAcredita} h
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                    acreditadas · lleva{" "}
                    <span className={`${mono} font-bold text-foreground`}>
                      {alumnoTotales.horas} / {alumnoTotales.horasPrograma} h
                    </span>
                  </p>
                </div>
                <div className="rounded-[11px] border border-border bg-muted p-3.5">
                  <BarChart3 aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
                  <p className={`${mono} mt-2 text-[22px] font-extrabold leading-none`}>
                    {alumnoTotales.dominioAntes} → {alumnoTotales.dominioDespues}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                    {caso.dominio} I-AIM actualizada
                  </p>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={aBiblioteca}
                  onChange={(e) => setABiblioteca(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--secondary)]"
                />
                <span className={`text-[13px] leading-relaxed ${softText}`}>
                  Enviarlo también a curaduría para la Biblioteca de casos
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
                quedan {cola.totalListos + cola.criterio.length - 1} casos en su bandeja
              </span>
              <button
                type="button"
                onClick={() => setFirmado(false)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Volver a la bandeja
              </button>
              <button
                type="button"
                onClick={() => setFirmado(false)}
                className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                Siguiente caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

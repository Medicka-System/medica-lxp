"use client";

/**
 * Campus · Autoevaluación de la lección — cuatro estados en una pantalla
 *
 *   "portada"   → qué esperar antes de que arranque el reloj (último momento de calma).
 *   "activa"    → el cuestionario, AISLADO del shell: sin menú lateral ni header del campus.
 *   "resultado" → puntaje honesto + revisión pregunta por pregunta en el mismo scroll.
 *   "acreditada"→ portada cuando ya la aprobó, con el intento anterior a la vista.
 *
 * Principios que la pantalla sostiene (de la investigación de UX para exámenes en LMS):
 *   · PROGRESO COMO ANCLA NUMÉRICA: cada pregunta abre con "01/05" a 34px en mono. Comunica
 *     "son exactamente cinco" mejor que una barra al 20%, y reduce ansiedad. El denominador va
 *     en el gris de meta (#6B7280) para que se LEA: si no se lee el total, el ancla no ancla.
 *     Para lectores de pantalla va un sr-only "Pregunta 2 de 5" — el ancla es orientación.
 *   · TIMER visible siempre pero nunca protagonista: barra sticky, arriba a la derecha.
 *   · LA TARJETA ENFOCA: una tarjeta blanca contiene todo; opciones de 52px (>44 de target).
 *   · FEEDBACK NUNCA SOLO COLOR: ícono + palabra + explicación del docente. Accesibilidad
 *     crítica para daltonismo.
 *   · CONTRATO DE JUSTICIA: opciones barajadas (`barajarOpciones`), puntaje real, revisión que
 *     deja ver lo que falló — ahí ocurre el aprendizaje— y tono amable ("A repasar", no
 *     "Incorrecta").
 *   · BOTONES CON TEXTO, nunca solo flechas.
 *
 * 5 preguntas en una sola página con scroll: el punto dulce para una autoevaluación corta
 * (una pregunta por página agrega cargas innecesarias en un cuestionario de este tamaño).
 *
 * Stubs: onComenzar · onResponder · onGuardarBorrador · onEnviar · onReintentar · onVerEnLoop ·
 *        onVolver · onSiguienteActividad
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flag,
  ListOrdered,
  Play,
  Save,
  Shield,
  Shuffle,
  Target,
  TriangleAlert,
} from "lucide-react";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoPregunta = "una" | "varias" | "abierta";

export type Opcion = { id: string; letra: string; texto: string };

export type Pregunta = {
  id: string;
  tipo: TipoPregunta;
  enunciado: string;
  puntos: number;
  opciones?: Opcion[];
  /** referencia visual del enunciado (cine-loop o imagen del estudio) */
  imagen?: { etiqueta: string; anotacion?: string; pie: string; url?: string };
  ayuda?: string;
};

export type Revision = {
  preguntaId: string;
  correcta: boolean;
  puntosObtenidos: number;
  /** se guarda el ID de la opción, no la letra: la letra depende del barajado del intento */
  suRespuestaIds?: string[];
  correctaIds?: string[];
  /** solo para abiertas, donde no hay opciones */
  suTexto?: string;
  porQue: string;
  minutoLoop?: string;
  revisadaPorDocente?: boolean;
};

export type Intento = {
  fecha: string;
  duracion: string;
  aciertos: number;
  total: number;
  porcentaje: number;
  aprobado: boolean;
  titular: string;
  resumen: string;
  revision: Revision[];
};

export type AutoevaluacionData = {
  estado: "portada" | "activa" | "resultado" | "acreditada";
  curso: { titulo: string; modulo: string; leccion: string };
  evaluacion: {
    titulo: string;
    descripcion: string;
    promesa: string;
    preguntas: Pregunta[];
    minutos: number;
    puntosTotales: number;
    umbral: number;
    intentosIlimitados: boolean;
    cuentaParaCalificacion: boolean;
    /** contrato de justicia: la posición nunca es una pista */
    barajarOpciones: boolean;
    fechaLimite: string;
  };
  enCurso?: { restante: string; contestadas: number; guardado: string };
  intento?: Intento;
  alumno: { nombre: string };
};

const LETRAS = ["A", "B", "C", "D", "E", "F"] as const;

const PREGUNTAS: Pregunta[] = [
  {
    id: "q1",
    tipo: "una",
    enunciado: "En esta imagen, ¿cómo se mide correctamente el eje corto de una estructura?",
    puntos: 1,
    imagen: {
      etiqueta: "Serie 1 · modo B",
      anotacion: "Eje corto 7.4 mm",
      pie: "Referencia técnica en modo B, de otra región a propósito: la regla de medición es la misma que aplicará en el riñón. El eje corto marcado mide 7.4 mm.",
    },
    opciones: [
      { id: "a", letra: "A", texto: "Perpendicular al eje largo y en el mismo plano." },
      { id: "b", letra: "B", texto: "En el corte donde se vea más grande, siguiendo el eje largo." },
      { id: "c", letra: "C", texto: "En dos planos distintos y se promedian las dos medidas." },
      { id: "d", letra: "D", texto: "Donde el borde se vea más nítido, sin importar el plano." },
    ],
  },
  {
    id: "q2",
    tipo: "una",
    enunciado: "¿Dónde debe medir la cortical para cerrar el grado?",
    puntos: 1,
    opciones: [
      { id: "a", letra: "A", texto: "En el polo medio, que es donde mejor se ve." },
      { id: "b", letra: "B", texto: "En los dos polos y en el mismo plano." },
      { id: "c", letra: "C", texto: "En el sitio de mayor dilatación calicial." },
      { id: "d", letra: "D", texto: "En el hilio, junto a los vasos." },
    ],
  },
  {
    id: "q3",
    tipo: "una",
    enunciado:
      "Ve una imagen anecoica en el seno renal que no comunica con los cálices. ¿Qué es lo más probable?",
    puntos: 1,
    opciones: [
      { id: "a", letra: "A", texto: "Un cáliz dilatado en fase temprana." },
      { id: "b", letra: "B", texto: "Un quiste parapiélico." },
      { id: "c", letra: "C", texto: "Un vaso hiliar sin Doppler." },
      { id: "d", letra: "D", texto: "Una pelvis extrarrenal normal." },
    ],
  },
  {
    id: "q4",
    tipo: "varias",
    enunciado: "Marque todo lo que apoya obstrucción funcional aunque no vea la litiasis.",
    puntos: 1,
    ayuda: "Puede marcar más de una.",
    opciones: [
      { id: "a", letra: "A", texto: "Jet ureteral ausente en dos exploraciones separadas." },
      { id: "b", letra: "B", texto: "Cólico del lado correspondiente." },
      { id: "c", letra: "C", texto: "Cortical adelgazada." },
      { id: "d", letra: "D", texto: "Dilatación pielocalicial con cálices comunicantes." },
    ],
  },
  {
    id: "q5",
    tipo: "abierta",
    enunciado: "En una frase: ¿cómo lo reportaría?",
    puntos: 1,
    ayuda: "Grado, lado, causa visible y espesor cortical. En ese orden.",
  },
];

const MOCK: AutoevaluacionData = {
  estado: "activa",
  alumno: { nombre: "Dra. Sofía Ramírez" },
  curso: {
    titulo: "Ultrasonografía Médica",
    modulo: "Módulo 4",
    leccion: "Interpretación renal: lectura y gradación",
  },
  evaluacion: {
    titulo: "Interpretación renal: lectura y gradación",
    descripcion:
      "Son cinco preguntas sobre cómo medir, cómo leer el seno renal y cómo se reporta el grado. No cuenta para la nota del diplomado: sirve para saber si puede seguir o conviene repasar el loop.",
    promesa:
      "Al terminar verá qué acertó, qué falló y por qué — con el minuto del loop donde se explica cada cosa.",
    preguntas: PREGUNTAS,
    minutos: 20,
    puntosTotales: 5,
    umbral: 80,
    intentosIlimitados: true,
    cuentaParaCalificacion: false,
    barajarOpciones: true,
    fechaLimite: "28 sep · 23:59",
  },
  enCurso: { restante: "12:40", contestadas: 4, guardado: "hace 40 s" },
  intento: {
    fecha: "22 de septiembre, 11:17",
    duracion: "7:20 de 20:00",
    aciertos: 4,
    total: 5,
    porcentaje: 80,
    aprobado: true,
    titular: "Mide bien y reporta bien; le falta la trampa del anecoico",
    resumen:
      "Acertó cómo medir el eje corto y dónde medir la cortical. La única que falló fue la imagen anecoica que no comunica — está explicada en el minuto 11:12.",
    revision: [
      {
        preguntaId: "q1",
        correcta: true,
        puntosObtenidos: 1,
        suRespuestaIds: ["a"],
        porQue:
          "El eje corto se mide perpendicular al eje largo y en el mismo plano. Cambiar de plano entre una medida y otra es lo que hace que un espesor —o un grado— se mueva sin que el paciente haya cambiado.",
        minutoLoop: "4:20",
      },
      {
        preguntaId: "q2",
        correcta: true,
        puntosObtenidos: 1,
        suRespuestaIds: ["b"],
        porQue:
          "Con una sola medida en el polo medio el ángulo puede engañarlo. Dos polos, mismo plano: si se sostiene, es real.",
        minutoLoop: "8:24",
      },
      {
        preguntaId: "q3",
        correcta: false,
        puntosObtenidos: 0,
        suRespuestaIds: ["b"],
        correctaIds: ["c"],
        porQue:
          "El quiste parapiélico es la respuesta esperada de memoria, pero con un anecoico en el seno lo primero es poner Doppler color: si se llena de señal, son vasos hiliares. El quiste se descarta después, por no comunicar y por su pared.",
        minutoLoop: "11:12",
      },
      {
        preguntaId: "q4",
        correcta: true,
        puntosObtenidos: 1,
        suRespuestaIds: ["a", "b"],
        porQue:
          "La ausencia sostenida de jet más el cólico apoyan obstrucción funcional. La cortical adelgazada habla de cronicidad, no de obstrucción actual.",
        minutoLoop: "17:20",
      },
      {
        preguntaId: "q5",
        correcta: true,
        puntosObtenidos: 1,
        suTexto:
          "Hidronefrosis grado III derecha, probable obstrucción ureteral distal, cortical de 7.2 mm.",
        porQue: "Su frase trae los cinco elementos y en el orden en que se dicta. Se la damos por buena.",
        revisadaPorDocente: true,
      },
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */

const mono = "font-mono tabular-nums";
const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
const softText = "text-[color:var(--foreground-soft)]";
const srOnly = "absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const trama =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

/**
 * ANCLA NUMÉRICA — el dispositivo de orientación de la pantalla.
 * El total se lee (denominador en gris de meta, no en gris de borde) y el par completo va como
 * sr-only, porque quien navega con lector también necesita saber dónde está.
 */
function AnclaPregunta({
  n,
  total,
  pendiente = false,
  tamano = 34,
}: {
  n: number;
  total: number;
  pendiente?: boolean;
  tamano?: number;
}) {
  return (
    <span className={`${mono} flex shrink-0 items-baseline gap-px leading-none`}>
      <span
        className="font-extrabold tracking-[-0.03em]"
        style={{
          fontSize: tamano,
          color: pendiente ? "var(--warning-foreground)" : "var(--sidebar)",
        }}
      >
        {String(n).padStart(2, "0")}
      </span>
      <span
        aria-hidden
        className="font-bold"
        style={{
          fontSize: Math.round(tamano * 0.44),
          color: pendiente ? "var(--warning-foreground)" : "var(--muted-foreground)",
        }}
      >
        /{String(total).padStart(2, "0")}
      </span>
      <span className={srOnly}>
        Pregunta {n} de {total}
      </span>
    </span>
  );
}

/** FEEDBACK — ícono + palabra, nunca solo color. */
function Veredicto({ correcta }: { correcta: boolean }) {
  return correcta ? (
    <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[10.5px] font-bold text-accent-foreground">
      <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
      Correcta
    </span>
  ) : (
    <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
      <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
      A repasar
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Autoevaluacion({ data = MOCK }: { data?: AutoevaluacionData }) {
  const { curso, evaluacion, enCurso, intento, alumno } = data;
  const [estado, setEstado] = useState(data.estado);
  const [respuestas, setRespuestas] = useState<Record<string, string | string[]>>({
    q1: "a",
    q2: "b",
    q3: "b",
    q4: ["a", "b"],
  });
  const [honor, setHonor] = useState(true);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onComenzar = () => setEstado("activa");
  const onResponder = (id: string, valor: string | string[]) =>
    setRespuestas((r) => ({ ...r, [id]: valor }));
  const onGuardarBorrador = () => {};
  const onEnviar = () => setEstado("resultado");
  const onReintentar = () => setEstado("activa");
  const onVerEnLoop = (_minuto?: string) => {};
  const onVolver = () => {};
  const onSiguienteActividad = () => {};
  /* ──────────────────────────────────────────────────────── */

  /**
   * BARAJADO — contrato de justicia: la posición nunca es una pista.
   * Fisher–Yates con PRNG sembrado por intento (mulberry32), así que el orden es estable
   * mientras el intento vive —sobrevive a cada render— y distinto en el siguiente intento.
   */
  const semilla = intento?.fecha ?? "intento-1";
  const preguntas = useMemo(() => {
    if (!evaluacion.barajarOpciones) return evaluacion.preguntas;

    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    const prng = (estado0: number) => () => {
      let t = (estado0 += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return evaluacion.preguntas.map((p) => {
      if (!p.opciones) return p;
      const rnd = prng(hash(semilla + "·" + p.id));
      const orden = [...p.opciones];
      for (let i = orden.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [orden[i], orden[j]] = [orden[j], orden[i]];
      }
      /* la letra la da la POSICIÓN de este intento, no el id de la opción */
      return { ...p, opciones: orden.map((o, i) => ({ ...o, letra: LETRAS[i] })) };
    });
  }, [evaluacion.preguntas, evaluacion.barajarOpciones, semilla]);

  /** La revisión cita la letra que el alumno vio: se deriva del orden de ESE intento. */
  const letraDe = (preguntaId: string, opcionId: string) => {
    const p = preguntas.find((x) => x.id === preguntaId);
    const i = p?.opciones?.findIndex((o) => o.id === opcionId) ?? -1;
    return i >= 0 ? LETRAS[i] : "";
  };
  const citar = (preguntaId: string, ids: string[]) => {
    const p = preguntas.find((x) => x.id === preguntaId);
    if (!p?.opciones) return "";
    const elegidas = ids
      .map((id) => p.opciones!.find((o) => o.id === id))
      .filter((o): o is Opcion => !!o);
    if (elegidas.length === 0) return "Sin contestar";
    if (elegidas.length === 1) return `${letraDe(preguntaId, elegidas[0].id)} · ${elegidas[0].texto}`;
    return elegidas.map((o) => letraDe(preguntaId, o.id)).join(" y ");
  };

  const contestadas = enCurso?.contestadas ?? 0;
  const total = evaluacion.preguntas.length;

  /* ═══════════════════ PORTADA / ACREDITADA ═══════════════════ */
  if (estado === "portada" || estado === "acreditada") {
    const acreditada = estado === "acreditada";
    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_286px]">
          <section
            className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
            style={{ background: acreditada ? "var(--secondary)" : "var(--sidebar)" }}
          >
            <div aria-hidden className="absolute inset-0" style={{ background: trama }} />
            <div className="relative">
              {acreditada && intento ? (
                <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.8} />
                  Acreditada · {intento.porcentaje}%
                </span>
              ) : (
                <span className={`${kicker} text-primary`}>
                  Autoevaluación · no cuenta para su calificación
                </span>
              )}

              <h1
                className="mt-3.5 text-[26px] font-extrabold leading-tight tracking-[-0.025em]"
                style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
              >
                {evaluacion.titulo}
              </h1>
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
                {curso.modulo} · {curso.leccion.split(":")[0]} · punto de control
              </p>

              <p
                className="mt-4 max-w-[62ch] text-[14px] leading-relaxed"
                style={{ color: "var(--hero-ink-muted)", textWrap: "pretty" }}
              >
                {evaluacion.descripcion}
              </p>
              <p
                className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-muted)" }}
              >
                {evaluacion.promesa}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onComenzar}
                  className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  {acreditada ? "Volver a intentar" : "Comenzar"}
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => onVerEnLoop()}
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-white/30 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                >
                  <BookOpen aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Repasar la lección
                </button>
                {acreditada && (
                  <button
                    type="button"
                    onClick={() => setEstado("resultado")}
                    className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] px-3.5 text-[13.5px] font-semibold text-white/80 transition-colors hover:text-white"
                  >
                    Ver el intento anterior
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Qué esperar: el último momento de calma antes del reloj */}
          <aside className="rounded-xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <p className="text-[12.5px] font-bold">Qué esperar</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {(
                [
                  [ListOrdered, `${total} preguntas · ${evaluacion.puntosTotales} puntos`],
                  [Clock, `${evaluacion.minutos} minutos`],
                  [Target, `${evaluacion.umbral}% para aprobar`],
                  [Shuffle, "Las opciones cambian de orden en cada intento"],
                  [CalendarDays, `Abierta hasta el ${evaluacion.fechaLimite.split(" ·")[0]}`],
                ] as const
              ).map(([Icono, texto]) => (
                <li key={texto} className="flex items-start gap-2.5">
                  <Icono
                    aria-hidden
                    className="mt-px h-[15px] w-[15px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${softText}`}>
                    {texto}
                  </span>
                </li>
              ))}
              {evaluacion.intentosIlimitados && (
                <li className="flex items-start gap-2.5">
                  <Shuffle
                    aria-hidden
                    className="mt-px h-[15px] w-[15px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${softText}`}>
                    Intentos ilimitados
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-3.5 border-t border-border pt-3.5 text-[11.5px] leading-relaxed text-muted-foreground">
              No cuenta para la calificación del diplomado. El reloj corre mientras la tenga abierta.
            </p>
          </aside>
        </div>
      </div>
    );
  }

  /* ═══════════════════ RESULTADO + REVISIÓN ═══════════════════ */
  if (estado === "resultado" && intento) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <section
          className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
          style={{ background: "var(--sidebar)" }}
        >
          <div aria-hidden className="absolute inset-0" style={{ background: trama }} />
          <div className="relative flex flex-wrap items-center gap-6">
            <span className="flex shrink-0 flex-col items-center">
              <span
                className={`${mono} text-[54px] font-extrabold leading-none tracking-[-0.03em]`}
                style={{ color: "var(--hero-ink)" }}
              >
                {intento.porcentaje}%
              </span>
              <span className={`${mono} mt-1.5 text-[12px]`} style={{ color: "var(--hero-ink-muted)" }}>
                {intento.aciertos} de {intento.total}
              </span>
            </span>

            <div className="min-w-[260px] flex-1">
              <p className="m-0 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.8} />
                {intento.aprobado ? "Aprobado" : "Conviene repasar"}
              </p>
              <h1
                className="mt-3.5 text-[25px] font-extrabold leading-tight tracking-[-0.02em]"
                style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
              >
                {intento.titular}
              </h1>
              <p
                className="mt-2.5 max-w-[56ch] text-[13.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-muted)" }}
              >
                {intento.resumen}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSiguienteActividad}
                  className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  Siguiente actividad
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={onReintentar}
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-white/30 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                >
                  Volver a intentar
                </button>
                <a
                  href="#revision"
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] px-3.5 text-[13.5px] font-semibold no-underline transition-colors hover:text-white"
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  <ChevronDown aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                  Revisar respuesta por respuesta
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Revisión: aquí ocurre el aprendizaje */}
        <section
          id="revision"
          className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
          style={{ scrollMarginTop: 24 }}
        >
          <div className="flex flex-wrap items-center gap-3.5 border-b border-border bg-muted px-7 py-4">
            <p className={`${kicker} text-muted-foreground`}>Respuesta por respuesta</p>
            <span className="flex items-center gap-2">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
                {intento.aciertos} correctas
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                {intento.total - intento.aciertos} a repasar
              </span>
            </span>
            <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
              enviada el {intento.fecha} · {intento.duracion}
            </span>
          </div>

          <ul>
            {intento.revision.map((rev, i) => {
              const p = preguntas.find((x) => x.id === rev.preguntaId)!;
              return (
                <li key={rev.preguntaId} className={i ? "border-t border-border" : ""}>
                  <article className="flex gap-5 p-7">
                    <AnclaPregunta n={i + 1} total={total} pendiente={!rev.correcta} tamano={30} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Veredicto correcta={rev.correcta} />
                        {rev.revisadaPorDocente && (
                          <span
                            className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold ${softText}`}
                          >
                            Revisada por su docente
                          </span>
                        )}
                        <span className={`${mono} ml-auto text-[11px] font-bold text-muted-foreground`}>
                          {rev.puntosObtenidos} / {p.puntos}
                        </span>
                      </div>

                      <p
                        className="mt-3 text-[15px] font-bold leading-snug"
                        style={{ textWrap: "pretty" }}
                      >
                        {p.enunciado}
                      </p>

                      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                        <div
                          className={`rounded-[11px] border p-3.5 ${
                            rev.correcta
                              ? "border-transparent bg-accent"
                              : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          }`}
                        >
                          <p
                            className={`${kicker} ${
                              rev.correcta ? "text-accent-foreground" : "text-[color:var(--warning-foreground)]"
                            }`}
                          >
                            Su respuesta
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed">
                            {rev.suTexto ?? citar(rev.preguntaId, rev.suRespuestaIds ?? [])}
                          </p>
                        </div>

                        {rev.correctaIds && rev.correctaIds.length > 0 && (
                          <div className="rounded-[11px] border border-transparent bg-accent p-3.5">
                            <p className={`${kicker} text-accent-foreground`}>La correcta</p>
                            <p className="mt-1.5 text-[13px] font-semibold leading-relaxed">
                              {citar(rev.preguntaId, rev.correctaIds)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3.5">
                        <p className={`${kicker} tracking-[0.08em] text-muted-foreground`}>Por qué</p>
                        <p
                          className={`mt-1.5 text-[13px] leading-[1.65] ${softText}`}
                          style={{ textWrap: "pretty" }}
                        >
                          {rev.porQue}
                        </p>
                        {rev.minutoLoop && (
                          <button
                            type="button"
                            onClick={() => onVerEnLoop(rev.minutoLoop)}
                            className={`mt-2.5 inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                          >
                            <Play aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Verlo en el loop · <span className={mono}>{rev.minutoLoop}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  /* ═══════════════════ CUESTIONARIO (aislado) ═══════════════════ */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* barra propia: es la única salida y lleva el reloj siempre a la vista */}
      <header className="sticky top-0 z-[5] flex h-16 shrink-0 items-center gap-5 border-b border-border bg-card px-6">
        <button
          type="button"
          onClick={onVolver}
          className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] py-0 pl-2 pr-3 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          Volver
        </button>
        <span aria-hidden className="h-[26px] w-px shrink-0 bg-border" />

        <span className="flex min-w-0 flex-col leading-[1.25]">
          <span className="truncate text-[14.5px] font-bold">{curso.leccion}</span>
          <span className="truncate text-[11.5px] text-muted-foreground">
            Autoevaluación · no cuenta para su calificación · {total} preguntas ·{" "}
            {evaluacion.minutos} min
          </span>
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-[18px]">
          <span
            role="timer"
            aria-live="off"
            className={`${mono} inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-3.5 text-[14px] font-bold text-accent-foreground`}
          >
            <Clock aria-hidden className="h-4 w-4" strokeWidth={2} />
            {enCurso?.restante}
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <CalendarDays aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-[12.5px] font-semibold">Fecha límite</span>
            <span className={`${mono} text-[12.5px] text-muted-foreground`}>
              {evaluacion.fechaLimite}
            </span>
          </span>
        </span>
      </header>

      <div className="mx-auto w-full max-w-[880px] px-5 py-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
          {/* fila de utilidades: instrucciones + progreso. Sin repetir el título de la barra. */}
          <div className="sticky top-16 z-[3] flex items-center gap-3.5 border-b border-border bg-card px-7 py-3.5">
            <button
              type="button"
              className={`inline-flex h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ListOrdered aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              Instrucciones
            </button>
            <span className="min-w-0 flex-1" />
            <span className="flex shrink-0 items-center gap-2.5">
              <span
                className="h-1.5 w-[132px] overflow-hidden rounded-full bg-[color:var(--track)]"
                role="progressbar"
                aria-valuenow={contestadas}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label="Preguntas contestadas"
              >
                <span
                  aria-hidden
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(contestadas / total) * 100}%` }}
                />
              </span>
              <span className={`${mono} whitespace-nowrap text-[11.5px] font-bold text-muted-foreground`}>
                {contestadas} de {total} contestadas
              </span>
            </span>
          </div>

          {/* preguntas: la tarjeta enfoca, el ancla orienta */}
          {preguntas.map((p, i) => {
            const contestada = respuestas[p.id] !== undefined;
            const marcada = (o: Opcion) =>
              Array.isArray(respuestas[p.id])
                ? (respuestas[p.id] as string[]).includes(o.id)
                : respuestas[p.id] === o.id;

            return (
              <article key={p.id} className="border-t border-border px-7 py-6">
                <div className="flex items-start gap-3.5">
                  <AnclaPregunta n={i + 1} total={total} pendiente={!contestada} />
                  <div className="min-w-0 flex-1">
                    <p
                      id={`${p.id}-enunciado`}
                      className="text-[16px] font-bold leading-[1.45]"
                      style={{ textWrap: "pretty" }}
                    >
                      {p.enunciado}
                    </p>
                    {p.ayuda && (
                      <p className="mt-1.5 text-[12px] text-muted-foreground">{p.ayuda}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold ${
                      contestada
                        ? `border-border bg-muted ${softText}`
                        : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                    }`}
                  >
                    {contestada ? `${p.puntos} punto` : "Sin contestar"}
                  </span>
                </div>

                {/* referencia visual del enunciado */}
                {p.imagen && (
                  <figure className="mt-4">
                    <div
                      className="relative grid w-full place-items-center overflow-hidden rounded-xl"
                      style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
                    >
                      {p.imagen.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagen.url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span aria-hidden className="absolute inset-0" style={{ background: trama }} />
                      )}
                      {p.imagen.anotacion && (
                        <span
                          className="absolute left-1/3 top-1/2 inline-flex items-center gap-1.5"
                          aria-hidden
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: "var(--info)",
                              boxShadow: "0 0 0 3px rgba(15,45,82,.55)",
                            }}
                          />
                          <span
                            className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold text-white"
                            style={{ background: "rgba(15,45,82,.9)", borderColor: "var(--info)" }}
                          >
                            {p.imagen.anotacion}
                          </span>
                        </span>
                      )}
                      <span
                        className={`${mono} absolute bottom-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
                        style={{ background: "rgba(15,45,82,.85)" }}
                      >
                        {p.imagen.etiqueta}
                      </span>
                    </div>
                    <figcaption className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                      {p.imagen.pie}
                    </figcaption>
                  </figure>
                )}

                {/* opciones: 52px, generosas para tap */}
                {p.opciones ? (
                  <div
                    role={p.tipo === "varias" ? "group" : "radiogroup"}
                    aria-labelledby={`${p.id}-enunciado`}
                    className="mt-4 flex flex-col gap-2"
                  >
                    {p.opciones.map((o) => {
                      const on = marcada(o);
                      return (
                        <label
                          key={o.id}
                          className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-3.5 py-3.5 transition-colors ${
                            on ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                          }`}
                        >
                          <input
                            type={p.tipo === "varias" ? "checkbox" : "radio"}
                            name={p.id}
                            checked={on}
                            onChange={() =>
                              onResponder(
                                p.id,
                                p.tipo === "varias"
                                  ? on
                                    ? (respuestas[p.id] as string[]).filter((x) => x !== o.id)
                                    : [...((respuestas[p.id] as string[]) ?? []), o.id]
                                  : o.id,
                              )
                            }
                            className={`mt-0.5 h-[22px] w-[22px] shrink-0 accent-[color:var(--secondary)] ${focusRing}`}
                          />
                          <span
                            className={`min-w-0 flex-1 text-[14px] leading-relaxed ${
                              on ? "font-semibold" : "font-normal"
                            }`}
                          >
                            <span
                              className={`mr-2 font-bold ${on ? "text-accent-foreground" : "text-muted-foreground"}`}
                            >
                              {o.letra}
                            </span>
                            {o.texto}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <label className="mt-4 block">
                    <span className={srOnly}>{p.enunciado}</span>
                    <textarea
                      rows={3}
                      value={(respuestas[p.id] as string) ?? ""}
                      onChange={(e) => onResponder(p.id, e.target.value)}
                      placeholder="Grado, lado, causa visible y espesor cortical…"
                      className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground"
                    />
                  </label>
                )}
              </article>
            );
          })}

          {/* código de honor + envío */}
          <div className="border-t border-border bg-muted px-7 pb-6 pt-6">
            <section
              aria-labelledby="honor-titulo"
              className="rounded-xl border border-border bg-card px-5 py-[18px]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
                >
                  <Shield className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p id="honor-titulo" className="min-w-0 flex-1 text-[14px] font-bold">
                  Código de honor del Campus
                </p>
              </div>
              <p
                className={`mt-3 max-w-[74ch] text-[13px] leading-[1.65] ${softText}`}
                style={{ textWrap: "pretty" }}
              >
                Al enviar confirma que contestó por su cuenta, con lo que estudió en el módulo. En un
                programa clínico esto no es un trámite: la competencia que se acredita aquí se traduce
                en decisiones sobre pacientes. Resolverla con ayuda externa —o con un asistente de
                IA— desvirtúa el diagnóstico de su propio nivel y puede derivar en la baja del
                programa, según la{" "}
                <a href="#" className="font-semibold text-secondary">
                  política de integridad académica
                </a>
                .
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={honor}
                  onChange={(e) => setHonor(e.target.checked)}
                  className={`mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--secondary)] ${focusRing}`}
                />
                <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
                  Yo, <span className="font-bold">{alumno.nombre}</span>, lo entiendo y lo acepto.
                </span>
              </label>
              <p className="ml-8 mt-2 text-[11.5px] text-muted-foreground">
                Debe aceptarlo para poder enviar la autoevaluación.
              </p>
            </section>

            <div className="mt-[18px] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnviar}
                disabled={!honor}
                className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
              >
                Enviar y ver resultado
                <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onGuardarBorrador}
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-border bg-card px-3.5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Save aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Guardar y seguir después
              </button>
              <span className="ml-auto flex flex-wrap items-center gap-2.5">
                {contestadas < total && (
                  <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                    Falta la {contestadas + 1}
                  </span>
                )}
                <span className={`${mono} whitespace-nowrap text-[11.5px] text-muted-foreground`}>
                  guardado {enCurso?.guardado}
                </span>
              </span>
            </div>

            <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
              El reloj corre mientras tiene la evaluación abierta. Si se agota, se envía lo
              contestado; puede enviar con preguntas en blanco —cuentan como incorrectas— y tiene
              intentos ilimitados.
            </p>

            <div className="mt-[18px] flex items-center gap-[18px] border-t border-border pt-4">
              <button
                type="button"
                className={`inline-flex h-[34px] items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
              >
                <Flag aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Informar de un problema
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

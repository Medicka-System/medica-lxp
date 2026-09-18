"use client";

/**
 * Simuladores · entrenamiento con IA — Campus Virtual · Médica Capacitación (LXP)
 *
 * Entrenadores que usan el banco de casos YA VALIDADOS por los docentes. Dos tipos:
 *   · interpretación — el caso sin diagnóstico; el médico lee y concluye, el tutor compara
 *     contra la verdad del caso (aciertos / omisiones / precisiones) y explica el porqué.
 *   · reporte — el estudio completo; el médico redacta y el tutor revisa estructura, medidas,
 *     omisiones, redacción e impresión (reusa el patrón de Mis reportes en modo práctica).
 *
 * Cada sesión registra resultado → competencia I-AIM + repaso espaciado.
 *
 * NO hay IA ni lógica de evaluación: el feedback y los puntajes son MOCK tipados por props.
 * Tono: entrenar con un mentor, no rendir un examen (barra de progreso, pausa, pista declarada).
 *
 * Stubs: onIniciarSimulacion · onEnviarRespuesta · onSiguienteCaso · onFiltrar · onPedirPista
 */

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoSim = "interpretacion" | "reporte";
export type Dificultad = "Básico" | "Intermedio" | "Avanzado";

export type CasoSim = {
  id: string;
  titulo: string;
  area: string;
  dificultad: Dificultad;
  portada: string;
  piezas: number;
  historial: string;
  sugerido?: boolean;
};

export type Repaso = { tema: string; cuando: string; hoy?: boolean };

export type Desempeno = { etiqueta: string; pct: number; tono: "bien" | "aviso" | "neutro" };

export type FeedbackItem = { titulo: string; detalle: string };

export type SesionInterpretacion = {
  tipo: "interpretacion";
  caso: CasoSim;
  paso: number;
  total: number;
  acertados: number;
  fallados: number;
  tiempo: string;
  vineta: string;
  piezas: string[];
  /** Respuesta ya escrita por el alumno (mock). */
  respuesta: { hallazgos: string; impresion: string; seguridad: "Poco" | "Algo" | "Mucho" };
  /** Evaluación del tutor (mock). */
  feedback: {
    puntaje: number;
    titular: string;
    resumen: string;
    marcadores: [string, string][];
    aciertos: FeedbackItem[];
    omisiones: FeedbackItem[];
    precisiones: FeedbackItem[];
    lecturaDocente: string;
    diagnostico: string;
    competencia: { dominio: string; antes: number; despues: number }[];
    repasoProgramado: { tema: string; enDias: number };
  };
};

export type SesionReporte = {
  tipo: "reporte";
  paso: number;
  total: number;
  tiempo: string;
  enunciado: string;
  piezas: string[];
  secciones: { titulo: string; estado: "listo" | "falta" | "vacio"; texto: string }[];
  avisos: { texto: string; tono: "bien" | "aviso" }[];
  criterios: [string, string][];
};

export type SimuladoresData = {
  practicados: number;
  ultimaSesion: string;
  desempeno: Desempeno[];
  repasos: Repaso[];
  disponibles: { interpretacion: number; reporte: number };
  areas: string[];
  casos: CasoSim[];
  sesionInterpretacion: SesionInterpretacion;
  sesionReporte: SesionReporte;
};

const MOCK: SimuladoresData = {
  practicados: 86,
  ultimaSesion:
    "Sesión más reciente: hidronefrosis grado II, hace dos días. El tutor le sugirió repasar medición cortical.",
  desempeno: [
    { etiqueta: "Aciertos en lectura", pct: 78, tono: "bien" },
    { etiqueta: "Omisiones", pct: 14, tono: "aviso" },
    { etiqueta: "Confusiones", pct: 8, tono: "neutro" },
  ],
  repasos: [
    { tema: "Medición de cortical renal", cuando: "toca hoy", hoy: true },
    { tema: "Jet ureteral y obstrucción", cuando: "en 2 días" },
    { tema: "Ventana subcostal del hígado", cuando: "en 5 días" },
  ],
  disponibles: { interpretacion: 124, reporte: 68 },
  areas: ["Todas las áreas", "Renal", "Obstétrico", "Hígado", "Doppler", "MSK"],
  casos: [
    {
      id: "s1",
      titulo: "Dilatación pielocalicial: ¿grado II o III?",
      area: "Renal",
      dificultad: "Intermedio",
      portada: "riñón derecho · longitudinal",
      piezas: 6,
      historial: "Practicado 2 veces · mejor 82",
      sugerido: true,
    },
    {
      id: "s2",
      titulo: "Vesícula dolorosa en urgencias",
      area: "Hígado y vía biliar",
      dificultad: "Básico",
      portada: "vesícula · transversal",
      piezas: 4,
      historial: "Sin practicar",
    },
    {
      id: "s3",
      titulo: "Doppler venoso con compresión dudosa",
      area: "Doppler",
      dificultad: "Avanzado",
      portada: "femoral común · color",
      piezas: 5,
      historial: "Practicado 1 vez · 64",
    },
    {
      id: "s4",
      titulo: "Biometría fetal del segundo trimestre",
      area: "Obstétrico",
      dificultad: "Básico",
      portada: "fémur · biometría",
      piezas: 8,
      historial: "Sin practicar",
    },
    {
      id: "s5",
      titulo: "Apéndice en paciente delgado",
      area: "Abdomen",
      dificultad: "Intermedio",
      portada: "fosa iliaca derecha",
      piezas: 5,
      historial: "Practicado 3 veces · mejor 91",
    },
    {
      id: "s6",
      titulo: "Nódulo tiroideo con microcalcificaciones",
      area: "Cuello",
      dificultad: "Avanzado",
      portada: "lóbulo derecho",
      piezas: 3,
      historial: "Sin practicar",
    },
  ],
  sesionInterpretacion: {
    tipo: "interpretacion",
    caso: {
      id: "s1",
      titulo: "Dilatación pielocalicial: ¿grado II o III?",
      area: "Renal",
      dificultad: "Intermedio",
      portada: "riñón derecho · longitudinal",
      piezas: 6,
      historial: "Practicado 2 veces",
    },
    paso: 3,
    total: 5,
    acertados: 2,
    fallados: 0,
    tiempo: "04:12",
    vineta:
      "Mujer de 46 años, dolor lumbar derecho de tres días tipo cólico, con náusea. Sin fiebre. Creatinina normal, microhematuria en el examen de orina. Le piden ultrasonido renal y de vías urinarias.",
    piezas: [
      "long. der",
      "transv. der",
      "izquierdo",
      "vejiga",
      "uréter",
      "doppler",
    ],
    respuesta: {
      hallazgos:
        "Riñón derecho con dilatación de cálices y pelvis. La cortical se ve conservada. No identifico jet ureteral derecho. Riñón izquierdo normal.",
      impresion: "Hidronefrosis derecha, probablemente obstructiva",
      seguridad: "Algo",
    },
    feedback: {
      puntaje: 82,
      titular: "Buena lectura: vio la dilatación y midió la cortical.",
      resumen:
        "Le faltó cerrar la causa. Con un paso más —buscar el lito en el uréter distal— su reporte queda completo.",
      marcadores: [
        ["Hallazgos", "4/5"],
        ["Impresión", "parcial"],
        ["Ayuda", "sin pistas"],
      ],
      aciertos: [
        {
          titulo: "Identificó la dilatación pielocalicial derecha",
          detalle:
            "La describió con los cálices comunicando con la pelvis, que es justo lo que distingue hidronefrosis de quistes.",
        },
        {
          titulo: "Midió la cortical",
          detalle: "Buen reflejo: sin ese dato no se puede graduar ni hablar de cronicidad.",
        },
        {
          titulo: "Reconoció la ausencia de jet ureteral",
          detalle: "Lo anotó como hallazgo, no como impresión. Correcto.",
        },
        {
          titulo: "Comparó con el riñón contralateral",
          detalle: "Siempre da contexto y evita sobreinterpretar.",
        },
      ],
      omisiones: [
        {
          titulo: "No buscó el lito en el uréter distal",
          detalle:
            "Había una imagen ecogénica de 6 mm con sombra acústica en la pieza 5. Ahí estaba la causa.",
        },
        {
          titulo: "No graduó la hidronefrosis",
          detalle:
            "Dijo que había dilatación, pero no si era grado II o III. El grado cambia la conducta.",
        },
      ],
      precisiones: [
        {
          titulo: '"Probablemente obstructiva" se queda corto',
          detalle:
            "Con jet ausente sostenido y cólico, puede afirmar obstrucción y decir por qué. La duda solo va cuando el dato falta.",
        },
      ],
      lecturaDocente:
        "Riñón derecho con dilatación pielocalicial moderada, cálices mayores redondeados y cortical de 14 mm conservada en ambos polos. Jet ureteral derecho ausente en dos observaciones. Imagen ecogénica de 6 mm en uréter distal con sombra acústica y centelleo en Doppler color.",
      diagnostico: "Hidronefrosis grado III derecha por litiasis ureteral distal obstructiva.",
      competencia: [
        { dominio: "Interpretación", antes: 71, despues: 74 },
        { dominio: "Decisión", antes: 63, despues: 63 },
      ],
      repasoProgramado: { tema: "litiasis en uréter distal", enDias: 3 },
    },
  },
  sesionReporte: {
    tipo: "reporte",
    paso: 2,
    total: 3,
    tiempo: "09:38",
    enunciado:
      "Hombre de 52 años, dolor en hipocondrio derecho posprandial de dos semanas. Ultrasonido abdominal completo, nueve piezas. Escriba el reporte como lo entregaría.",
    piezas: ["vesícula", "colédoco", "hígado", "porta", "riñón der", "riñón izq", "bazo", "aorta", "vejiga"],
    secciones: [
      {
        titulo: "Hígado y vía biliar",
        estado: "listo",
        texto:
          "Hígado de tamaño normal, ecogenicidad homogénea. Vesícula con pared engrosada de 5 mm y un lito de 12 mm en su interior, móvil. Colédoco de 4 mm.",
      },
      {
        titulo: "Riñones y vía urinaria",
        estado: "listo",
        texto: "Riñones de forma y tamaño normales, sin dilatación. Cortical conservada.",
      },
      { titulo: "Bazo, páncreas y grandes vasos", estado: "falta", texto: "" },
      { titulo: "Impresión diagnóstica", estado: "falta", texto: "" },
    ],
    avisos: [
      { texto: "Le falta medir el colédoco en el plano correcto", tono: "aviso" },
      { texto: "Describió el lito con tamaño y movilidad: eso se reporta así", tono: "bien" },
      { texto: "Todavía no menciona el páncreas", tono: "aviso" },
      { texto: "Cierre con impresión diagnóstica, no solo hallazgos", tono: "aviso" },
    ],
    criterios: [
      ["Estructura", "que estén todas las secciones"],
      ["Medidas", "con unidad, plano y lado"],
      ["Omisiones", "lo que no mencionó"],
      ["Redacción", "claridad y orden"],
      ["Impresión", "que cierre la conducta"],
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

const claseNivel: Record<Dificultad, string> = {
  Básico: "bg-accent text-accent-foreground",
  Intermedio: "border border-border bg-muted text-[color:var(--foreground-soft)]",
  Avanzado:
    "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
};

function Portada({
  etiqueta,
  alto,
  badge,
  esquina,
}: {
  etiqueta: string;
  alto: number;
  badge?: string;
  esquina?: string;
}) {
  return (
    <div
      aria-hidden
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ height: alto, background: "var(--wave-0)" }}
    >
      <div className="absolute inset-0" style={{ background: rayas }} />
      <span
        className={`relative ${mono} px-3 text-center text-[9.5px] uppercase tracking-[0.14em]`}
        style={{ color: "var(--hero-ink-muted)" }}
      >
        {etiqueta}
      </span>
      {esquina && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2.5 py-[3px] text-[10.5px] font-bold text-[color:var(--sidebar)]">
          {esquina}
        </span>
      )}
      {badge && (
        <span
          className={`absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/** Barra de entrenamiento: progreso con puntos, tiempo y pausa. No encabezado de examen. */
function BarraSesion({
  rotulo,
  caso,
  paso,
  total,
  extra,
  tiempo,
  onSalir,
}: {
  rotulo: string;
  caso: string;
  paso: number;
  total: number;
  extra: string;
  tiempo: string;
  onSalir: () => void;
}) {
  return (
    <div className={`${card} flex flex-wrap items-center gap-4 px-5 py-3.5`}>
      <button
        type="button"
        onClick={onSalir}
        aria-label="Salir del entrenamiento"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
      </button>
      <div className="min-w-0">
        <p className={`${kicker} text-secondary`}>{rotulo}</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug">{caso}</p>
      </div>
      <div className="flex min-w-[180px] flex-1 items-center gap-2.5">
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
            <span
              key={i}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: i === paso ? 28 : 10,
                background:
                  i < paso ? "var(--primary)" : i === paso ? "var(--secondary)" : "var(--track)",
              }}
            />
          ))}
        </span>
        <span className={`${mono} text-[12px] text-muted-foreground`}>{extra}</span>
      </div>
      <span
        className={`inline-flex h-[38px] items-center gap-2 rounded-full bg-muted px-3.5 text-[12.5px] font-semibold ${softText}`}
      >
        <Clock aria-hidden className="h-[15px] w-[15px] text-muted-foreground" strokeWidth={1.75} />
        <span className={mono}>{tiempo}</span>
      </span>
      <button
        type="button"
        className={`h-11 rounded-full border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        Pausar
      </button>
    </div>
  );
}

/* ═══════════════════ SESIÓN · INTERPRETACIÓN ═══════════════════ */

const BLOQUES = {
  aciertos: {
    titulo: "Lo que acertó",
    caja: "bg-accent",
    tinta: "text-accent-foreground",
    punto: "bg-primary",
    icono: Check,
    iconoCaja: "bg-primary text-[color:var(--sidebar)]",
  },
  omisiones: {
    titulo: "Lo que omitió",
    caja: "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]",
    tinta: "text-[color:var(--warning-foreground)]",
    punto: "bg-[color:var(--warning)]",
    icono: AlertCircle,
    iconoCaja: "bg-[color:var(--warning)] text-white",
  },
  precisiones: {
    titulo: "Lo que conviene precisar",
    caja: "border border-[color:var(--info-border)] bg-[color:var(--info-surface)]",
    tinta: "text-[color:var(--info-foreground)]",
    punto: "bg-[color:var(--info)]",
    icono: AlertCircle,
    iconoCaja: "bg-[color:var(--info)] text-white",
  },
} as const;

function BloqueFeedback({
  tipo,
  items,
}: {
  tipo: keyof typeof BLOQUES;
  items: FeedbackItem[];
}) {
  const b = BLOQUES[tipo];
  const Icono = b.icono;
  return (
    <section className={`rounded-xl p-5 ${b.caja}`}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${b.iconoCaja}`}>
          <Icono className="h-[15px] w-[15px]" strokeWidth={2.4} />
        </span>
        <p className={`text-[14.5px] font-extrabold tracking-[-0.01em] ${b.tinta}`}>{b.titulo}</p>
        <span className={`${mono} ml-auto text-[12px] font-bold ${b.tinta}`}>{items.length}</span>
      </div>
      <ul className="mt-3.5 flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.titulo} className="flex gap-3">
            <span aria-hidden className={`mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${b.punto}`} />
            <span className="min-w-0">
              <span className="block text-[14px] font-bold leading-snug">{i.titulo}</span>
              <span className={`mt-0.5 block text-[13.5px] leading-relaxed ${softText}`}>
                {i.detalle}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SesionInterpretacionVista({
  sesion,
  onSalir,
}: {
  sesion: SesionInterpretacion;
  onSalir: () => void;
}) {
  const [pieza, setPieza] = useState(0);
  const [hallazgos, setHallazgos] = useState(sesion.respuesta.hallazgos);
  const [impresion, setImpresion] = useState(sesion.respuesta.impresion);
  const [seguridad, setSeguridad] = useState(sesion.respuesta.seguridad);
  const [enviado, setEnviado] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onEnviarRespuesta = () => setEnviado(true);
  const onSiguienteCaso = () => setEnviado(false);
  const onPedirPista = () => {};
  /* ──────────────────────────────────────────────────────── */

  const f = sesion.feedback;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <BarraSesion
        rotulo={enviado ? "Simulador de interpretación · resultado" : "Simulador de interpretación"}
        caso={`Caso ${sesion.paso} de ${sesion.total} · ${sesion.caso.area}`}
        paso={sesion.paso}
        total={sesion.total}
        extra={`${sesion.acertados} acertados · ${sesion.fallados} fallados`}
        tiempo={sesion.tiempo}
        onSalir={onSalir}
      />

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-5">
          {!enviado ? (
            <>
              <div className={`${card} overflow-hidden`}>
                <div
                  aria-hidden
                  className="relative grid h-[280px] place-items-center sm:h-[420px]"
                  style={{ background: "var(--wave-0)" }}
                >
                  <div className="absolute inset-0" style={{ background: rayas }} />
                  <span
                    className={`relative ${mono} px-3 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    visor DICOM · {sesion.piezas[pieza]}
                  </span>
                  <span
                    className={`absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${mono}`}
                    style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
                  >
                    cine-loop · 34 cuadros
                  </span>
                  <span
                    className={`absolute bottom-3.5 left-3.5 ${mono} text-[10px] leading-[1.7]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    <span className="block">C 3.5 MHz · Prof. 15 cm</span>
                    <span className="block">sin diagnóstico a la vista</span>
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto border-t border-border p-3.5">
                  {sesion.piezas.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPieza(i)}
                      aria-current={i === pieza}
                      className={`relative grid h-[62px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-[9px] border-2 ${focusRing} ${
                        i === pieza ? "border-primary" : "border-transparent"
                      }`}
                      style={{ background: "var(--wave-0)" }}
                    >
                      <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                      <span
                        className={`relative ${mono} text-center text-[7px] uppercase tracking-[0.08em]`}
                        style={{ color: "var(--hero-ink-muted)" }}
                      >
                        {p}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Viñeta clínica</p>
                <p className={`mt-3 text-[14.5px] leading-[1.7] ${softText}`}>{sesion.vineta}</p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {["I-AIM Interpretación", sesion.caso.dificultad, `${sesion.caso.piezas} piezas`].map(
                    (t) => (
                      <span
                        key={t}
                        className={`inline-flex h-[26px] items-center rounded-full border border-border bg-muted px-3 text-[11.5px] font-semibold ${softText}`}
                      >
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* resultado: la frase manda, el puntaje acompaña */}
              <section
                className="relative overflow-hidden rounded-2xl p-6"
                style={{ background: "var(--secondary)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)",
                  }}
                />
                <div className="relative flex flex-wrap items-center gap-7">
                  <div className="flex items-end gap-2.5">
                    <span
                      className={`${mono} text-[50px] font-extrabold leading-none tracking-[-0.03em]`}
                      style={{ color: "var(--hero-ink)" }}
                    >
                      {f.puntaje}
                    </span>
                    <span
                      className={`${mono} pb-1.5 text-[15px] font-semibold`}
                      style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
                    >
                      / 100
                    </span>
                  </div>
                  <div className="min-w-[300px] flex-1 basis-[300px]">
                    <p
                      className="text-[18px] font-extrabold leading-snug tracking-[-0.015em]"
                      style={{ color: "var(--hero-ink)" }}
                    >
                      {f.titular}
                    </p>
                    <p
                      className="mt-2 max-w-[56ch] text-[14px] leading-relaxed"
                      style={{ color: "var(--hero-ink-soft, #eafaf9)" }}
                    >
                      {f.resumen}
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    {f.marcadores.map(([k, v]) => (
                      <span
                        key={k}
                        className="block rounded-[11px] px-3.5 py-3"
                        style={{ background: "rgba(255,255,255,.14)" }}
                      >
                        <span
                          className="block text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
                        >
                          {k}
                        </span>
                        <span
                          className={`${mono} mt-1 block text-[14px] font-bold`}
                          style={{ color: "var(--hero-ink)" }}
                        >
                          {v}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3.5">
                <BloqueFeedback tipo="aciertos" items={f.aciertos} />
                <BloqueFeedback tipo="omisiones" items={f.omisiones} />
                <BloqueFeedback tipo="precisiones" items={f.precisiones} />
              </div>

              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Cómo lo leería su docente</p>
                <p className={`mt-3 max-w-[70ch] text-[15px] leading-[1.75] ${softText}`}>
                  {f.lecturaDocente}
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className={`${kicker} text-secondary`}>Diagnóstico del caso</p>
                  <p className="mt-2 text-[16px] font-bold leading-relaxed">{f.diagnostico}</p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* ── rail: respuesta o cierre ── */}
        <aside className="flex min-w-0 flex-col gap-5">
          {!enviado ? (
            <>
              <section className={`${card} p-5`}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-primary"
                  >
                    <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-extrabold tracking-[-0.01em]">Su lectura</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Describa lo que ve antes de concluir
                    </p>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="block text-[11.5px] font-semibold">Hallazgos</span>
                  <textarea
                    rows={7}
                    value={hallazgos}
                    onChange={(e) => setHallazgos(e.target.value)}
                    className="mt-[7px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none transition-colors focus:border-secondary"
                  />
                  <span className="mt-1.5 block text-[11.5px] text-muted-foreground">
                    Mencione plano, medida y lado: el tutor evalúa cómo lo dice, no solo qué dice.
                  </span>
                </label>

                <label className="mt-4 block">
                  <span className="block text-[11.5px] font-semibold">Su impresión diagnóstica</span>
                  <input
                    type="text"
                    value={impresion}
                    onChange={(e) => setImpresion(e.target.value)}
                    className="mt-[7px] h-12 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14.5px] font-semibold text-foreground outline-none transition-colors focus:border-secondary"
                  />
                </label>

                <fieldset className="mt-4 border-0 p-0">
                  <legend className="p-0 text-[11.5px] font-semibold">
                    ¿Qué tan seguro está?
                  </legend>
                  <div className="mt-[7px] flex gap-1.5">
                    {(["Poco", "Algo", "Mucho"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeguridad(s)}
                        aria-pressed={seguridad === s}
                        className={`h-11 flex-1 rounded-[10px] border text-[13px] font-semibold transition-colors ${focusRing} ${
                          seguridad === s
                            ? "border-transparent bg-accent text-accent-foreground"
                            : `border-border bg-card ${softText}`
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <button
                  type="button"
                  onClick={onEnviarRespuesta}
                  className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Enviar mi lectura
                </button>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  Al enviarla verá la verdad del caso y el tutor le explicará las diferencias.
                </p>
              </section>

              <section className="rounded-xl bg-accent p-5">
                <p className={`${kicker} text-accent-foreground`}>Pista del tutor</p>
                <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                  Si se atora, puede pedir una pista: le señalará dónde mirar sin darle el
                  diagnóstico. Cuenta como ayuda en su resultado.
                </p>
                <button
                  type="button"
                  onClick={onPedirPista}
                  className={`mt-3.5 h-11 rounded-full border bg-card px-4 text-[13px] font-bold text-secondary transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                  style={{ borderColor: "color-mix(in oklab, var(--secondary) 35%, white)" }}
                >
                  Pedir una pista
                </button>
              </section>
            </>
          ) : (
            <>
              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Sigue el entrenamiento</p>
                <button
                  type="button"
                  onClick={onSiguienteCaso}
                  className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Siguiente caso
                </button>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEnviado(false)}
                    className={`h-11 flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={onSalir}
                    className={`h-11 flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    Terminar
                  </button>
                </div>
                <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
                  Quedan {sesion.total - sesion.paso} casos en esta serie. Puede parar cuando quiera;
                  el avance se guarda.
                </p>
              </section>

              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Efecto en su competencia</p>
                <ul className="mt-4 flex flex-col gap-3.5">
                  {f.competencia.map((c) => {
                    const sube = c.despues > c.antes;
                    return (
                      <li key={c.dominio}>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold">{c.dominio}</span>
                          <span
                            className={`${mono} ml-auto text-[12.5px] font-bold ${
                              sube ? "text-secondary" : "text-muted-foreground"
                            }`}
                          >
                            {c.antes} → {c.despues}
                            {sube ? "" : " ="}
                          </span>
                        </div>
                        <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${c.despues}%` }}
                          />
                          {sube && (
                            <span
                              aria-hidden
                              className="absolute top-0 h-1.5 w-0.5 bg-sidebar"
                              style={{ left: `${c.antes}%` }}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex items-start gap-3 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] p-3.5">
                  <span
                    aria-hidden
                    className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
                  >
                    <Clock className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                    Le programamos <span className="font-bold">{f.repasoProgramado.tema}</span> para
                    dentro de {f.repasoProgramado.enDias} días, porque ahí se le fue el caso.
                  </p>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════ SESIÓN · REPORTE ═══════════════════════ */

export function SesionReporteVista({
  sesion,
  onSalir,
}: {
  sesion: SesionReporte;
  onSalir: () => void;
}) {
  const [pieza, setPieza] = useState(0);
  const onEnviarRespuesta = () => {};

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <BarraSesion
        rotulo="Simulador de reporte"
        caso={`Ultrasonido abdominal · caso 1 de ${sesion.total}`}
        paso={sesion.paso}
        total={sesion.total}
        extra={`paso ${sesion.paso} de ${sesion.total}`}
        tiempo={sesion.tiempo}
        onSalir={onSalir}
      />

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className={`${card} overflow-hidden`}>
            <Portada
              etiqueta={`visor DICOM · ${sesion.piezas[pieza]}`}
              alto={240}
              esquina={`estudio completo · ${sesion.piezas.length} piezas`}
            />
            <div className="flex gap-2 overflow-x-auto border-t border-border p-3.5">
              {sesion.piezas.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPieza(i)}
                  aria-current={i === pieza}
                  className={`relative grid h-[58px] w-20 shrink-0 place-items-center overflow-hidden rounded-[9px] border-2 ${focusRing} ${
                    i === pieza ? "border-primary" : "border-transparent"
                  }`}
                  style={{ background: "var(--wave-0)" }}
                >
                  <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                  <span
                    className={`relative ${mono} text-center text-[7px] uppercase tracking-[0.08em]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    {p}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>El estudio que le tocó</p>
            <p className={`mt-2.5 text-[14.5px] leading-[1.7] ${softText}`}>{sesion.enunciado}</p>
          </section>

          <div className="flex flex-col gap-3">
            {sesion.secciones.map((s, i) => (
              <section
                key={s.titulo}
                className={`overflow-hidden rounded-xl border ${
                  s.estado === "falta"
                    ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`flex items-center gap-3 border-b px-5 py-3 ${
                    s.estado === "falta" ? "border-[color:var(--warning-border)]" : "border-border"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      s.estado === "listo"
                        ? "bg-primary text-[color:var(--sidebar)]"
                        : s.estado === "falta"
                          ? "border-2 border-[color:var(--warning)] bg-card"
                          : "border-2 border-[color:var(--track)] bg-card"
                    }`}
                  >
                    {s.estado === "listo" && <Check className="h-[13px] w-[13px]" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-snug">{s.titulo}</span>
                    <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                      sección {i + 1}
                    </span>
                  </span>
                  {s.estado === "falta" && (
                    <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-card px-2.5 text-[11.5px] font-semibold text-[color:var(--warning-foreground)]">
                      El tutor la marcó
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <textarea
                    rows={2}
                    defaultValue={s.texto}
                    placeholder="Redacte esta sección como en un reporte real."
                    className="w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13.5px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
                  />
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={onEnviarRespuesta}
            className={`inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Enviar mi reporte a revisión
          </button>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-primary"
              >
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-extrabold tracking-[-0.01em]">El tutor va leyendo</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Avisos mientras escribe, sin calificar todavía
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {sesion.avisos.map((a) => (
                <li
                  key={a.texto}
                  className={`flex gap-2.5 rounded-[11px] p-3 ${a.tono === "bien" ? "bg-accent" : "bg-muted"}`}
                >
                  <span
                    aria-hidden
                    className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      a.tono === "bien"
                        ? "bg-primary text-[color:var(--sidebar)]"
                        : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {a.tono === "bien" ? (
                      <Check className="h-3 w-3" strokeWidth={2.6} />
                    ) : (
                      <AlertCircle className="h-3 w-3" strokeWidth={2.6} />
                    )}
                  </span>
                  <span className={`text-[13px] leading-relaxed ${softText}`}>{a.texto}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Qué se evalúa</p>
            <dl className="mt-3.5 flex flex-col gap-3">
              {sesion.criterios.map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-[12.5px] font-semibold">{k}</dt>
                  <dd className="min-w-0 text-[12.5px] leading-snug text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════ CATÁLOGO ═══════════════════════════ */

export default function Simuladores({ data = MOCK }: { data?: SimuladoresData }) {
  const { practicados, ultimaSesion, desempeno, repasos, disponibles, areas, casos } = data;
  const [tipo, setTipo] = useState<TipoSim>("interpretacion");
  const [area, setArea] = useState("Todas las áreas");
  const [dificultad, setDificultad] = useState("Todas");
  const [sesion, setSesion] = useState<TipoSim | null>(null);

  const visibles = useMemo(
    () =>
      casos.filter((c) => {
        if (area !== "Todas las áreas" && !c.area.startsWith(area)) return false;
        if (dificultad !== "Todas" && c.dificultad !== dificultad) return false;
        return true;
      }),
    [casos, area, dificultad],
  );

  /* ── Stubs ─────────────────────────────────────────────── */
  const onIniciarSimulacion = (t: TipoSim) => setSesion(t);
  const onFiltrar = (a: string) => setArea(a);
  /* ──────────────────────────────────────────────────────── */

  if (sesion === "interpretacion")
    return (
      <SesionInterpretacionVista
        sesion={data.sesionInterpretacion}
        onSalir={() => setSesion(null)}
      />
    );
  if (sesion === "reporte")
    return <SesionReporteVista sesion={data.sesionReporte} onSalir={() => setSesion(null)} />;

  const tonoBarra: Record<Desempeno["tono"], string> = {
    bien: "var(--primary)",
    aviso: "var(--warning)",
    neutro: "var(--hero-ink-muted)",
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* acción de entrada */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onIniciarSimulacion("interpretacion")}
          className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Play aria-hidden className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
          Seguir entrenando
        </button>
      </div>

      {/* su entrenamiento + repasos */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
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
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] w-full"
          >
            <path d="M0 66c96-32 168 24 264 8s168-50 336-14v60H0z" fill="rgba(255,255,255,.07)" />
            <path d="M0 88c120-26 192 16 300 4s180-36 300-10v38H0z" fill="rgba(255,255,255,.09)" />
          </svg>
          <div className="relative flex flex-wrap gap-8">
            <div className="min-w-0">
              <p className={kicker} style={{ color: "var(--hero-ink-muted)" }}>
                Su entrenamiento
              </p>
              <div className="mt-3.5 flex items-end gap-2.5">
                <span
                  className={`${mono} text-[44px] font-extrabold leading-none tracking-[-0.03em]`}
                  style={{ color: "var(--hero-ink)" }}
                >
                  {practicados}
                </span>
                <span
                  className={`${mono} pb-1.5 text-[14px] font-semibold`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  casos practicados
                </span>
              </div>
              <p
                className="mt-4 max-w-[42ch] text-[13.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-soft, #dbe8f1)" }}
              >
                {ultimaSesion}
              </p>
            </div>
            <div className="flex min-w-[230px] flex-1 flex-col gap-3.5">
              {desempeno.map((d) => (
                <div key={d.etiqueta}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px]" style={{ color: "var(--hero-ink-soft, #dbe8f1)" }}>
                      {d.etiqueta}
                    </span>
                    <span
                      className={`${mono} ml-auto text-[12.5px] font-bold`}
                      style={{ color: "var(--hero-ink)" }}
                    >
                      {d.pct}%
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    style={{ background: "rgba(255,255,255,.18)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.pct}%`, background: tonoBarra[d.tono] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${card} p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Lo que el tutor le dejó para repasar</p>
          <ul className="mt-3.5 flex flex-col gap-2.5">
            {repasos.map((r) => (
              <li
                key={r.tema}
                className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${
                  r.hoy
                    ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border-border bg-card"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${
                    r.hoy ? "bg-card text-[color:var(--warning-foreground)]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Clock className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold leading-snug">{r.tema}</span>
                  <span
                    className={`${mono} mt-0.5 block text-[11.5px] ${
                      r.hoy ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    repaso {r.cuando}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onIniciarSimulacion("interpretacion")}
                  className={`h-10 shrink-0 rounded-full px-3.5 text-[12.5px] font-bold transition-colors ${focusRing} ${
                    r.hoy
                      ? "bg-primary text-[color:var(--sidebar)]"
                      : "border border-border bg-card text-secondary hover:bg-accent"
                  }`}
                >
                  Practicar
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
            Cada sesión alimenta su competencia I-AIM y decide cuándo vuelve el tema.
          </p>
        </section>
      </div>

      {/* los dos tipos */}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {(
          [
            {
              t: "interpretacion" as TipoSim,
              nombre: "Interpretación",
              sub: "Lea el caso y dé su impresión",
              d: "La IA le muestra imágenes y la viñeta, sin diagnóstico. Usted describe hallazgos y concluye; el tutor compara contra la verdad del caso.",
              n: `${disponibles.interpretacion} casos disponibles`,
              cta: "Practicar lectura",
              icono: Eye,
              principal: true,
            },
            {
              t: "reporte" as TipoSim,
              nombre: "Reporte",
              sub: "Redacte el estudio completo",
              d: "La IA le da el estudio y usted escribe el reporte. El tutor revisa estructura, medidas, omisiones e impresión diagnóstica.",
              n: `${disponibles.reporte} estudios disponibles`,
              cta: "Practicar reporte",
              icono: FileText,
              principal: false,
            },
          ]
        ).map((s) => {
          const Icono = s.icono;
          return (
            <section
              key={s.t}
              className={`relative overflow-hidden rounded-xl border bg-card p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
                s.principal ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                    s.principal ? "bg-primary text-[color:var(--sidebar)]" : "bg-accent text-accent-foreground"
                  }`}
                >
                  <Icono className="h-[22px] w-[22px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[19px] font-extrabold tracking-[-0.015em]">{s.nombre}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{s.sub}</p>
                </div>
              </div>
              <p className={`mt-4 max-w-[52ch] text-[14px] leading-[1.7] ${softText}`}>{s.d}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onIniciarSimulacion(s.t)}
                  className={`inline-flex h-12 items-center rounded-[10px] px-5 text-[14px] font-bold transition-colors ${focusRing} ${
                    s.principal
                      ? "bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                      : "border border-border bg-card text-secondary hover:bg-accent"
                  }`}
                >
                  {s.cta}
                </button>
                <span className={`${mono} text-[12.5px] text-muted-foreground`}>{s.n}</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* filtros + casos */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Tipo de simulador"
          className="flex gap-1.5 rounded-full border border-border bg-card p-1"
        >
          {(
            [
              ["interpretacion", "Interpretación", disponibles.interpretacion],
              ["reporte", "Reporte", disponibles.reporte],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tipo === id}
              onClick={() => setTipo(id)}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                tipo === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} ${tipo === id ? "opacity-70" : "text-muted-foreground"}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onFiltrar(a)}
              aria-pressed={area === a}
              className={`h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                area === a
                  ? "border-transparent bg-accent text-accent-foreground"
                  : `border-border bg-card ${softText} hover:bg-muted`
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="ml-auto flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5">
          <span className="text-[12.5px] text-muted-foreground">Dificultad</span>
          <select
            value={dificultad}
            onChange={(e) => setDificultad(e.target.value)}
            className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
          >
            {["Todas", "Básico", "Intermedio", "Avanzado"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>
      </div>

      <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((c) => (
          <li
            key={c.id}
            className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
              c.sugerido ? "border-primary" : "border-border"
            }`}
          >
            <Portada
              etiqueta={c.portada}
              alto={150}
              badge={`${c.piezas} piezas`}
              esquina={c.sugerido ? "Le toca hoy" : undefined}
            />
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                  {c.area}
                </span>
                <span
                  className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseNivel[c.dificultad]}`}
                >
                  {c.dificultad}
                </span>
              </div>
              <h3 className="mt-3 text-[15px] font-bold leading-snug" style={{ textWrap: "pretty" }}>
                {c.titulo}
              </h3>
              <div className="mt-3.5 flex items-center gap-2.5 border-t border-border pt-3.5">
                <span className={`${mono} text-[11.5px] text-muted-foreground`}>{c.historial}</span>
                <button
                  type="button"
                  onClick={() => onIniciarSimulacion(tipo)}
                  className={`ml-auto h-10 rounded-full bg-accent px-3.5 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                >
                  Entrenar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

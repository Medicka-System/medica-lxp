"use client";

/**
 * Studio · Analítica — centro de análisis del SÚPER ADMIN
 *
 * Regla de la pantalla: ninguna tarjeta termina en la cifra. Toda métrica cierra con una SEÑAL
 * accionable en voz activa ("9 de las 14 bajas venían de POCUS → revisar arranque"), así la
 * pantalla se lee como una lista de decisiones, no como un tablero de vanidad.
 *
 * Tres capas declaradas:
 *   CAPA 1 · Negocio y crecimiento (teal)   → lo que revisa a diario
 *   CAPA 2 · Aprendizaje (violeta)          → la capa profunda: cada interacción entra por xAPI
 *                                             al LRS; es el diferenciador
 *   CAPA 3 · Operación, staff y comunidad (navy) → quién sostiene la operación y a qué costo
 *
 * ECO es el analista, no un widget al margen: abre la capa de aprendizaje a todo el ancho, cruza
 * fuentes del LRS y responde con análisis + acción sugerida.
 *
 * Color: ÁMBAR es el único color de atención y va pegado al dato que lo justifica; el ROJO se
 * reserva para caídas críticas (hoy no hay); el VIOLETA es de Eco.
 *
 * Gráficas con recharts. Stubs: onFiltrar · onPreguntarEco · onVerDetalle · onExportar
 */

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Lock,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, card, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";


/* ───────────────────────────── Tipos ───────────────────────────── */

export type TonoSenal = "ok" | "warn" | "info";
export type Senal = { texto: string; tono: TonoSenal };

export type PuntoSerie = { x: string; v: number };
export type Barra = { etiqueta: string; pct: number; valor: string; alerta?: boolean };

export type Atoro = {
  id: string;
  modulo: string;
  leccion: string;
  rezago: number;
  detalle: string;
  critico?: boolean;
};

export type DominioIAIM = { dominio: string; valor: number; nota: string; flojo?: boolean };

export type AvanceProgama = {
  programa: string;
  real: number;
  esperado: number;
  horas: string;
  alerta?: boolean;
};

export type Docente = {
  id: string;
  ini: string;
  nombre: string;
  grupos: string;
  validados: number;
  respuesta: string;
  consultas: number;
  alerta?: boolean;
  estado: string;
};

export type UsoEco = { tarea: string; aprobadoSinCambios: number; nota: string };

export type RespuestaEco = {
  pregunta: string;
  intro: string;
  evidencias: { titulo: string; detalle: string }[];
  accion: string;
  botones: string[];
};

export type AnaliticaData = {
  periodo: "30d" | "trimestre" | "anio";
  negocio: {
    activos: { valor: string; unidad: string; delta: string; serie: PuntoSerie[]; senal: Senal };
    altasBajas: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    retencion: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    llenado: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    embudo: { etapas: { etapa: string; valor: number; pct: number }[]; senal: Senal };
    cartera: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    ingreso: { filas: Barra[]; senal: Senal };
  };
  aprendizaje: {
    eco: RespuestaEco;
    atoros: Atoro[];
    iaim: { dominios: DominioIAIM[]; senal: Senal };
    avance: { programas: AvanceProgama[]; senal: Senal };
    repaso: {
      serie: { x: string; sinRepaso: number; conRepaso: number }[];
      retSin: string;
      retCon: string;
      senal: Senal;
    };
  };
  operacion: {
    docentes: { filas: Docente[]; senal: Senal };
    diseno: { valor: string; delta: string; barras: Barra[]; nota: string; senal: Senal };
    ateneo: { tarjetas: { titulo: string; valor: string; sub: string; ok: boolean }[]; senal: Senal };
    eco: { global: string; tareas: UsoEco[]; gasto: string; porCaso: string; senal: Senal };
  };
};

const MOCK: AnaliticaData = {
  periodo: "trimestre",
  negocio: {
    activos: {
      valor: "1 284",
      unidad: "en 11 programas",
      delta: "+35.7% vs abril",
      serie: [
        { x: "abr", v: 946 },
        { x: "may", v: 1012 },
        { x: "jun", v: 1044 },
        { x: "jul", v: 1118 },
        { x: "ago", v: 1220 },
        { x: "sep", v: 1284 },
      ],
      senal: { texto: "Crece sostenido: el cuello ya no es demanda, es capacidad docente.", tono: "ok" },
    },
    altasBajas: {
      valor: "87 / 14",
      unidad: "últimos 30 días",
      delta: "churn 1.1%",
      barras: [
        { etiqueta: "Altas", pct: 86, valor: "87" },
        { etiqueta: "Bajas", pct: 14, valor: "14", alerta: true },
        { etiqueta: "Netas", pct: 73, valor: "+73" },
      ],
      senal: { texto: "9 de las 14 bajas venían de Grupo POCUS → revisar arranque.", tono: "warn" },
    },
    retencion: {
      valor: "88%",
      unidad: "promedio a 6 meses",
      delta: "-4 pts",
      barras: [
        { etiqueta: "Sep 2026", pct: 94, valor: "94%" },
        { etiqueta: "Jul 2026", pct: 90, valor: "90%" },
        { etiqueta: "May 2026", pct: 86, valor: "86%" },
        { etiqueta: "Mar 2026", pct: 71, valor: "71%", alerta: true },
      ],
      senal: { texto: "Mar 2026 cae a 71%: la generación sin docente fijo.", tono: "warn" },
    },
    llenado: {
      valor: "82%",
      unidad: "de los cupos abiertos",
      delta: "+6 pts",
      barras: [
        { etiqueta: "Ultrasonografía", pct: 96, valor: "96%" },
        { etiqueta: "Obstétrico", pct: 88, valor: "88%" },
        { etiqueta: "POCUS", pct: 64, valor: "64%", alerta: true },
        { etiqueta: "MSK", pct: 41, valor: "41%", alerta: true },
      ],
      senal: { texto: "MSK al 41%: cupos abiertos sin conversión → revisar oferta.", tono: "warn" },
    },
    embudo: {
      etapas: [
        { etapa: "Prospectos", valor: 640, pct: 100 },
        { etapa: "Inscritos en CORA", valor: 186, pct: 29 },
        { etapa: "Provisionados en campus", valor: 178, pct: 28 },
        { etapa: "Con actividad en 7 días", valor: 152, pct: 24 },
      ],
      senal: {
        texto: "26 provisionados nunca entraron: el correo de bienvenida no basta.",
        tono: "warn",
      },
    },
    cartera: {
      valor: "94.2%",
      unidad: "al corriente",
      delta: "22 vencidos",
      barras: [
        { etiqueta: "Al corriente", pct: 94, valor: "1 210" },
        { etiqueta: "Por vencer 7 días", pct: 4, valor: "52", alerta: true },
        { etiqueta: "Vencido", pct: 2, valor: "22", alerta: true },
      ],
      senal: {
        texto: "La cobranza se opera en CORA; aquí solo se mide su efecto en bajas.",
        tono: "info",
      },
    },
    ingreso: {
      filas: [
        { etiqueta: "Ultrasonografía Médica", pct: 58, valor: "$4.9 M" },
        { etiqueta: "Ultrasonido Obstétrico", pct: 21, valor: "$1.8 M" },
        { etiqueta: "POCUS en Urgencias", pct: 12, valor: "$1.0 M" },
        { etiqueta: "Otros 8 programas", pct: 9, valor: "$0.8 M" },
      ],
      senal: { texto: "El 58% del ingreso depende de un solo programa.", tono: "warn" },
    },
  },
  aprendizaje: {
    eco: {
      pregunta: "¿Qué módulo hay que revisar?",
      intro:
        "Módulo 04 · Interpretación renal, y el patrón es uno solo: la medición de cortical.",
      evidencias: [
        { titulo: "62% falla la pregunta 4", detalle: "del punto de control, en los 3 grupos que lo cursan" },
        { titulo: "3 de 5 casos rechazados", detalle: "por el mismo error de medición" },
        { titulo: "5 consultas esta semana", detalle: "todas preguntando lo mismo al docente" },
      ],
      accion:
        "El video explica el grado pero no la técnica de medición. Agregue una lectura corta con la maniobra y una autoevaluación de dos ítems; con eso debería caer el rezago del módulo.",
      botones: ["Abrir el módulo 04", "Avisar al diseñador", "Ver el dato crudo"],
    },
    atoros: [
      { id: "a1", modulo: "M04 · Interpretación renal", leccion: "L3 · Hidronefrosis: gradación", rezago: 40, detalle: "40% rezago · 62% falla el control", critico: true },
      { id: "a2", modulo: "M08 · Doppler y hemodinamia", leccion: "L2 · Índices y ventana", rezago: 31, detalle: "31% rezago · 44% falla", critico: true },
      { id: "a3", modulo: "M07 · Obstétrico II", leccion: "L5 · Biometría del tercer trimestre", rezago: 22, detalle: "22% rezago" },
      { id: "a4", modulo: "M03 · Hígado y vía biliar", leccion: "L6 · Informe estructurado", rezago: 12, detalle: "12% rezago" },
      { id: "a5", modulo: "M01 · Fundamentos", leccion: "L4 · Artefactos", rezago: 7, detalle: "7% rezago" },
    ],
    iaim: {
      dominios: [
        { dominio: "Indicación", valor: 82, nota: "sólida" },
        { dominio: "Adquisición", valor: 54, nota: "el punto flojo", flojo: true },
        { dominio: "Interpretación", valor: 71, nota: "estable" },
        { dominio: "Decisión", valor: 63, nota: "sube 4 pts" },
      ],
      senal: {
        texto:
          "Adquisición 28 pts por debajo de Indicación: es técnica de manos, no teoría → más práctica guiada.",
        tono: "warn",
      },
    },
    avance: {
      programas: [
        { programa: "Ultrasonografía Médica", real: 54, esperado: 48, horas: "248 / 460 h" },
        { programa: "Ultrasonido Obstétrico", real: 71, esperado: 68, horas: "312 / 440 h" },
        { programa: "POCUS en Urgencias", real: 38, esperado: 52, horas: "84 / 220 h", alerta: true },
        { programa: "Doppler Vascular", real: 62, esperado: 60, horas: "148 / 240 h" },
      ],
      senal: {
        texto: "POCUS va 14 pts abajo de lo esperado: arranque lento, no deserción.",
        tono: "warn",
      },
    },
    repaso: {
      serie: [
        { x: "día 1", sinRepaso: 100, conRepaso: 100 },
        { x: "día 7", sinRepaso: 74, conRepaso: 88 },
        { x: "día 14", sinRepaso: 58, conRepaso: 84 },
        { x: "día 30", sinRepaso: 45, conRepaso: 79 },
        { x: "día 60", sinRepaso: 38, conRepaso: 74 },
      ],
      retSin: "retiene 38%",
      retCon: "retiene 74%",
      senal: {
        texto:
          "El repaso duplica la retención a 60 días, pero solo lo usa el 41% de los grupos → activarlo por defecto.",
        tono: "warn",
      },
    },
  },
  operacion: {
    docentes: {
      filas: [
        { id: "d1", ini: "AS", nombre: "Dr. Sandoval", grupos: "2 grupos", validados: 41, respuesta: "4 h", consultas: 18, estado: "Al día" },
        { id: "d2", ini: "KL", nombre: "Dra. Lugo", grupos: "3 grupos", validados: 36, respuesta: "7 h", consultas: 12, estado: "Al día" },
        { id: "d3", ini: "HC", nombre: "Dr. Cuevas", grupos: "1 grupo", validados: 12, respuesta: "38 h", consultas: 3, alerta: true, estado: "9 en cola" },
        { id: "d4", ini: "MP", nombre: "Dra. Peña", grupos: "2 grupos", validados: 28, respuesta: "11 h", consultas: 9, estado: "Al día" },
      ],
      senal: {
        texto:
          "Cuevas responde en 38 h contra 7 h del resto y tiene 9 casos en cola → reasignar o apoyar.",
        tono: "warn",
      },
    },
    diseno: {
      valor: "34",
      delta: "+9",
      barras: [
        { etiqueta: "Lecciones nuevas", pct: 62, valor: "21" },
        { etiqueta: "Casos curados a Biblioteca", pct: 26, valor: "9" },
        { etiqueta: "Plantillas y evaluaciones", pct: 12, valor: "4" },
      ],
      nota: "3 programas sin tocar en 60 días · 1 borrador sin publicar",
      senal: {
        texto: "El módulo 04 que más rezago causa no ha tenido cambios en 4 meses.",
        tono: "warn",
      },
    },
    ateneo: {
      tarjetas: [
        { titulo: "Casos presentados", valor: "28", sub: "esta semana", ok: true },
        { titulo: "Participación", valor: "41%", sub: "de los alumnos activos", ok: false },
        { titulo: "Interconsultas resueltas", valor: "86%", sub: "en menos de 48 h", ok: true },
        { titulo: "Sin respuesta", valor: "4", sub: "llevan más de 2 días", ok: false },
      ],
      senal: {
        texto: "El 59% nunca ha publicado: la comunidad vive de un núcleo pequeño.",
        tono: "warn",
      },
    },
    eco: {
      global: "83%",
      tareas: [
        { tarea: "Pre-análisis de casos", aprobadoSinCambios: 91, nota: "el docente corrige 9%" },
        { tarea: "Nota sugerida en tareas", aprobadoSinCambios: 78, nota: "corrige 22%" },
        { tarea: "Borradores de respuesta", aprobadoSinCambios: 86, nota: "edita 14%" },
        { tarea: "Resúmenes de grupo", aprobadoSinCambios: 95, nota: "corrige 5%" },
      ],
      gasto: "$1 840 de $3 000 en septiembre · 61% del tope",
      porCaso: "$0.43 por caso",
      senal: {
        texto:
          "La nota sugerida es la más corregida (22%): vale reentrenar con las rúbricas nuevas.",
        tono: "info",
      },
    },
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


/** La señal accionable: es lo que convierte la métrica en decisión. */
function SenalAccion({ senal }: { senal: Senal }) {
  const clase =
    senal.tono === "warn"
      ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
      : senal.tono === "info"
        ? "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        : "bg-accent text-accent-foreground";
  return (
    <div className="mt-3.5 border-t border-border pt-3.5">
      <span
        className={`inline-flex items-start gap-1.5 rounded-[9px] px-2.5 py-2 text-[11.5px] font-semibold leading-snug ${clase}`}
      >
        {senal.tono === "warn" && (
          <AlertTriangle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        )}
        {senal.texto}
      </span>
    </div>
  );
}

function Cifra({
  valor,
  unidad,
  delta,
  positivo,
}: {
  valor: string;
  unidad: string;
  delta?: string;
  positivo?: boolean;
}) {
  return (
    <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
      <span
        className={`${mono} whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.03em]`}
      >
        {valor}
      </span>
      <span className="text-[12px] font-semibold leading-snug text-muted-foreground">{unidad}</span>
      {delta && (
        <span
          className={`ml-auto inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
            positivo
              ? "bg-accent text-accent-foreground"
              : "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
          }`}
        >
          {positivo ? (
            <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />
          ) : (
            <TrendingDown aria-hidden className="h-3 w-3" strokeWidth={2.2} />
          )}
          {delta}
        </span>
      )}
    </div>
  );
}

function Barras({ filas, color = "primary" }: { filas: Barra[]; color?: "primary" | "sidebar" }) {
  return (
    <div className="mt-3.5 flex flex-col gap-2.5">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{f.etiqueta}</span>
            <span
              className={`${mono} shrink-0 text-[12px] font-bold ${
                f.alerta ? "text-[color:var(--warning-foreground)]" : ""
              }`}
            >
              {f.valor}
            </span>
          </div>
          <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
            <span
              aria-hidden
              className={`block h-full rounded-full ${
                f.alerta
                  ? "bg-[color:var(--warning)]"
                  : color === "sidebar"
                    ? "bg-sidebar"
                    : "bg-primary"
              }`}
              style={{ width: `${f.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tarjeta({
  titulo,
  extra,
  children,
  senal,
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  senal?: Senal;
}) {
  return (
    <section className={`${card} flex flex-col p-[18px]`}>
      <div className="flex items-center gap-2.5">
        <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{titulo}</p>
        {extra}
      </div>
      {children}
      {senal && <SenalAccion senal={senal} />}
    </section>
  );
}

function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      <span className="text-[11.5px] text-muted-foreground">{nota}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Analitica({ data = MOCK }: { data?: AnaliticaData }) {
  const { negocio, aprendizaje, operacion } = data;
  const [periodo, setPeriodo] = useState(data.periodo);
  const [pregunta, setPregunta] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onFiltrar = (_clave: string, _valor: string) => {};
  const onPreguntarEco = (_q: string) => setPregunta("");
  const onVerDetalle = (_id: string) => {};
  const onExportar = () => {};
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      {/* cabecera y filtros */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Analítica</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            Cada cifra viene con su señal: qué revisar, no solo cómo va.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ["30d", "30 días"],
                ["trimestre", "Trimestre"],
                ["anio", "Año"],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPeriodo(id);
                  onFiltrar("periodo", id);
                }}
                aria-pressed={periodo === id}
                className={`h-8 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  periodo === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {["Todos los programas", "Todos los grupos"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onFiltrar(t, "todos")}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              {t}
              <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ))}

          <button
            type="button"
            onClick={onExportar}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Exportar
          </button>
        </div>
      </div>

      {/* ══════════════ CAPA 1 · NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Negocio y crecimiento" nota="lo que revisa a diario" />

      <div className="mt-3.5 grid items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Alumnos activos" senal={negocio.activos.senal}>
          <Cifra {...negocio.activos} delta={negocio.activos.delta} positivo />
          <div className="mt-3.5 h-[74px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={negocio.activos.serie} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="x" hide />
                <YAxis hide domain={["dataMin - 40", "dataMax + 40"]} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "var(--border)" }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="var(--primary)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1.5 flex justify-between">
            {negocio.activos.serie.map((p) => (
              <span key={p.x} className="text-[9.5px] text-muted-foreground">
                {p.x}
              </span>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Altas y bajas" senal={negocio.altasBajas.senal}>
          <Cifra {...negocio.altasBajas} delta={negocio.altasBajas.delta} positivo />
          <Barras filas={negocio.altasBajas.barras} />
        </Tarjeta>

        <Tarjeta titulo="Retención por generación" senal={negocio.retencion.senal}>
          <Cifra {...negocio.retencion} delta={negocio.retencion.delta} />
          <Barras filas={negocio.retencion.barras} />
        </Tarjeta>

        <Tarjeta titulo="Llenado de grupos" senal={negocio.llenado.senal}>
          <Cifra {...negocio.llenado} delta={negocio.llenado.delta} positivo />
          <Barras filas={negocio.llenado.barras} />
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-3">
        <Tarjeta titulo="Conversión del embudo" senal={negocio.embudo.senal}>
          <div className="mt-3.5 flex flex-col gap-2">
            {negocio.embudo.etapas.map((e, i) => (
              <div key={e.etapa} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium">{e.etapa}</span>
                  <span className="mt-1.5 block h-[22px] overflow-hidden rounded-[7px] bg-[color:var(--track)]">
                    <span
                      aria-hidden
                      className={`block h-full ${i === 3 ? "bg-secondary" : "bg-primary"}`}
                      style={{ width: `${e.pct}%`, opacity: 1 - i * 0.12 }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`${mono} block text-[13px] font-bold`}>{e.valor}</span>
                  <span className={`${mono} block text-[10px] text-muted-foreground`}>{e.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Cartera y cobranza"
          senal={negocio.cartera.senal}
          extra={
            <span
              className={`inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              CORA · solo lectura
            </span>
          }
        >
          <Cifra {...negocio.cartera} delta={negocio.cartera.delta} />
          <Barras filas={negocio.cartera.barras} />
        </Tarjeta>

        <Tarjeta titulo="Ingreso por programa" senal={negocio.ingreso.senal}>
          <Barras filas={negocio.ingreso.filas} color="sidebar" />
        </Tarjeta>
      </div>

      {/* ══════════════ CAPA 2 · APRENDIZAJE (LRS) ══════════════ */}
      <RotuloCapa
        color="var(--info-foreground)"
        titulo="Aprendizaje"
        nota="la capa profunda · cada interacción entra por xAPI al LRS"
      />

      {/* Eco analista: abre la capa, no es un widget al margen */}
      <section className={`${card} relative mt-3.5 overflow-hidden border-[color:var(--info-border)]`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(100deg, rgba(238,242,255,.9) 0%, rgba(255,255,255,0) 52%)",
          }}
        />
        <div className="relative grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <EcoMark size={38} invertido />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-[15px] font-bold leading-tight">Eco, su analista</p>
                  <span className="inline-flex h-[21px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                    <TrendingUp aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                    Lee el LRS completo
                  </span>
                </div>
                <p className={`mt-1 text-[12.5px] ${softText}`}>
                  Pregunte en sus palabras: cruza avance, evaluaciones, casos y consultas.
                </p>
              </div>
            </div>

            <form
              className="mt-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-muted px-4"
              onSubmit={(e) => {
                e.preventDefault();
                onPreguntarEco(pregunta);
              }}
            >
              <span className="sr-only">Preguntarle a Eco</span>
              <input
                type="text"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder="¿Qué programa tiene peor retención y por qué?"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Preguntar"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            </form>

            <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
              {[
                "¿Dónde están fallando los alumnos este mes?",
                "¿Qué módulo hay que revisar?",
                "¿El repaso espaciado está sirviendo?",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPreguntarEco(s)}
                  className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* respuesta: análisis + acción sugerida */}
          <div className="min-w-0 xl:border-l xl:border-border xl:pl-6">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {aprendizaje.eco.pregunta}
              </p>
            </div>

            <div className="mt-3 flex gap-2.5">
              <EcoMark size={28} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] leading-relaxed ${softText}`}>{aprendizaje.eco.intro}</p>

                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {aprendizaje.eco.evidencias.map((e) => (
                    <li
                      key={e.titulo}
                      className="flex items-start gap-2.5 rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 py-2.5"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--warning-foreground)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                          {e.titulo}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--warning-foreground)]">
                          {e.detalle}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className={`mt-3 text-[13px] leading-relaxed ${softText}`}>
                  <span className="font-bold text-foreground">Acción sugerida:</span>{" "}
                  {aprendizaje.eco.accion}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {aprendizaje.eco.botones.map((b, i) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onVerDetalle(b)}
                      className={`h-9 whitespace-nowrap rounded-[9px] px-3.5 text-[12.5px] transition-colors ${focusRing} ${
                        i === 0
                          ? "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                          : i === 1
                            ? "border border-border bg-card font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                            : "font-semibold text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* dónde se atoran */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Dónde se atoran</p>
            <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
              vía LRS
            </span>
            <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
              rezago = no la terminan en el plazo del grupo
            </span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2">
            {aprendizaje.atoros.map((a) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-center gap-3.5 rounded-[11px] border px-3.5 py-3 ${
                  a.critico
                    ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border-border bg-card"
                }`}
              >
                <span className="min-w-[180px] flex-[1.3]">
                  <span className="block text-[12.5px] font-bold">{a.modulo}</span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      a.critico ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {a.leccion}
                  </span>
                </span>

                <span className="flex min-w-[140px] flex-1 items-center gap-2.5">
                  <span
                    className="h-[7px] flex-1 overflow-hidden rounded-full"
                    style={{ background: a.critico ? "rgba(146,64,14,.15)" : "var(--track)" }}
                  >
                    <span
                      aria-hidden
                      className={`block h-full rounded-full ${
                        a.critico ? "bg-[color:var(--warning)]" : "bg-primary"
                      }`}
                      style={{ width: `${a.rezago * 2}%` }}
                    />
                  </span>
                  <span
                    className={`${mono} shrink-0 whitespace-nowrap text-[11px] ${
                      a.critico ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {a.detalle}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => onVerDetalle(a.id)}
                  className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] border bg-card px-3 text-[12px] font-bold ${focusRing} ${
                    a.critico
                      ? "border-[color:var(--warning-border)] text-[color:var(--warning-foreground)]"
                      : "border-border text-secondary"
                  }`}
                >
                  {a.critico ? "Revisar" : "Ver"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* I-AIM agregada */}
        <Tarjeta titulo="Competencia I-AIM de la escuela" senal={aprendizaje.iaim.senal}>
          <div className="mt-3.5 flex flex-col gap-3">
            {aprendizaje.iaim.dominios.map((d) => (
              <div key={d.dominio}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.dominio}</span>
                  <span
                    className={`${mono} shrink-0 text-[13px] font-bold ${
                      d.flojo ? "text-[color:var(--warning-foreground)]" : ""
                    }`}
                  >
                    {d.valor}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className={`block h-full rounded-full ${
                      d.flojo ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${d.valor}%` }}
                  />
                </div>
                <p
                  className={`mt-1 text-[10.5px] ${
                    d.flojo ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                  }`}
                >
                  {d.nota}
                </p>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-2">
        {/* avance real contra el esperado */}
        <Tarjeta titulo="Avance real por programa" senal={aprendizaje.avance.senal}>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Horas acreditadas contra las esperadas a la fecha, no inscritos.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {aprendizaje.avance.programas.map((p) => (
              <div key={p.programa}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {p.programa}
                  </span>
                  <span
                    className={`${mono} shrink-0 text-[10.5px] ${
                      p.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {p.horas}
                  </span>
                </div>
                <div className="relative mt-1.5 h-[9px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className={`block h-full rounded-full ${
                      p.alerta ? "bg-[color:var(--warning)]" : "bg-primary"
                    }`}
                    style={{ width: `${p.real}%` }}
                  />
                  <span
                    aria-hidden
                    title="avance esperado"
                    className="absolute -top-[3px] h-[15px] w-[2px] rounded-full bg-sidebar"
                    style={{ left: `${p.esperado}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span aria-hidden className="h-[11px] w-[2px] rounded-full bg-sidebar" />
            la marca es el avance esperado a la fecha
          </p>
        </Tarjeta>

        {/* decaimiento y repaso espaciado */}
        <Tarjeta titulo="Decaimiento y repaso espaciado" senal={aprendizaje.repaso.senal}>
          <div className="mt-3.5 h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aprendizaje.repaso.serie} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="x"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="sinRepaso"
                  name="Sin repaso"
                  stroke="var(--warning)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="conRepaso"
                  name="Con repaso espaciado"
                  stroke="var(--secondary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3.5">
            {[
              { t: "Sin repaso", c: "var(--warning)", v: aprendizaje.repaso.retSin },
              { t: "Con repaso espaciado", c: "var(--secondary)", v: aprendizaje.repaso.retCon },
            ].map((l) => (
              <span key={l.t} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-[3px] w-2.5 rounded-full" style={{ background: l.c }} />
                <span className={`text-[11.5px] font-medium ${softText}`}>{l.t}</span>
                <span className={`${mono} text-[11.5px] font-bold`}>{l.v}</span>
              </span>
            ))}
          </div>
        </Tarjeta>
      </div>

      {/* ══════════════ CAPA 3 · OPERACIÓN ══════════════ */}
      <RotuloCapa
        color="var(--sidebar)"
        titulo="Operación, staff y comunidad"
        nota="quién sostiene la operación y a qué costo"
      />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* desempeño docente */}
        <Tarjeta titulo="Desempeño docente" senal={operacion.docentes.senal}>
          <div className="mt-3 flex flex-col">
            <div className="flex items-center gap-3 px-2 pb-2">
              {(
                [
                  ["Docente", "flex-[1.3]"],
                  ["Validados", "shrink-0 w-[66px] text-right"],
                  ["Respuesta", "shrink-0 w-[74px] text-right"],
                  ["Consultas", "shrink-0 w-[66px] text-right"],
                  ["", "shrink-0 w-[96px] text-right"],
                ] as const
              ).map(([t, cls]) => (
                <span
                  key={t || "estado"}
                  className={`${cls} whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`}
                >
                  {t}
                </span>
              ))}
            </div>

            {operacion.docentes.filas.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-3 border-t border-border px-2 py-2.5 ${
                  d.alerta ? "bg-[color:var(--warning-surface)]" : ""
                }`}
              >
                <span className="flex min-w-0 flex-[1.3] items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
                  >
                    {d.ini}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold">{d.nombre}</span>
                    <span className={`${mono} block text-[10px] text-muted-foreground`}>
                      {d.grupos}
                    </span>
                  </span>
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-right text-[12.5px] font-bold`}>
                  {d.validados}
                </span>
                <span
                  className={`${mono} w-[74px] shrink-0 text-right text-[12.5px] font-bold ${
                    d.alerta ? "text-[color:var(--warning-foreground)]" : ""
                  }`}
                >
                  {d.respuesta}
                </span>
                <span className={`${mono} w-[66px] shrink-0 text-right text-[12.5px] font-bold`}>
                  {d.consultas}
                </span>
                <span className="w-[96px] shrink-0 text-right">
                  <span
                    className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
                      d.alerta
                        ? "border border-[color:var(--warning-border)] bg-card text-[color:var(--warning-foreground)]"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {d.estado}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        {/* actividad de diseño */}
        <Tarjeta titulo="Actividad de diseño" senal={operacion.diseno.senal}>
          <Cifra
            valor={operacion.diseno.valor}
            unidad="piezas publicadas"
            delta={operacion.diseno.delta}
            positivo
          />
          <Barras filas={operacion.diseno.barras} />
          <p className="mt-3 text-[11.5px] text-muted-foreground">{operacion.diseno.nota}</p>
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-2">
        {/* salud del Ateneo */}
        <Tarjeta titulo="Salud del Ateneo" senal={operacion.ateneo.senal}>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {operacion.ateneo.tarjetas.map((t) => (
              <div
                key={t.titulo}
                className={`rounded-[11px] border p-3 ${
                  t.ok
                    ? "border-border bg-card"
                    : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                }`}
              >
                <span
                  className={`${mono} block text-[20px] font-extrabold leading-none ${
                    t.ok ? "" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.valor}
                </span>
                <span
                  className={`mt-1.5 block text-[11px] font-bold ${
                    t.ok ? "" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.titulo}
                </span>
                <span
                  className={`mt-0.5 block text-[10.5px] ${
                    t.ok ? "text-muted-foreground" : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {t.sub}
                </span>
              </div>
            ))}
          </div>
        </Tarjeta>

        {/* uso y calidad de Eco: cuánto corrige el docente */}
        <Tarjeta titulo="Uso y calidad de Eco" senal={operacion.eco.senal}>
          <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
            <span
              className={`${mono} whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.03em]`}
            >
              {operacion.eco.global}
            </span>
            <span className="text-[12px] font-semibold leading-snug text-muted-foreground">
              de sus propuestas se aprueban sin cambios
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-3">
            {operacion.eco.tareas.map((t) => (
              <div key={t.tarea}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-medium">{t.tarea}</span>
                  <span className={`${mono} shrink-0 text-[12px] font-bold`}>
                    {t.aprobadoSinCambios}%
                  </span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    aria-hidden
                    className="block h-full rounded-full bg-[color:var(--info)]"
                    style={{ width: `${t.aprobadoSinCambios}%` }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">{t.nota}</p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-[color:var(--info-foreground)]">
              {operacion.eco.gasto}
            </span>
            <span className={`${mono} shrink-0 text-[11px] font-bold text-[color:var(--info-foreground)]`}>
              {operacion.eco.porCaso}
            </span>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}

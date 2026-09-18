"use client";

/**
 * Studio · Entregas — segunda herramienta diaria del DOCENTE
 *
 * Los dos tipos de entrega NO se tratan igual:
 *   · AUTOEVALUACIONES (opción múltiple): las califica el sistema al enviarse — lógica simple, sin
 *     IA. El docente no las califica una por una: audita el acierto por pregunta.
 *   · TAREAS ABIERTAS: Eco pre-califica contra la rúbrica del diseñador y sugiere nota +
 *     comentario. El docente ajusta y confirma. Eco nunca asienta la nota sola.
 *
 * Un solo color de atención: ÁMBAR para lo que espera lectura, las preguntas que reprobó el grupo y
 * los que no entregaron. El VIOLETA nunca alerta: señala a Eco.
 *
 * Stubs: onAbrirEntrega · onConfirmar · onConfirmarLote · onEditarNota · onPreguntarIA ·
 *        onElegirActividad · onRecordar
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  MonitorCheck,
  Minus,
  Plus,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing } from "@/components/tokens";
import { Avatar } from "@/components/Avatar";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoEntrega = "abierta" | "autoevaluacion";
export type EstadoEntrega = "auto" | "sugerida" | "requiere-lectura" | "sin-entregar";

export type Alumno = { id: string; ini: string; nombre: string };

export type CriterioRubrica = {
  id: string;
  texto: string;
  peso: number;
  nivelAlcanzado: string;
  puntaje: number; // 0–1
};

export type PreAnalisisIA = {
  notaSugerida: number;
  confianza: "alta" | "media" | "baja";
  sustento: { clase: "ok" | "falta"; texto: string }[];
  comentario: string;
};

export type Entrega = {
  id: string;
  alumno: Alumno;
  tipo: TipoEntrega;
  estado: EstadoEntrega;
  entregadaHace: string;
  nota: number | null;
  detalleCorto: string;
  respuesta?: string[];
  rubrica?: CriterioRubrica[];
  ia?: PreAnalisisIA;
};

export type PreguntaAuto = {
  n: string;
  texto: string;
  aciertoPct: number;
  aciertos: string;
};

export type Actividad = {
  id: string;
  clave: string;
  titulo: string;
  tipo: TipoEntrega;
  consigna?: string;
  preguntas?: PreguntaAuto[];
  estadisticas?: { promedio: number; mediana: number; masBaja: number; masAlta: number };
  contestada?: string;
};

export type MensajeIA = {
  id: string;
  de: "docente" | "ia";
  texto: string;
  alumnos?: { ini: string; nombre: string; porque: string; chip: string }[];
  borrador?: string;
  acciones?: { etiqueta: string; primaria?: boolean }[];
};

export type EntregasData = {
  grupo: string;
  grupos: string[];
  actividad: Actividad;
  actividades: Actividad[];
  resumen: {
    entregadas: number;
    delGrupo: number;
    autoCalificadas: number;
    porConfirmar: number;
    promedio: number;
    sinEntregar: number;
    vencio: string;
  };
  entregas: Entrega[];
  sinEntregar: Alumno[];
  altaConfianza: number;
  asistente: { sugerencias: string[]; conversacion: MensajeIA[] };
};

const RESPUESTA = [
  "La paciente presenta dilatación del sistema pielocalicial derecho. Los cálices se ven redondeados y comunican entre sí, lo que descarta quistes. Por la forma de los cálices y porque el seno renal está ocupado, lo clasifico como grado III.",
  "Para cerrar el grado mediría el espesor de la cortical, porque si está adelgazada el cuadro ya es crónico. También revisaría el jet ureteral del lado afectado para saber si hay obstrucción.",
  "No medí la cortical en este estudio porque la ventana no me lo permitió, pero por la imagen se ve delgada. Tampoco valoré el riñón contralateral.",
];

const MOCK: EntregasData = {
  grupo: "Grupo B · Nov 2026",
  grupos: ["Grupo B · Nov 2026", "Grupo A · Sep 2026", "Grupo POCUS · Oct 2026"],
  actividades: [],
  actividad: {
    id: "a1",
    clave: "M04 · L3",
    titulo: "Gradación de hidronefrosis",
    tipo: "abierta",
    consigna:
      "Explique cómo graduaría la hidronefrosis del caso y qué mediría antes de cerrar el grado.",
  },
  resumen: {
    entregadas: 24,
    delGrupo: 28,
    autoCalificadas: 14,
    porConfirmar: 6,
    promedio: 8.4,
    sinEntregar: 4,
    vencio: "venció ayer",
  },
  altaConfianza: 2,
  entregas: [
    {
      id: "e1",
      alumno: { id: "u1", ini: "KM", nombre: "Dra. Karla Méndez" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 4 h",
      nota: 9.2,
      detalleCorto: "confianza alta",
    },
    {
      id: "e2",
      alumno: { id: "u2", ini: "LA", nombre: "Dr. Luis Arreola" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 6 h",
      nota: 8.6,
      detalleCorto: "confianza alta",
    },
    {
      id: "e3",
      alumno: { id: "u3", ini: "IT", nombre: "Dr. Iván Torres" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 1 día",
      nota: 7.5,
      detalleCorto: "confianza media · revísela",
      respuesta: RESPUESTA,
      rubrica: [
        { id: "c1", texto: "Identifica el grado correcto", peso: 30, nivelAlcanzado: "Acertó: grado III, con el argumento de cálices comunicantes", puntaje: 0.95 },
        { id: "c2", texto: "Justifica con hallazgos de imagen", peso: 30, nivelAlcanzado: "Parcial: describe el seno ocupado, pero no aporta la medida", puntaje: 0.7 },
        { id: "c3", texto: "Menciona la medición de cortical", peso: 25, nivelAlcanzado: "Parcial: la menciona como plan, no la ejecuta", puntaje: 0.6 },
        { id: "c4", texto: "Valora el riñón contralateral", peso: 15, nivelAlcanzado: "No lo hizo", puntaje: 0.2 },
      ],
      ia: {
        notaSugerida: 7.5,
        confianza: "media",
        sustento: [
          { clase: "ok", texto: "Grado correcto y bien argumentado (criterio 1, 30%)" },
          { clase: "ok", texto: "Reconoce que la cortical define la cronicidad (criterio 3)" },
          { clase: "falta", texto: "No ejecuta la medición que él mismo propone" },
          { clase: "falta", texto: "Omite el riñón contralateral (criterio 4, 15%)" },
        ],
        comentario:
          "Doctor: la gradación es correcta y su razonamiento sobre los cálices comunicantes es el adecuado. Le falta ejecutar lo que usted mismo plantea — mida la cortical en ambos polos aunque la ventana sea difícil, y valore el riñón contralateral: sin eso no puede afirmar cronicidad. Buen análisis, incompleto en la ejecución.",
      },
    },
    {
      id: "e4",
      alumno: { id: "u4", ini: "HC", nombre: "Dr. Hugo Cuevas" },
      tipo: "abierta",
      estado: "requiere-lectura",
      entregadaHace: "hace 1 día",
      nota: null,
      detalleCorto: "Eco no pudo juzgarla: respuesta fuera de la rúbrica",
    },
    {
      id: "e5",
      alumno: { id: "u5", ini: "RS", nombre: "Dra. Renata Salas" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 2 días",
      nota: 10,
      detalleCorto: "10 de 10 aciertos",
    },
    {
      id: "e6",
      alumno: { id: "u6", ini: "MP", nombre: "Dra. Mariana Peña" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 2 días",
      nota: 8,
      detalleCorto: "8 de 10 aciertos",
    },
    {
      id: "e7",
      alumno: { id: "u7", ini: "JG", nombre: "Dr. Jorge Guzmán" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 3 días",
      nota: 7,
      detalleCorto: "7 de 10 aciertos",
    },
  ],
  sinEntregar: [
    { id: "u8", ini: "FI", nombre: "Dr. F. Ibarra" },
    { id: "u9", ini: "PN", nombre: "Dra. P. Navarro" },
    { id: "u10", ini: "SB", nombre: "Dr. S. Beltrán" },
    { id: "u11", ini: "LO", nombre: "Dra. L. Ortega" },
  ],
  asistente: {
    sugerencias: [
      "Resume las entregas del Grupo B",
      "¿Quién está batallando?",
      "Redacta feedback para los de nota baja",
      "¿Qué tema conviene repasar?",
    ],
    conversacion: [
      { id: "m1", de: "docente", texto: "¿Quién está batallando?" },
      {
        id: "m2",
        de: "ia",
        texto: "Tres alumnos del Grupo B, y los tres por lo mismo: no miden la cortical.",
        alumnos: [
          { ini: "HC", nombre: "Dr. Hugo Cuevas", porque: "2 tareas por debajo de 7 · falló las preguntas 4 y 7", chip: "Fuera de rúbrica" },
          { ini: "JG", nombre: "Dr. Jorge Guzmán", porque: "autoevaluación 7.0 · entrega tarde 3 de 4 veces", chip: "Se atrasa" },
          { ini: "IT", nombre: "Dr. Iván Torres", porque: "entiende el grado, no ejecuta la medición", chip: "Ejecución" },
        ],
        acciones: [{ etiqueta: "Redactar feedback a los 3", primaria: true }, { etiqueta: "Abrir sus entregas" }],
      },
      { id: "m3", de: "docente", texto: "Redacta feedback para los de nota baja" },
      {
        id: "m4",
        de: "ia",
        texto: "Tres borradores, cada uno apuntando a lo que le faltó a ese alumno. Empiezo con Cuevas:",
        borrador:
          "Doctor: confunde el quiste parapiélico con un cáliz dilatado, y de ahí se desordena todo el análisis. La prueba está en si comunica o no con el resto del sistema. Repase la lección 3 y vuelva a enviarme la tarea; el resto de su razonamiento está bien encaminado.",
        acciones: [{ etiqueta: "Usar los 3", primaria: true }, { etiqueta: "Ver los otros dos" }],
      },
    ],
  },
};

/** actividad de autoevaluación, para la vista de auditoría */
export const MOCK_AUTOEVALUACION: Actividad = {
  id: "a2",
  clave: "M04 · L3",
  titulo: "Autoevaluación de la lección",
  tipo: "autoevaluacion",
  contestada: "14 de 28 la han contestado",
  estadisticas: { promedio: 8.1, mediana: 8, masBaja: 6, masAlta: 10 },
  preguntas: [
    { n: "01", texto: "Grados de hidronefrosis: ¿cuál deforma los cálices?", aciertoPct: 93, aciertos: "13 de 14" },
    { n: "02", texto: "Plano de corte para valorar el seno renal", aciertoPct: 86, aciertos: "12 de 14" },
    { n: "03", texto: "Qué descarta que los cálices comuniquen entre sí", aciertoPct: 79, aciertos: "11 de 14" },
    { n: "04", texto: "Espesor de cortical que ya indica cronicidad", aciertoPct: 43, aciertos: "6 de 14" },
    { n: "05", texto: "Cuándo aporta el Doppler en obstrucción", aciertoPct: 71, aciertos: "10 de 14" },
    { n: "06", texto: "Significado del jet ureteral ausente", aciertoPct: 86, aciertos: "12 de 14" },
    { n: "07", texto: "Dónde se mide la cortical en el riñón", aciertoPct: 50, aciertos: "7 de 14" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<EstadoEntrega, { texto: string; clase: string; icono?: typeof Check }> = {
  auto: { texto: "Auto-calificada", clase: "bg-accent text-accent-foreground", icono: MonitorCheck },
  sugerida: {
    texto: "Nota sugerida",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: Sparkles,
  },
  "requiere-lectura": {
    texto: "Requiere lectura",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    icono: Clock,
  },
  "sin-entregar": { texto: "Sin entregar", clase: "border border-border bg-muted text-muted-foreground" },
};

function ChipEstado({ estado }: { estado: EstadoEntrega }) {
  const e = ESTADO[estado];
  const Icono = e.icono;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${e.clase}`}
    >
      {Icono && <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />}
      {e.texto}
    </span>
  );
}


function Selector({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left transition-colors hover:border-primary ${focusRing}`}
    >
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`${kicker} text-[9.5px] tracking-[0.12em] text-muted-foreground`}>{rotulo}</span>
        <span className="mt-0.5 whitespace-nowrap text-[12.5px] font-bold">{valor}</span>
      </span>
      <ChevronDown aria-hidden className="ml-auto h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
    </button>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Entregas({ data = MOCK }: { data?: EntregasData }) {
  const { grupo, actividad, resumen, entregas, sinEntregar, altaConfianza, asistente } = data;
  const [abierta, setAbierta] = useState<string | null>(null);
  const [iaAbierta, setIaAbierta] = useState(false);
  const [peticion, setPeticion] = useState("");
  const [busca, setBusca] = useState("");
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [notaLocal, setNotaLocal] = useState<number | null>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirEntrega = (id: string) => {
    const e = entregas.find((x) => x.id === id);
    setAbierta(id);
    setNotaLocal(e?.ia?.notaSugerida ?? e?.nota ?? null);
  };
  const onConfirmar = (_id: string, _nota: number | null) => {};
  const onConfirmarLote = () => {};
  const onEditarNota = (delta: number) => setNotaLocal((n) => Math.max(0, Math.min(10, (n ?? 0) + delta)));
  const onPreguntarIA = (_p: string) => {};
  const onElegirActividad = (_id: string) => {};
  const onRecordar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return entregas.filter(
      (e) =>
        (!soloAbiertas || e.tipo === "abierta") &&
        (!q || e.alumno.nombre.toLowerCase().includes(q)),
    );
  }, [entregas, soloAbiertas, busca]);

  const entrega = abierta ? entregas.find((e) => e.id === abierta) : null;

  /* ══════════ Detalle de una tarea abierta ══════════ */
  if (entrega && entrega.respuesta && entrega.rubrica && entrega.ia) {
    const ia = entrega.ia;
    return (
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-8 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAbierta(null)}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ArrowLeft aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
            Volver a las entregas
          </button>
          <Avatar ini={entrega.alumno.ini} size={40} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight">{entrega.alumno.nombre}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {grupo} · {actividad.clave} · Tarea abierta · entregó {entrega.entregadaHace}
            </p>
          </div>
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            3 de {resumen.porConfirmar} por confirmar
          </span>
        </div>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className={`${card} p-5`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Consigna</p>
                <span className={`text-[12.5px] ${softText}`}>{actividad.consigna}</span>
              </div>
              <p className={`${kicker} mt-4 text-secondary`}>Respuesta del alumno</p>
              <div className="mt-2.5 max-h-[300px] overflow-y-auto pr-1.5">
                {entrega.respuesta.map((p, i) => (
                  <p
                    key={i}
                    className={`text-[14px] leading-[1.75] ${softText} ${i ? "mt-3.5" : ""}`}
                    style={{ textWrap: "pretty" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-border pt-3.5">
                <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                  238 palabras · sin adjuntos
                </span>
                <button
                  type="button"
                  className={`ml-auto h-9 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  Ver su caso en la bitácora
                </button>
              </div>
            </section>

            {/* rúbrica del diseñador: contra esto se juzga */}
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-4">
                <p className={`${kicker} text-muted-foreground`}>Rúbrica del diseñador</p>
                <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                  {entrega.rubrica.length} criterios · 100%
                </span>
              </div>
              {entrega.rubrica.map((c) => (
                <div key={c.id} className="flex items-start gap-3 border-t border-border px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">{c.texto}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                      {c.nivelAlcanzado}
                    </span>
                  </span>
                  <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>{c.peso}%</span>
                  <span
                    className={`${mono} w-[52px] shrink-0 text-right text-[14px] font-extrabold ${
                      c.puntaje >= 0.8
                        ? "text-secondary"
                        : c.puntaje >= 0.6
                          ? "text-foreground"
                          : "text-[color:var(--warning-foreground)]"
                    }`}
                  >
                    {(c.puntaje * 10).toFixed(1)}
                  </span>
                </div>
              ))}
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-3.5">
            {/* pre-análisis de Eco: nota, sustento y comentario redactado */}
            <section className="rounded-xl border border-[color:var(--info-border)] bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
              </div>

              <div className="mt-3.5 flex items-end gap-3">
                <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}>
                  {ia.notaSugerida.toFixed(1)}
                </span>
                <span className="pb-1">
                  <span className="block text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                    nota sugerida
                  </span>
                  <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                    confianza {ia.confianza}
                  </span>
                </span>
              </div>

              <p className="mt-3.5 text-[11px] font-bold">En qué se basó</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ia.sustento.map((s) => (
                  <li key={s.texto} className="flex items-start gap-2">
                    {s.clase === "ok" ? (
                      <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.6} />
                    ) : (
                      <TriangleAlert
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                        strokeWidth={2}
                      />
                    )}
                    <span
                      className={`min-w-0 flex-1 text-[12px] font-medium leading-relaxed ${
                        s.clase === "ok" ? softText : "text-[color:var(--warning-foreground)]"
                      }`}
                    >
                      {s.texto}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] font-bold">Comentario redactado</p>
              <div className="mt-2 rounded-[10px] border border-border bg-muted p-3">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{ia.comentario}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["Más breve", "Más exigente", "Editar"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {/* la nota la pone el docente */}
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Su calificación</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditarNota(-0.5)}
                  aria-label="Bajar la nota"
                  className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                >
                  <Minus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                </button>
                <input
                  type="text"
                  value={(notaLocal ?? ia.notaSugerida).toFixed(1)}
                  onChange={(e) => setNotaLocal(Number(e.target.value.replace(",", ".")) || 0)}
                  aria-label="Nota"
                  className={`${mono} h-[52px] min-w-0 flex-1 rounded-[10px] border border-primary bg-card text-center text-[24px] font-extrabold text-foreground outline-none`}
                />
                <button
                  type="button"
                  onClick={() => onEditarNota(0.5)}
                  aria-label="Subir la nota"
                  className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                >
                  <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Cambie la nota si su criterio difiere; el comentario se guarda tal como quede arriba.
              </p>
              <button
                type="button"
                onClick={() => onConfirmar(entrega.id, notaLocal)}
                className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
                Confirmar y enviar al alumno
              </button>
              <button
                type="button"
                className={`mt-2 h-11 w-full rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Pedir que la reenvíe
              </button>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  /* ══════════ Vista por grupo / actividad ══════════ */
  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-4 px-6 pb-8 pt-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Selector rotulo="Grupo" valor={grupo} />
          <button
            type="button"
            onClick={() => onElegirActividad(actividad.id)}
            className={`inline-flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left transition-colors hover:border-primary ${focusRing}`}
          >
            <span className="flex min-w-0 flex-col leading-tight">
              <span className={`${kicker} text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
                Actividad
              </span>
              <span className="mt-0.5 whitespace-nowrap text-[12.5px] font-bold">
                {actividad.clave} · {actividad.titulo}
              </span>
            </span>
            <ChevronDown aria-hidden className="ml-auto h-[15px] w-[15px] text-muted-foreground" strokeWidth={2} />
          </button>
          <label className="flex h-10 w-[220px] items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 transition-colors focus-within:border-secondary">
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
            onClick={onConfirmarLote}
            className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            Confirmar {altaConfianza} de alta confianza
          </button>
        </div>

        {/* resumen de la actividad */}
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          {(
            [
              ["Entregadas", `${resumen.entregadas} / ${resumen.delGrupo}`, `de ${resumen.delGrupo} alumnos del grupo`, "plano"],
              ["Auto-calificadas", String(resumen.autoCalificadas), "autoevaluaciones · listas", "ok"],
              ["Por confirmar", String(resumen.porConfirmar), "tareas abiertas con nota sugerida", "warn"],
              ["Promedio del grupo", resumen.promedio.toFixed(1), "sobre lo ya calificado", "plano"],
              ["Sin entregar", String(resumen.sinEntregar), resumen.vencio, "warn"],
            ] as const
          ).map(([rot, val, sub, tono]) => (
            <div
              key={rot}
              className={`min-w-[170px] flex-1 rounded-[11px] px-4 py-3.5 ${
                tono === "ok"
                  ? "bg-accent"
                  : tono === "warn"
                    ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border border-border bg-muted"
              }`}
            >
              <p
                className={`${kicker} text-[9.5px] tracking-[0.12em] ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-muted-foreground"
                }`}
              >
                {rot}
              </p>
              <p
                className={`${mono} mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.02em] ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-foreground"
                }`}
              >
                {val}
              </p>
              <p
                className={`mt-1 text-[11px] leading-snug ${
                  tono === "ok"
                    ? "text-accent-foreground"
                    : tono === "warn"
                      ? "text-[color:var(--warning-foreground)]"
                      : "text-muted-foreground"
                }`}
              >
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* la regla del reparto, dicha una vez */}
        <div className="mt-4 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
          <Sparkles
            aria-hidden
            className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]"
            strokeWidth={1.75}
          />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
            <span className="font-bold">Las autoevaluaciones se califican solas</span> (opción
            múltiple, sin Eco) y las tareas abiertas ya traen nota sugerida contra la rúbrica. Eco
            propone; usted confirma — ninguna nota se asienta sola.
          </p>
        </div>

        {/* lista de entregas */}
        <section className={`${card} mt-4 overflow-hidden`}>
          <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <h2 className={`${kicker} text-muted-foreground`}>Entregas</h2>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              {resumen.entregadas} · ordenadas por lo que requiere su lectura
            </span>
            <button
              type="button"
              onClick={() => setSoloAbiertas((v) => !v)}
              aria-pressed={soloAbiertas}
              className={`ml-auto h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Solo abiertas
            </button>
          </div>

          {visibles.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onAbrirEntrega(e.id)}
              className={`flex w-full items-center gap-3.5 border-t border-border px-[18px] py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
            >
              <Avatar ini={e.alumno.ini} />
              <span className="min-w-0 flex-[1.3]">
                <span className="block text-[13.5px] font-bold leading-snug">{e.alumno.nombre}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                  {e.tipo === "abierta" ? "Tarea abierta" : "Autoevaluación"} · entregó {e.entregadaHace}
                </span>
              </span>
              <span className="w-[170px] shrink-0">
                <ChipEstado estado={e.estado} />
              </span>
              <span
                className={`min-w-0 flex-1 text-[11.5px] leading-snug ${
                  e.estado === "requiere-lectura"
                    ? "text-[color:var(--warning-foreground)]"
                    : "text-muted-foreground"
                }`}
              >
                {e.detalleCorto}
              </span>
              <span
                className={`${mono} w-16 shrink-0 text-right text-[17px] font-extrabold ${
                  e.nota === null ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {e.nota === null ? "—" : e.nota.toFixed(e.nota % 1 ? 1 : 0)}
              </span>
              <ChevronRight
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          ))}

          {/* quién no entregó */}
          <div className="flex flex-wrap items-center gap-3.5 border-t border-border bg-[color:var(--warning-surface)] px-[18px] py-3.5">
            <span
              aria-hidden
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
            >
              <TriangleAlert className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              <span className="font-bold">{sinEntregar.length} alumnos no han entregado</span> —{" "}
              {resumen.vencio}: {sinEntregar.map((a) => a.nombre).join(", ")}.
            </p>
            <button
              type="button"
              onClick={onRecordar}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
            >
              <BellRing aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              Recordarles
            </button>
          </div>
        </section>
      </div>

      {/* ══════════ Eco: riel colapsado o panel ══════════ */}
      {iaAbierta ? (
        <aside
          aria-label="Eco"
          className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
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

                    {m.alumnos && (
                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {m.alumnos.map((a) => (
                          <li
                            key={a.ini}
                            className="flex gap-2.5 rounded-[10px] border border-border px-2.5 py-2.5"
                          >
                            <Avatar ini={a.ini} size={30} />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[12px] font-bold">{a.nombre}</span>
                                <span className="inline-flex h-[18px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                                  {a.chip}
                                </span>
                              </span>
                              <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>
                                {a.porque}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
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

          <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {asistente.sugerencias.map((s) => (
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
        <aside
          aria-label="Eco"
          className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <button
            type="button"
            onClick={() => setIaAbierta(true)}
            aria-label="Abrir Eco"
            className={`grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
          >
            <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.75} />
          </button>
          <span
            aria-hidden
            className={`${kicker} text-[color:var(--info-foreground)]`}
            style={{ writingMode: "vertical-rl" }}
          >
            Asistente
          </span>
        </aside>
      )}
    </div>
  );
}

/* ═══════════════ Auditoría de una autoevaluación ═══════════════
   Se califica sola: el docente NO la califica, solo mira dónde falló el grupo.        */

export function AuditoriaAutoevaluacion({
  actividad = MOCK_AUTOEVALUACION,
  grupo = "Grupo B · Nov 2026",
}: {
  actividad?: Actividad;
  grupo?: string;
}) {
  const est = actividad.estadisticas;
  const reprobadas = (actividad.preguntas ?? []).filter((p) => p.aciertoPct < 60);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 pb-8 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
          Volver a las entregas
        </button>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">
            Autoevaluación · {actividad.clave}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {grupo} · {actividad.preguntas?.length ?? 0} preguntas de opción múltiple ·{" "}
            {actividad.contestada}
          </p>
        </div>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 text-[11.5px] font-bold text-accent-foreground">
          <MonitorCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          La califica el sistema · sin Eco
        </span>
      </div>

      <div className={`${card} mt-4 flex flex-wrap items-center gap-3 px-[18px] py-3.5`}>
        <p className={`min-w-[280px] flex-1 text-[12.5px] leading-relaxed ${softText}`}>
          <span className="font-bold text-foreground">No tiene que calificarlas.</span> Son objetivas:
          el sistema las corrigió al enviarse y la nota ya está en el expediente del alumno. Lo único
          que le toca es mirar dónde falló el grupo.
        </p>
        {est && (
          <span className="flex shrink-0 items-stretch gap-5">
            {(
              [
                ["Promedio", est.promedio.toFixed(1)],
                ["Mediana", est.mediana.toFixed(1)],
                ["Más baja", est.masBaja.toFixed(1)],
                ["Más alta", String(est.masAlta)],
              ] as const
            ).map(([r, v]) => (
              <span key={r} className="text-right">
                <span className={`${kicker} block text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
                  {r}
                </span>
                <span className={`${mono} mt-1 block text-[20px] font-extrabold`}>{v}</span>
              </span>
            ))}
          </span>
        )}
      </div>

      {reprobadas.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-2.5">
          <TriangleAlert
            aria-hidden
            className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
            strokeWidth={2}
          />
          <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            <span className="font-bold">
              {reprobadas.length === 2 ? "Dos preguntas reprobó el grupo entero" : `${reprobadas.length} preguntas las reprobó el grupo`}
            </span>{" "}
            — la {reprobadas.map((p) => Number(p.n)).join(" y la ")}, ambas sobre medir la cortical.
            Vale repasarlo en la clase del jueves.
          </p>
          <button
            type="button"
            className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
          >
            Llevarlo a la clase
          </button>
        </div>
      )}

      <section className={`${card} mt-4 overflow-hidden`}>
        <div className="flex items-center gap-3.5 px-[18px] py-3.5">
          <h2 className={`${kicker} text-muted-foreground`}>Aciertos por pregunta</h2>
          <span className={`${kicker} ml-auto w-[150px] text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
            Acierto del grupo
          </span>
          <span
            className={`${kicker} w-[110px] text-right text-[9.5px] tracking-[0.12em] text-muted-foreground`}
          >
            Aciertos
          </span>
        </div>
        {(actividad.preguntas ?? []).map((p) => {
          const bajo = p.aciertoPct < 60;
          return (
            <div
              key={p.n}
              className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3 ${
                bajo ? "bg-[color:var(--warning-surface)]" : ""
              }`}
            >
              <span
                aria-hidden
                className={`${mono} grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                  bajo ? "bg-card text-[color:var(--warning-foreground)]" : "bg-muted text-muted-foreground"
                }`}
              >
                {p.n}
              </span>
              <span
                className={`min-w-0 flex-1 text-[13px] leading-snug ${
                  bajo ? "font-semibold text-[color:var(--warning-foreground)]" : `font-medium ${softText}`
                }`}
              >
                {p.texto}
              </span>
              <span className="flex w-[150px] shrink-0 items-center gap-2.5">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className={`block h-full rounded-full ${bajo ? "bg-[color:var(--warning)]" : "bg-primary"}`}
                    style={{ width: `${p.aciertoPct}%` }}
                  />
                </span>
                <span
                  className={`${mono} shrink-0 text-[12px] font-bold ${
                    bajo ? "text-[color:var(--warning-foreground)]" : "text-foreground"
                  }`}
                >
                  {p.aciertoPct}%
                </span>
              </span>
              <span className={`${mono} w-[110px] shrink-0 text-right text-[11.5px] text-muted-foreground`}>
                {p.aciertos}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

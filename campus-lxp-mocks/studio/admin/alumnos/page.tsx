"use client";

/**
 * Studio · Alumnos — vista global de CONSULTA Y SEGUIMIENTO (súper admin / admin)
 *
 * FRONTERA CON EL ERP: el alumno como registro administrativo —alta, inscripción, matrícula,
 * pagos— vive en CORA. Esta pantalla NO da de alta ni gestiona inscripción ni cobranza: muestra
 * esos datos traídos de CORA en SOLO LECTURA y se concentra en el avance DENTRO del campus.
 *
 * Lo que la distingue de la vista de Grupos del docente es que es TRANSVERSAL: todos los alumnos
 * de todos los programas, con el filtro "solo en riesgo" como vista de trabajo.
 *
 * Color: ÁMBAR es el único color de atención (riesgo), y siempre acompañado de su motivo escrito.
 * El ROJO solo aparece en el pago vencido, etiquetado como dato de CORA.
 *
 * Stubs: onAbrirAlumno · onVerBitacora · onContactar · onFiltrar · onPreguntarEco · onAbrirCORA ·
 *        onVerHistorial · onExportar
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  History,
  Lock,
  MessageCircle,
  MoreHorizontal,
  NotebookText,
  ScanLine,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, card, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";
import { Avatar } from "@/components/Avatar";


/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoAlumno = "corriente" | "riesgo" | "activo" | "suspendido";

export type AlumnoFila = {
  id: string;
  ini: string;
  nombre: string;
  matricula: string;
  programa: string;
  grupo: string;
  avance: number;
  competencia: number;
  estado: EstadoAlumno;
  ultimaActividad: string;
  ultimaAlerta?: boolean;
  /** el motivo se escribe: nunca un puntaje suelto */
  senal?: string;
  /** cuando la señal viene del ERP y no del campus */
  senalDeCORA?: boolean;
};

export type DominioIAIM = { nombre: string; valor: number; nota?: string };

export type Expediente = {
  id: string;
  ini: string;
  nombre: string;
  matricula: string;
  programa: string;
  grupo: string;
  estado: EstadoAlumno;
  senal?: string;
  curso: { titulo: string; avance: number; esperado: number; posicion: string };
  cifras: { horas: string; casos: string; casosNota?: string; certificados: string; insignias: string };
  iaim: { dominios: DominioIAIM[]; general: number; nota: string };
  actividad: { titulo: string; detalle: string; alerta?: boolean; icono: "conexion" | "entregas" | "ateneo" | "consultas" }[];
  /** SOLO LECTURA: viene de CORA */
  cora: {
    campos: { etiqueta: string; valor: string; mono?: boolean }[];
    pagoVencido?: { titulo: string; detalle: string };
    corte: string;
  };
  eco: {
    pregunta: string;
    respuesta: string;
    puntos: { texto: string; tono: "warn" | "ok" }[];
    sugerencia: string;
    cta: string;
    sugerencias: string[];
  };
};

export type AlumnosData = {
  totales: { activos: string; enRiesgo: string; avanceMedio: string; competenciaMedia: string };
  detalleTotales: { activos: string; enRiesgo: string; avanceMedio: string; competenciaMedia: string };
  alumnos: AlumnoFila[];
  expediente: Expediente;
};

const MOCK: AlumnosData = {
  totales: { activos: "1 284", enRiesgo: "232", avanceMedio: "54%", competenciaMedia: "68" },
  detalleTotales: {
    activos: "en 11 programas · 96% con actividad esta semana",
    enRiesgo: "sin actividad, rezago o reprobando · 9 grupos concentran la mitad",
    avanceMedio: "ponderado por horas acreditadas",
    competenciaMedia: "I-AIM global · Adquisición es el dominio más bajo",
  },
  alumnos: [
    { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", matricula: "A-10428", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 48, competencia: 71, estado: "corriente", ultimaActividad: "hoy 10:24" },
    { id: "u2", ini: "HC", nombre: "Dr. Hugo Cuevas", matricula: "A-10431", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 34, competencia: 58, estado: "riesgo", ultimaActividad: "hace 12 días", ultimaAlerta: true, senal: "sin actividad" },
    { id: "u3", ini: "KM", nombre: "Dra. Karla Méndez", matricula: "A-10402", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 62, competencia: 78, estado: "corriente", ultimaActividad: "hoy 09:58" },
    { id: "u4", ini: "PN", nombre: "Dra. P. Navarro", matricula: "A-09877", programa: "Ultrasonografía Médica", grupo: "Grupo A · Sep 2026", avance: 74, competencia: 82, estado: "corriente", ultimaActividad: "ayer" },
    { id: "u5", ini: "LA", nombre: "Dr. Luis Arreola", matricula: "A-09902", programa: "Ultrasonografía Médica", grupo: "Grupo A · Sep 2026", avance: 71, competencia: 69, estado: "riesgo", ultimaActividad: "hace 3 días", senal: "reprobando" },
    { id: "u6", ini: "RS", nombre: "Dra. Renata Salas", matricula: "A-10510", programa: "POCUS en Urgencias", grupo: "Grupo POCUS · Oct", avance: 28, competencia: 44, estado: "riesgo", ultimaActividad: "hace 9 días", ultimaAlerta: true, senal: "rezago de 4 lecciones" },
    { id: "u7", ini: "JG", nombre: "Dr. Jorge Guzmán", matricula: "A-10388", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 52, competencia: 66, estado: "activo", ultimaActividad: "hace 2 días" },
    { id: "u8", ini: "MP", nombre: "Dra. Mariana Prado", matricula: "A-10144", programa: "Ultrasonido Obstétrico", grupo: "Grupo OB · Ago 2026", avance: 88, competencia: 91, estado: "corriente", ultimaActividad: "hoy 08:15" },
    { id: "u9", ini: "EC", nombre: "Dr. Emilio Cano", matricula: "A-09714", programa: "Doppler Vascular", grupo: "Grupo DV · Jul 2026", avance: 41, competencia: 52, estado: "suspendido", ultimaActividad: "hace 2 meses", ultimaAlerta: true, senal: "pago vencido · CORA", senalDeCORA: true },
  ],
  expediente: {
    id: "u2",
    ini: "HC",
    nombre: "Dr. Hugo Cuevas",
    matricula: "A-10431",
    programa: "Ultrasonografía Médica",
    grupo: "Grupo B · Nov 2026",
    estado: "riesgo",
    senal: "En riesgo · sin actividad 12 días",
    curso: { titulo: "Ultrasonografía Médica · 1000 h", avance: 34, esperado: 48, posicion: "Módulo 4 · Lección 3" },
    cifras: { horas: "196 h", casos: "6 / 9", casosNota: "casos validados · 3 rechazados", certificados: "1", insignias: "4" },
    iaim: {
      dominios: [
        { nombre: "Indicación", valor: 74 },
        { nombre: "Adquisición", valor: 44, nota: "el docente sugiere más práctica guiada" },
        { nombre: "Interpretación", valor: 58 },
        { nombre: "Decisión", valor: 56 },
      ],
      general: 58,
      nota: "10 puntos debajo de la media de su grupo. Los tres casos rechazados fueron por medición de cortical.",
    },
    actividad: [
      { titulo: "Última conexión", detalle: "hace 12 días · 4 sep 21:10", alerta: true, icono: "conexion" },
      { titulo: "Entregas", detalle: "4 de 6 entregadas · la última llegó tarde", icono: "entregas" },
      { titulo: "Ateneo", detalle: "2 casos presentados · 5 comentarios · no responde desde agosto", icono: "ateneo" },
      { titulo: "Consultas al docente", detalle: "1 abierta sin responder de su parte", icono: "consultas" },
    ],
    cora: {
      campos: [
        { etiqueta: "Matrícula", valor: "A-10431", mono: true },
        { etiqueta: "Inscripción", valor: "3 de noviembre de 2026" },
        { etiqueta: "Grupo asignado", valor: "Grupo B · Nov 2026" },
        { etiqueta: "Generación", valor: "1000 h · nov 2026" },
      ],
      pagoVencido: {
        titulo: "Pago vencido · 1 parcialidad",
        detalle: "venció el 5 de septiembre · se cobra en CORA",
      },
      corte: "hoy 06:00",
    },
    eco: {
      pregunta: "Resúmeme su avance",
      respuesta:
        "Se atoró en el mismo punto tres veces: medición de cortical. Sus 3 casos rechazados, la pregunta 7 del control y su consulta sin responder apuntan ahí.",
      puntos: [
        { texto: "Dejó de entrar tras el rechazo del 4 sep", tono: "warn" },
        { texto: "Adquisición 44: el más bajo de su grupo", tono: "warn" },
        { texto: "Iba al día hasta el módulo 3", tono: "ok" },
      ],
      sugerencia: "contactarlo con la lección de cortical y pedirle que reenvíe el caso.",
      cta: "Contactarlo con esa lección",
      sugerencias: ["¿Qué alumnos están así?", "¿Quién no se conectó esta semana?", "Compáralo con su grupo"],
    },
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<EstadoAlumno, { etiqueta: string; clase: string }> = {
  corriente: { etiqueta: "Al corriente", clase: "bg-accent text-accent-foreground" },
  riesgo: {
    etiqueta: "En riesgo",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  activo: { etiqueta: "Activo", clase: `border border-border bg-muted ${softText}` },
  suspendido: { etiqueta: "Suspendido", clase: "border border-border bg-muted text-muted-foreground" },
};

const ICONO_ACTIVIDAD = {
  conexion: AlertTriangle,
  entregas: ClipboardCheck,
  ateneo: MessageCircle,
  consultas: MessageCircle,
} as const;


function Barra({ pct, ancho = 86 }: { pct: number; ancho?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-[5px] overflow-hidden rounded-full bg-[color:var(--track)]"
        style={{ width: ancho }}
      >
        <span aria-hidden className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className={`${mono} text-[12px] font-bold`}>{pct}%</span>
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Alumnos({ data = MOCK }: { data?: AlumnosData }) {
  const { totales, detalleTotales, alumnos, expediente } = data;
  const [vista, setVista] = useState<"lista" | "expediente">("lista");
  const [soloRiesgo, setSoloRiesgo] = useState(false);
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirAlumno = (_id: string) => setVista("expediente");
  const onVerBitacora = (_id: string) => {};
  const onContactar = (_id: string) => {};
  const onVerHistorial = (_id: string) => {};
  const onFiltrar = (_f: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onAbrirCORA = (_id: string) => {};
  const onExportar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alumnos.filter(
      (a) =>
        (!q || a.nombre.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q)) &&
        (!soloRiesgo || a.estado === "riesgo"),
    );
  }, [alumnos, busca, soloRiesgo]);

  /* ══════════════════════ EXPEDIENTE ══════════════════════ */
  if (vista === "expediente") {
    const e = expediente;
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
        {/* identidad + acciones (ninguna edita CORA) */}
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a Alumnos"
            className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>

          <Avatar ini={e.ini} size={52} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">
                {e.nombre}
              </h1>
              {e.senal && (
                <span
                  className={`inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[e.estado].clase}`}
                >
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  {e.senal}
                </span>
              )}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              {e.programa} · {e.grupo} ·{" "}
              <span className={`${mono} text-muted-foreground`}>{e.matricula}</span>
            </p>
          </div>

          <div className="mt-1.5 flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => onVerBitacora(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Ver su bitácora
            </button>
            <button
              type="button"
              onClick={() => onVerHistorial(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Historial
            </button>
            <button
              type="button"
              onClick={() => onContactar(e.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Contactarlo
            </button>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {/* avance contra lo esperado */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Avance en el campus</p>

              <div className="mt-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13.5px] font-bold">{e.curso.titulo}</span>
                  <span className={`${mono} ml-auto text-[16px] font-extrabold`}>
                    {e.curso.avance}%
                  </span>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${e.curso.avance}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute top-0 h-full w-[2px] bg-sidebar"
                    style={{ left: `${e.curso.esperado}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`${mono} text-[11px] text-muted-foreground`}>
                    {e.curso.posicion} · esperado {e.curso.esperado}%
                  </span>
                  <span className="ml-auto inline-flex h-5 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                    {e.curso.esperado - e.curso.avance} pts abajo
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2.5">
                {(
                  [
                    [Clock, e.cifras.horas, "acreditadas de 1000", false],
                    [ScanLine, e.cifras.casos, e.cifras.casosNota ?? "casos validados", true],
                    [Award, e.cifras.certificados, "certificado de módulo", false],
                    [Award, e.cifras.insignias, "insignias", false],
                  ] as const
                ).map(([Icono, v, t, warn], i) => (
                  <div
                    key={i}
                    className={`min-w-0 flex-1 rounded-[11px] border p-3 ${
                      warn
                        ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                        : "border-border bg-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                        warn ? "text-[color:var(--warning-foreground)]" : "text-accent-foreground"
                      }`}
                    >
                      <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{v}</p>
                    <p
                      className={`mt-1 text-[10.5px] leading-snug ${
                        warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                      }`}
                    >
                      {t}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* competencia I-AIM, del LRS */}
            <section className={`${card} p-[18px]`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Competencia I-AIM</p>
                <span
                  className={`${mono} ml-auto inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] text-muted-foreground`}
                >
                  del LRS · xAPI
                </span>
              </div>

              <div className="mt-3.5 flex flex-col gap-3.5">
                {e.iaim.dominios.map((d) => (
                  <div key={d.nombre}>
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.nombre}</span>
                      <span
                        className={`${mono} shrink-0 text-[13px] font-bold ${
                          d.valor < 55 ? "text-[color:var(--warning-foreground)]" : ""
                        }`}
                      >
                        {d.valor}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                      <span
                        className={`block h-full rounded-full ${
                          d.valor < 55 ? "bg-[color:var(--warning)]" : "bg-primary"
                        }`}
                        style={{ width: `${d.valor}%` }}
                      />
                    </div>
                    {d.nota && (
                      <p className="mt-1 text-[10.5px] text-[color:var(--warning-foreground)]">
                        {d.nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className={`mt-3.5 border-t border-border pt-3 text-[11.5px] leading-relaxed ${softText}`}>
                Competencia general <span className={`${mono} font-bold text-foreground`}>{e.iaim.general}</span>{" "}
                · {e.iaim.nota}
              </p>
            </section>

            {/* actividad: la última conexión es la primera pista de abandono */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Actividad</p>
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {e.actividad.map((a) => {
                  const Icono = ICONO_ACTIVIDAD[a.icono];
                  return (
                    <li
                      key={a.titulo}
                      className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-3 ${
                        a.alerta ? "bg-[color:var(--warning-surface)]" : ""
                      }`}
                    >
                      <Icono
                        aria-hidden
                        className={`mt-px h-[15px] w-[15px] shrink-0 ${
                          a.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[12.5px] font-bold ${
                            a.alerta ? "text-[color:var(--warning-foreground)]" : ""
                          }`}
                        >
                          {a.titulo}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11.5px] leading-snug ${
                            a.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                          }`}
                        >
                          {a.detalle}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* rail: CORA en solo lectura + Eco */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>
                  Administrativo · CORA
                </p>
                <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                  <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  Solo lectura
                </span>
              </div>

              <div className="p-4">
                <dl className="flex flex-col gap-2.5">
                  {e.cora.campos.map((c) => (
                    <div key={c.etiqueta} className="flex items-baseline gap-2.5">
                      <dt className="w-[104px] shrink-0 text-[11.5px] text-muted-foreground">
                        {c.etiqueta}
                      </dt>
                      <dd
                        className={`min-w-0 flex-1 text-right text-[12.5px] font-semibold ${
                          c.mono ? `${mono} font-bold` : ""
                        }`}
                      >
                        {c.valor}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* el único rojo, y es dato del ERP */}
                {e.cora.pagoVencido && (
                  <div className="mt-3.5 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-3">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-[color:var(--destructive-foreground)]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-[color:var(--destructive-foreground)]">
                        {e.cora.pagoVencido.titulo}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[color:var(--destructive-foreground)]">
                        {e.cora.pagoVencido.detalle}
                      </span>
                    </span>
                  </div>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Alta, inscripción, matrícula y cobranza se editan en CORA. Aquí solo se reflejan; el
                  corte es de {e.cora.corte}.
                </p>
                <button
                  type="button"
                  onClick={() => onAbrirCORA(e.id)}
                  className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Abrir su ficha en CORA
                </button>
              </div>
            </section>

            {/* Eco: cruza señales, no repite cifras */}
            {ecoAbierto && (
              <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
                <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
                  <EcoMark size={32} invertido />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                    <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                      Sobre este alumno
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEcoAbierto(false)}
                    aria-label="Cerrar Eco"
                    className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
                  >
                    <X aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                  </button>
                </div>

                <div className="px-4 py-3.5">
                  <div className="flex justify-end">
                    <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                      {e.eco.pregunta}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2.5">
                    <EcoMark size={26} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] leading-relaxed ${softText}`}>{e.eco.respuesta}</p>

                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {e.eco.puntos.map((p) => (
                          <li
                            key={p.texto}
                            className={`flex items-start gap-2 rounded-[9px] px-2.5 py-2 ${
                              p.tono === "warn"
                                ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                            <span className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug">
                              {p.texto}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                        <span className="font-bold text-foreground">Sugerencia:</span> {e.eco.sugerencia}
                      </p>

                      <button
                        type="button"
                        onClick={() => onContactar(e.id)}
                        className={`mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                      >
                        <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {e.eco.cta}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 pb-3.5 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {e.eco.sugerencias.map((s) => (
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
                    onSubmit={(ev) => ev.preventDefault()}
                  >
                    <span className="sr-only">Pregúntele a Eco</span>
                    <input
                      type="text"
                      placeholder="Pregúntele a Eco…"
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
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════ LISTA GLOBAL ══════════════════════ */
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Alumnos</h1>
            {/* la frontera con el ERP se declara donde se puede confundir */}
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta e inscripción: CORA
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Los {totales.activos} alumnos de la escuela, de todos los programas. Aquí se consulta y se
            da seguimiento a su avance en el campus.
          </p>
        </div>

        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => onPreguntarEco("¿qué alumnos están en riesgo?")}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
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

      {/* totales; el de riesgo es el único ámbar */}
      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Alumnos activos", totales.activos, detalleTotales.activos, false],
            ["En riesgo", totales.enRiesgo, detalleTotales.enRiesgo, true],
            ["Avance medio", totales.avanceMedio, detalleTotales.avanceMedio, false],
            ["Competencia media", totales.competenciaMedia, detalleTotales.competenciaMedia, false],
          ] as const
        ).map(([t, v, s, warn]) => (
          <li
            key={t}
            className={`rounded-xl border p-4 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${
              warn
                ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                : "border-border bg-card"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {t}
            </p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>
              {v}
            </p>
            <p
              className={`mt-1.5 text-[11px] leading-snug ${
                warn ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {s}
            </p>
          </li>
        ))}
      </ul>

      {/* filtros: transversal a programas, grupos y generaciones */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[270px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre o matrícula</span>
          <input
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Buscar por nombre o matrícula…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        {["Cualquier programa", "Cualquier grupo", "Generación", "Estado"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onFiltrar(t)}
            className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            {t}
            <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSoloRiesgo((v) => !v)}
          aria-pressed={soloRiesgo}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[12.5px] font-bold transition-colors ${focusRing} ${
            soloRiesgo
              ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
              : `border-border bg-card ${softText}`
          }`}
        >
          <AlertTriangle aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          Solo en riesgo · {totales.enRiesgo}
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {soloRiesgo ? totales.enRiesgo : totales.activos}
          {soloRiesgo ? " en riesgo" : " · sin filtros"}
        </span>
      </div>

      {/* tabla */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ["Alumno", "flex-[1.5]"],
              ["Programa y grupo", "flex-[1.2] min-w-0"],
              ["Avance del curso", "shrink-0 w-[132px]"],
              ["I-AIM", "shrink-0 w-[74px] text-center"],
              ["Estado y señal", "shrink-0 w-[196px]"],
              ["Última actividad", "shrink-0 w-[118px]"],
              ["", "shrink-0 w-[62px]"],
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

        {visibles.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
              a.estado === "riesgo" ? "bg-[#fffdf7]" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onAbrirAlumno(a.id)}
              title="Ver su expediente"
              className={`flex min-w-0 flex-[1.5] items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
            >
              <Avatar ini={a.ini} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                  {a.matricula}
                </span>
              </span>
            </button>

            <span className="min-w-0 flex-[1.2]">
              <span className="block truncate text-[12px] font-semibold">{a.programa}</span>
              <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                {a.grupo}
              </span>
            </span>

            <span className="w-[132px] shrink-0">
              <Barra pct={a.avance} />
            </span>

            <span className="w-[74px] shrink-0 text-center">
              <span
                className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                  a.competencia >= 70
                    ? "bg-accent text-accent-foreground"
                    : a.competencia >= 55
                      ? `bg-muted ${softText}`
                      : "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                }`}
              >
                {a.competencia}
              </span>
            </span>

            <span className="w-[196px] shrink-0">
              <span
                className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}
              >
                {a.estado === "riesgo" && (
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                )}
                {ESTADO[a.estado].etiqueta}
              </span>
              {a.senal && (
                <span
                  className={`mt-1 block text-[10.5px] ${
                    a.senalDeCORA
                      ? "text-[color:var(--destructive-foreground)]"
                      : "text-[color:var(--warning-foreground)]"
                  }`}
                >
                  {a.senal}
                </span>
              )}
            </span>

            <span
              className={`${mono} w-[118px] shrink-0 whitespace-nowrap text-[11px] ${
                a.ultimaAlerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {a.ultimaActividad}
            </span>

            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={`Más acciones de ${a.nombre}`}
                className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <ChevronRight
                aria-hidden
                className="h-[15px] w-[15px] shrink-0 text-[color:var(--track)]"
                strokeWidth={2}
              />
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

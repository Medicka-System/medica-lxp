"use client";

/**
 * Studio · Inicio del SÚPER ADMIN — centro de control
 *
 * El súper admin no construye ni evalúa: GOBIERNA y VIGILA. La pantalla responde dos preguntas
 * distintas, en dos capas declaradas:
 *   CAPA 1 · Pulso del negocio  → ¿cómo va la escuela?
 *   CAPA 2 · Salud del sistema  → ¿todo está funcionando? (solo él ve esta capa)
 *   CAPA 3 · Atención y actividad → qué exige su firma y qué solo se observa.
 *
 * Reglas de color: el ROJO se reserva para integración caída y dinero vencido; todo lo demás
 * pendiente es ÁMBAR. El violeta es Eco.
 *
 * La cartera llega de CORA en solo lectura: la cobranza no se opera aquí.
 *
 * Stubs: onVerGrupo · onVerAlerta · onEmitirCertificado · onPreguntarEco · onIrAConfig ·
 *        onAbrirCORA · onResolverSolicitud
 */

import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Check,
  ChevronRight,
  CreditCard,
  Database,
  ExternalLink,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Scale,
  Send,
  Settings,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, card, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";


function SondaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6v8a3 3 0 0 1-6 0z" />
      <path d="M12 14v3" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0z" />
    </svg>
  );
}

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoIntegracion = "ok" | "degradada" | "caida";

export type Kpi = {
  id: string;
  titulo: string;
  valor: string;
  unidad: string;
  delta?: string;
  deltaPositivo?: boolean;
  pie: string;
  icono: "alumnos" | "grupos" | "programas" | "inscripciones";
};

export type PuntoTendencia = { mes: string; valor: string; altura: number };

export type Integracion = {
  id: string;
  nombre: string;
  estado: EstadoIntegracion;
  detalle: string;
  meta: string;
  icono: "zoom" | "mico" | "cora" | "pagos" | "correo";
};

export type GastoIA = {
  monto: string;
  moneda: string;
  periodo: string;
  pctTope: number;
  tope: string;
  desglose: { tarea: string; monto: string; pct: string }[];
};

export type MedidorSistema = {
  titulo: string;
  valor: string;
  pct?: number;
  detalle: string;
  icono: "almacenamiento" | "colas" | "lrs";
};

export type Alerta = {
  id: string;
  titulo: string;
  detalle: string;
  gravedad: "critica" | "media";
};

export type Decision = {
  id: string;
  n: number;
  titulo: string;
  detalle: string;
  cta: string;
  icono: "certificados" | "accesos" | "escaladas";
};

export type ActividadStaff = {
  id: string;
  ini: string;
  nombre: string;
  accion: string;
  meta: string;
  rol: "docente" | "diseñador";
};

export type AdminHomeData = {
  fecha: string;
  kpis: Kpi[];
  tendencia: { puntos: PuntoTendencia[]; resumen: { valor: string; etiqueta: string }[] };
  avance: { titulo: string; pct: number; detalle: string }[];
  riesgo: { n: number; detalle: string };
  cartera: {
    pctAlCorriente: string;
    cortes: { etiqueta: string; valor: string; tono: "ok" | "porVencer" | "vencido" }[];
    ultimoCorte: string;
  };
  integraciones: Integracion[];
  gastoIA: GastoIA;
  sistema: MedidorSistema[];
  alertas: Alerta[];
  decisiones: Decision[];
  actividad: ActividadStaff[];
  ateneo: { casos: number; comentarios: number; sinResponder: number };
  eco: {
    pregunta: string;
    intro: string;
    puntos: { titulo: string; detalle: string; tono: "critica" | "media" | "info" }[];
    cierre: string;
    sugerencias: string[];
  };
};

const MOCK: AdminHomeData = {
  fecha: "Martes 16 de septiembre",
  kpis: [
    { id: "k1", titulo: "Alumnos activos", valor: "1 284", unidad: "en 11 programas", delta: "+64 este mes", deltaPositivo: true, pie: "96% con actividad esta semana", icono: "alumnos" },
    { id: "k2", titulo: "Grupos abiertos", valor: "38", unidad: "de 46 creados", delta: "+3", deltaPositivo: true, pie: "8 cierran en diciembre", icono: "grupos" },
    { id: "k3", titulo: "Programas activos", valor: "11", unidad: "plantillas vivas", delta: "2 en revisión", pie: "1 borrador sin publicar", icono: "programas" },
    { id: "k4", titulo: "Inscripciones", valor: "87", unidad: "últimos 30 días", delta: "+18%", deltaPositivo: true, pie: "llegan de CORA cada noche", icono: "inscripciones" },
  ],
  tendencia: {
    puntos: [
      { mes: "abr", valor: "946", altura: 52 },
      { mes: "may", valor: "1 012", altura: 61 },
      { mes: "jun", valor: "1 044", altura: 58 },
      { mes: "jul", valor: "1 118", altura: 74 },
      { mes: "ago", valor: "1 220", altura: 86 },
      { mes: "sep", valor: "1 284", altura: 100 },
    ],
    resumen: [
      { valor: "+35.7%", etiqueta: "alumnos vs abril" },
      { valor: "412", etiqueta: "casos subidos en septiembre" },
      { valor: "9 840 h", etiqueta: "acreditadas este ciclo" },
    ],
  },
  avance: [
    { titulo: "Avance medio de los 38 grupos", pct: 54, detalle: "ponderado por horas acreditadas" },
    { titulo: "Alumnos al día", pct: 82, detalle: "1 052 de 1 284" },
  ],
  riesgo: {
    n: 232,
    detalle: "sin actividad 14+ días o reprobando · 9 grupos concentran la mitad",
  },
  cartera: {
    pctAlCorriente: "94.2%",
    cortes: [
      { etiqueta: "Al corriente", valor: "1 210", tono: "ok" },
      { etiqueta: "Por vencer (7 días)", valor: "52", tono: "porVencer" },
      { etiqueta: "Vencido", valor: "22", tono: "vencido" },
    ],
    ultimoCorte: "hoy 06:00",
  },
  integraciones: [
    { id: "i1", nombre: "MiCo+ · Mindray", estado: "caida", detalle: "Sin respuesta desde las 11:42. La sesión de mañana está en riesgo.", meta: "hace 2 h", icono: "mico" },
    { id: "i2", nombre: "Zoom", estado: "ok", detalle: "Salas y grabaciones al día", meta: "18 sesiones hoy", icono: "zoom" },
    { id: "i3", nombre: "CORA · ERP", estado: "ok", detalle: "Último sync completo", meta: "hoy 06:00", icono: "cora" },
    { id: "i4", nombre: "Pasarela de pagos", estado: "degradada", detalle: "Latencia alta en los cobros recurrentes", meta: "2.8 s medio", icono: "pagos" },
    { id: "i5", nombre: "Correo transaccional", estado: "ok", detalle: "1 284 envíos, 0.4% de rebote", meta: "últimas 24 h", icono: "correo" },
  ],
  gastoIA: {
    monto: "$ 1 840",
    moneda: "MXN",
    periodo: "septiembre",
    pctTope: 61,
    tope: "$3 000",
    desglose: [
      { tarea: "Pre-análisis de casos", monto: "$ 842", pct: "46%" },
      { tarea: "Borradores de respuesta", monto: "$ 513", pct: "28%" },
      { tarea: "Resúmenes y consultas", monto: "$ 312", pct: "17%" },
      { tarea: "Calificación sugerida", monto: "$ 173", pct: "9%" },
    ],
  },
  sistema: [
    { titulo: "Almacenamiento DICOM y video", valor: "4.8 / 8 TB", pct: 60, detalle: "crece 240 GB al mes · alcanza para 13 meses", icono: "almacenamiento" },
    { titulo: "Colas y workers", valor: "3 en cola", detalle: "transcodificación al día · 0 trabajos fallidos", icono: "colas" },
    { titulo: "LRS · xAPI", valor: "1.2 M eventos", detalle: "último evento hace 4 s", icono: "lrs" },
  ],
  alertas: [
    { id: "a1", titulo: "MiCo+ sin respuesta desde las 11:42", detalle: "La sesión de mañana 18:30 con el Grupo POCUS depende del equipo. Revise credenciales o avise al docente.", gravedad: "critica" },
    { id: "a2", titulo: "Pasarela con latencia alta", detalle: "Los cobros recurrentes tardan 2.8 s; no hay pagos perdidos.", gravedad: "media" },
    { id: "a3", titulo: "Aval académico por renovar", detalle: "El aval de Ultrasonografía Médica vence en 38 días.", gravedad: "media" },
    { id: "a4", titulo: "2 claves de API sin rotar", detalle: "Zoom y CORA llevan 11 meses con la misma clave.", gravedad: "media" },
  ],
  decisiones: [
    { id: "d1", n: 14, titulo: "certificados por emitir", detalle: "alumnos que ya acreditaron las 1000 h · avala Dr. Lugo", cta: "Revisar", icono: "certificados" },
    { id: "d2", n: 3, titulo: "solicitudes de acceso", detalle: "2 docentes nuevos y 1 cambio de rol a diseñador", cta: "Ver", icono: "accesos" },
    { id: "d3", n: 2, titulo: "aprobaciones escaladas", detalle: "un caso rechazado dos veces y una baja de grupo", cta: "Resolver", icono: "escaladas" },
  ],
  actividad: [
    { id: "s1", ini: "AS", nombre: "Dr. Sandoval", accion: "validó 7 casos", meta: "Grupo B · hace 40 min", rol: "docente" },
    { id: "s2", ini: "MV", nombre: "Mariana V.", accion: "publicó la v4 de Ultrasonografía Médica", meta: "8 grupos actualizados · hace 2 h", rol: "diseñador" },
    { id: "s3", ini: "KL", nombre: "Dra. Lugo", accion: "calificó 12 entregas", meta: "Grupo A · hace 3 h", rol: "docente" },
    { id: "s4", ini: "HC", nombre: "Hugo C.", accion: "curó 4 casos a la Biblioteca", meta: "hace 5 h", rol: "diseñador" },
  ],
  ateneo: { casos: 28, comentarios: 196, sinResponder: 4 },
  eco: {
    pregunta: "Resúmeme la semana",
    intro: "La escuela creció +22 alumnos y se acreditaron 640 h. Tres cosas que sí piden su atención:",
    puntos: [
      { titulo: "MiCo+ caída", detalle: "desde las 11:42; mañana hay sesión", tono: "critica" },
      { titulo: "9 grupos concentran el riesgo", detalle: "116 de los 232 alumnos en riesgo", tono: "media" },
      { titulo: "Gasto de IA al 61%", detalle: "proyecta $2 410 al cierre, dentro del tope", tono: "info" },
    ],
    cierre: "Lo demás va bien: cartera al 94.2% y el staff validó 41 casos.",
    sugerencias: ["¿Qué grupos van en riesgo?", "¿Cómo va el gasto de IA?", "¿Qué staff está más cargado?"],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ICONO_KPI = {
  alumnos: Users,
  grupos: LayoutGrid,
  programas: BarChart3,
  inscripciones: Plus,
} as const;

const ICONO_INTEGRACION = {
  zoom: Video,
  mico: SondaIcon,
  cora: Database,
  pagos: CreditCard,
  correo: Mail,
} as const;

const ICONO_SISTEMA = { almacenamiento: Database, colas: Scale, lrs: TrendingUp } as const;
const ICONO_DECISION = { certificados: Award, accesos: KeyRound, escaladas: Scale } as const;

/** El rojo solo por integración caída (y dinero vencido, en cartera). */
const SEMAFORO: Record<EstadoIntegracion, { etiqueta: string; clase: string; borde: string; fondoFila: string }> = {
  ok: { etiqueta: "Operativa", clase: "bg-accent text-accent-foreground", borde: "border-border", fondoFila: "bg-card" },
  degradada: {
    etiqueta: "Degradada",
    clase: "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    borde: "border-border",
    fondoFila: "bg-card",
  },
  caida: {
    etiqueta: "Caída",
    clase: "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
    borde: "border-[color:var(--destructive-border)]",
    fondoFila: "bg-[color:var(--destructive-surface)]",
  },
};

function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota?: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      {nota && <span className="text-[11.5px] text-muted-foreground">{nota}</span>}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function AdminInicio({ data = MOCK }: { data?: AdminHomeData }) {
  const {
    fecha,
    kpis,
    tendencia,
    avance,
    riesgo,
    cartera,
    integraciones,
    gastoIA,
    sistema,
    alertas,
    decisiones,
    actividad,
    ateneo,
    eco,
  } = data;
  const [rango, setRango] = useState<"6m" | "12m">("6m");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onVerGrupo = (_id: string) => {};
  const onVerAlerta = (_id: string) => {};
  const onEmitirCertificado = () => {};
  const onPreguntarEco = (_q: string) => {};
  const onIrAConfig = (_area: string) => {};
  const onAbrirCORA = () => {};
  const onResolverSolicitud = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const caidas = integraciones.filter((i) => i.estado === "caida").length;

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      {/* cabecera + accesos de gobierno */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            Centro de control
          </h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            {fecha} · cómo va la escuela y si todo está funcionando.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(
            [
              ["Usuarios y roles", Users],
              ["Integraciones", ExternalLink],
              ["Analítica", TrendingUp],
              ["Configuración", Settings],
            ] as const
          ).map(([t, Icono]) => (
            <button
              key={t}
              type="button"
              onClick={() => onIrAConfig(t)}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ CAPA 1 · PULSO DEL NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Pulso del negocio" />

      <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icono = ICONO_KPI[k.icono];
          return (
            <li key={k.id} className={`${card} p-[18px]`}>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
                >
                  <Icono className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{k.titulo}</p>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2.5">
                <span className={`${mono} text-[34px] font-extrabold leading-none tracking-[-0.03em]`}>
                  {k.valor}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground">{k.unidad}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {k.delta && (
                  <span
                    className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
                      k.deltaPositivo ? "bg-accent text-accent-foreground" : `bg-muted ${softText}`
                    }`}
                  >
                    {k.deltaPositivo && <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />}
                    {k.delta}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {k.pie}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* tendencia */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Crecimiento y actividad</p>
            <div className="ml-auto flex gap-1 rounded-full bg-muted p-[3px]">
              {(
                [
                  ["6m", "6 meses"],
                  ["12m", "12 meses"],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRango(id)}
                  aria-pressed={rango === id}
                  className={`h-[26px] whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold transition-colors ${focusRing} ${
                    rango === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex h-[132px] items-end gap-2.5">
            {tendencia.puntos.map((p, i, arr) => {
              const ultimo = i === arr.length - 1;
              return (
                <span key={p.mes} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span
                    className={`${mono} text-[10px] font-bold ${ultimo ? "text-secondary" : "text-muted-foreground"}`}
                  >
                    {p.valor}
                  </span>
                  <span
                    aria-hidden
                    className="w-full rounded-t-[7px]"
                    style={{
                      height: p.altura,
                      background: ultimo ? "var(--primary)" : "#d6e3ea",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.mes}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-border pt-3.5">
            {tendencia.resumen.map((r, i) => (
              <span key={r.etiqueta} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="h-3.5 w-px bg-border" />}
                <span className="inline-flex items-baseline gap-1.5">
                  <span className={`${mono} text-[13px] font-bold`}>{r.valor}</span>
                  <span className="text-[11.5px] text-muted-foreground">{r.etiqueta}</span>
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* avance + riesgo */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Avance de la escuela</p>
          <div className="mt-4 flex flex-col gap-4">
            {avance.map((a) => (
              <div key={a.titulo}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{a.titulo}</span>
                  <span className={`${mono} shrink-0 text-[13px] font-bold`}>{a.pct}%</span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{a.detalle}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onVerGrupo("riesgo")}
            className={`mt-4 flex w-full items-center gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3 text-left ${focusRing}`}
          >
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
            >
              <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[color:var(--warning-foreground)]">
                {riesgo.n} alumnos en riesgo
              </span>
              <span className="mt-0.5 block text-[11px] text-[color:var(--warning-foreground)]">
                {riesgo.detalle}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
              strokeWidth={2}
            />
          </button>
        </section>

        {/* cartera: llega de CORA, solo lectura */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Cartera · desde CORA</p>
            <span
              className={`inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
            >
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Solo lectura
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>
              {cartera.pctAlCorriente}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">al corriente</span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2.5">
            {cartera.cortes.map((c) => {
              const tono =
                c.tono === "ok"
                  ? "bg-accent text-accent-foreground"
                  : c.tono === "porVencer"
                    ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                    : "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]";
              return (
                <li key={c.etiqueta} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 ${tono}`}>
                  <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{c.etiqueta}</span>
                  <span className={`${mono} shrink-0 text-[13px] font-bold`}>{c.valor}</span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            La cobranza vive en CORA; aquí solo se refleja. Último corte: {cartera.ultimoCorte}.
          </p>
          <button
            type="button"
            onClick={onAbrirCORA}
            className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Abrir CORA
          </button>
        </section>
      </div>

      {/* ══════════════ CAPA 2 · SALUD DEL SISTEMA ══════════════ */}
      <RotuloCapa color="var(--sidebar)" titulo="Salud del sistema" nota="solo usted ve esta capa" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,1.1fr)]">
        {/* integraciones con semáforo */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Integraciones</p>
            {caidas > 0 && (
              <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-2 text-[10px] font-bold text-[color:var(--destructive-foreground)]">
                {caidas} caída{caidas > 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => onIrAConfig("Integraciones")}
              className={`ml-auto h-8 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Configurar
            </button>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2">
            {integraciones.map((it) => {
              const sem = SEMAFORO[it.estado];
              const Icono = ICONO_INTEGRACION[it.icono];
              return (
                <li
                  key={it.id}
                  className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${sem.borde} ${sem.fondoFila}`}
                >
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${sem.clase}`}
                  >
                    <Icono className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{it.nombre}</span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        it.estado === "ok"
                          ? "text-muted-foreground"
                          : it.estado === "caida"
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                      }`}
                    >
                      {it.detalle}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`${mono} whitespace-nowrap text-[10.5px] text-muted-foreground`}>
                      {it.meta}
                    </span>
                    <span
                      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${sem.clase}`}
                    >
                      <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-current" />
                      {sem.etiqueta}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Eco: servicio con presupuesto */}
        <section className={`${card} border-[color:var(--info-border)] p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <EcoMark size={30} />
            <p className={`${kicker} min-w-0 flex-1 text-[color:var(--info-foreground)]`}>
              Eco · consumo del periodo
            </p>
            <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[10.5px] font-bold text-accent-foreground">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-current" />
              Operativo
            </span>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>
              {gastoIA.monto}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {gastoIA.moneda} en {gastoIA.periodo}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="h-[7px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
              role="progressbar"
              aria-valuenow={gastoIA.pctTope}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Consumo contra el tope mensual"
            >
              <span
                className="block h-full rounded-full bg-[color:var(--info)]"
                style={{ width: `${gastoIA.pctTope}%` }}
              />
            </div>
            <span className={`${mono} shrink-0 text-[11.5px] font-bold text-[color:var(--info-foreground)]`}>
              {gastoIA.pctTope}% del tope
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tope mensual configurado: {gastoIA.tope}. Al 80% se le avisa; al 100% Eco se pausa.
          </p>

          <ul className="mt-3.5 flex flex-col gap-2 border-t border-border pt-3.5">
            {gastoIA.desglose.map((d) => (
              <li key={d.tarea} className="flex items-center gap-2.5">
                <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${softText}`}>
                  {d.tarea}
                </span>
                <span className={`${mono} shrink-0 text-[11.5px] font-bold`}>{d.monto}</span>
                <span className={`${mono} w-[34px] shrink-0 text-right text-[10.5px] text-muted-foreground`}>
                  {d.pct}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onIrAConfig("IA/Eco")}
            className={`mt-3.5 h-10 w-full rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            Modelos y costos por tarea
          </button>
        </section>

        {/* sistema + alertas */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Estado del sistema</p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {sistema.map((m) => {
              const Icono = ICONO_SISTEMA[m.icono];
              return (
                <li key={m.titulo} className="flex items-center gap-3 rounded-[11px] border border-border px-3.5 py-3">
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted ${softText}`}
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold">{m.titulo}</span>
                      <span className={`${mono} shrink-0 text-[12px] font-bold`}>{m.valor}</span>
                    </span>
                    {m.pct !== undefined && (
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${m.pct}%` }} />
                      </span>
                    )}
                    <span className="mt-1.5 block text-[10.5px] text-muted-foreground">{m.detalle}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className={`${kicker} mt-5 text-muted-foreground`}>Alertas pendientes</p>
          <ul className="mt-3 flex flex-col gap-2">
            {alertas.map((a) => {
              const critica = a.gravedad === "critica";
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onVerAlerta(a.id)}
                    className={`flex w-full items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-left ${focusRing} ${
                      critica
                        ? "border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]"
                        : "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    }`}
                  >
                    <AlertTriangle
                      aria-hidden
                      className={`mt-0.5 h-[15px] w-[15px] shrink-0 ${
                        critica
                          ? "text-[color:var(--destructive-foreground)]"
                          : "text-[color:var(--warning-foreground)]"
                      }`}
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[12.5px] font-bold ${
                          critica
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                        }`}
                      >
                        {a.titulo}
                      </span>
                      <span
                        className={`mt-1 block text-[11.5px] leading-relaxed ${
                          critica
                            ? "text-[color:var(--destructive-foreground)]"
                            : "text-[color:var(--warning-foreground)]"
                        }`}
                      >
                        {a.detalle}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className={`h-[15px] w-[15px] shrink-0 ${
                        critica
                          ? "text-[color:var(--destructive-foreground)]"
                          : "text-[color:var(--warning-foreground)]"
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ══════════════ CAPA 3 · ATENCIÓN Y ACTIVIDAD ══════════════ */}
      <RotuloCapa color="var(--warning)" titulo="Atención y actividad" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* lo que exige su firma */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Requiere su decisión</p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {decisiones.map((d) => {
              const Icono = ICONO_DECISION[d.icono];
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-card text-[color:var(--warning-foreground)]"
                  >
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`${mono} text-[15px] font-extrabold`}>{d.n}</span>
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--warning-foreground)]">
                        {d.titulo}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-[color:var(--warning-foreground)]">
                      {d.detalle}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => (d.icono === "certificados" ? onEmitirCertificado() : onResolverSolicitud(d.id))}
                    className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                  >
                    {d.cta}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* lo que solo se observa */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Actividad del staff · hoy</p>
            <button
              type="button"
              className={`h-[30px] shrink-0 rounded-full px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Ver todo
            </button>
          </div>

          <ul className="mt-2.5 flex flex-col gap-0.5">
            {actividad.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 transition-colors hover:bg-muted">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-sidebar text-[10.5px] font-bold text-sidebar-foreground"
                >
                  {a.ini}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12.5px] leading-snug ${softText}`}>
                    <span className="font-bold text-foreground">{a.nombre}</span> {a.accion}
                  </span>
                  <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                    {a.meta}
                  </span>
                </span>
                <span
                  className={`inline-flex h-[19px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted px-[7px] text-[9.5px] font-semibold ${softText}`}
                >
                  {a.rol}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3.5 flex items-center gap-3 border-t border-border pt-3.5">
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
            >
              <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold">Ateneo global</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {ateneo.casos} casos presentados esta semana · {ateneo.comentarios} comentarios ·{" "}
                {ateneo.sinResponder} sin responder
              </span>
            </span>
            <button
              type="button"
              className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Abrir
            </button>
          </div>
        </section>

        {/* Eco: no repite las cifras de arriba, dice qué pide atención */}
        <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
          <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
            <EcoMark size={32} invertido />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                Sobre toda la operación
              </p>
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="flex justify-end">
              <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {eco.pregunta}
              </p>
            </div>

            <div className="mt-3 flex gap-2.5">
              <EcoMark size={26} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{eco.intro}</p>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {eco.puntos.map((p) => {
                    const tono =
                      p.tono === "critica"
                        ? "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]"
                        : p.tono === "media"
                          ? "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                          : "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]";
                    return (
                      <li key={p.titulo} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2.5 ${tono}`}>
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">{p.titulo}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug">{p.detalle}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.cierre}</p>
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
              <span className="sr-only">Pregúntele a Eco sobre la operación</span>
              <input
                type="text"
                placeholder="Pregúntele a Eco sobre la operación…"
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
      </div>
    </div>
  );
}

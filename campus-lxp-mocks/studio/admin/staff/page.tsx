"use client";

/**
 * Studio · Staff — vista operativa del equipo (súper admin / admin)
 *
 * FRONTERA: el ALTA de usuarios y la asignación de roles viven en Configuración → Usuarios y roles.
 * Aquí se ve quién es staff, qué rol tiene y CÓMO VA SU CARGA; las acciones de gobierno enlazan a
 * esa pantalla y quedan en auditoría.
 *
 * No mide "productividad": mide carga y capacidad de respuesta, que es lo que un director puede
 * repartir. El ÁMBAR es el único color de atención y siempre va con su motivo escrito
 * ("9 casos en cola", "responde en 38 h", "inactivo 2 meses") — nunca un puntaje de desempeño.
 *
 * El detalle cambia con el rol: docente → grupos, cola, respuesta, consultas · diseñador →
 * programas y contenido publicado · admin → alcance.
 *
 * Stubs: onAbrirMiembro · onInvitar · onCambiarRol · onActivar · onFiltrar · onPreguntarEco ·
 *        onVerActividad
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  History,
  Lock,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Phone,
  Plus,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, card, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";
import { Avatar } from "@/components/Avatar";


function SondaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6v8a3 3 0 0 1-6 0z" />
      <path d="M12 14v3" />
      <path d="M8.5 20a3.5 3.5 0 0 1 7 0z" />
    </svg>
  );
}

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Rol = "super" | "admin" | "disenador" | "docente";

export type MiembroStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  area: string;
  /** qué tiene a su cargo: grupos, programas o alcance */
  cargo: string;
  actividad: string;
  ultimaSesion: string;
  ultimaAlerta?: boolean;
  /** el motivo se escribe: sobrecarga, lentitud, inactividad */
  senal?: string;
};

export type GrupoACargo = { nombre: string; alumnos: number; avance: number; cola?: string };

export type DetalleStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  area: string;
  desde: string;
  correo: string;
  telefono: string;
  senal?: string;
  cifras: { etiqueta: string; valor: string; icono: "grupos" | "casos" | "reloj" | "consultas"; alerta?: boolean }[];
  aviso?: { titulo: string; detalle: string };
  grupos?: GrupoACargo[];
  registro: { titulo: string; detalle: string; alerta?: boolean; icono: "casos" | "cola" | "entregas" | "consultas" }[];
  permisos: { etiqueta: string; valor: string }[];
  eco: {
    pregunta: string;
    respuesta: string;
    comparativa: { quien: string; detalle: string; pct: number; alerta?: boolean }[];
    sugerencia: string;
    cta: string;
    sugerencias: string[];
  };
};

export type StaffData = {
  totales: { activo: string; sobrecarga: string; validados: string; respuesta: string };
  detalleTotales: { activo: string; sobrecarga: string; validados: string; respuesta: string };
  conteos: { todos: number; docentes: number; disenadores: number; admins: number };
  staff: MiembroStaff[];
  detalle: DetalleStaff;
};

const MOCK: StaffData = {
  totales: { activo: "34", sobrecarga: "3", validados: "128", respuesta: "9 h" },
  detalleTotales: {
    activo: "18 docentes · 9 diseñadores · 6 admins · 1 súper admin",
    sobrecarga: "más de 8 casos en cola o respuesta arriba de 36 h",
    validados: "el 32% los validó una sola persona",
    respuesta: "de consulta del alumno a respuesta del docente",
  },
  conteos: { todos: 34, docentes: 18, disenadores: 9, admins: 7 },
  staff: [
    { id: "s1", ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "docente", activo: true, area: "Renal y abdomen", cargo: "3 grupos · 68 alumnos", actividad: "41 casos validados esta semana", senal: "sobrecarga: 9 casos en cola", ultimaSesion: "hoy 10:40" },
    { id: "s2", ini: "KL", nombre: "Dra. Karla Lugo", rol: "docente", activo: true, area: "Urgencias y POCUS", cargo: "2 grupos · 44 alumnos", actividad: "12 entregas calificadas", ultimaSesion: "hoy 09:12" },
    { id: "s3", ini: "MP", nombre: "Dra. Mariana Peña", rol: "docente", activo: true, area: "Obstétrico", cargo: "1 grupo · 24 alumnos", actividad: "6 casos validados", senal: "responde en 38 h", ultimaSesion: "ayer" },
    { id: "s4", ini: "HC", nombre: "Hugo Cuevas", rol: "disenador", activo: true, area: "Contenido y casos", cargo: "4 programas", actividad: "curó 4 casos a Biblioteca", ultimaSesion: "hace 5 h" },
    { id: "s5", ini: "MV", nombre: "Mariana Valdés", rol: "disenador", activo: true, area: "Diseño instruccional", cargo: "6 programas", actividad: "publicó la v4 de Ultrasonografía", ultimaSesion: "hace 2 h" },
    { id: "s6", ini: "SG", nombre: "Sandra Godoy", rol: "admin", activo: true, area: "Operación académica", cargo: "11 programas · 38 grupos", actividad: "abrió 3 grupos", ultimaSesion: "hoy 08:05" },
    { id: "s7", ini: "RV", nombre: "Rodrigo Vargas", rol: "super", activo: true, area: "Gobierno", cargo: "Toda la plataforma", actividad: "4 cambios de configuración", ultimaSesion: "hoy 12:40" },
    { id: "s8", ini: "JD", nombre: "Dr. Javier Duarte", rol: "docente", activo: false, area: "Doppler", cargo: "sin grupos asignados", actividad: "sin actividad desde julio", senal: "inactivo 2 meses", ultimaSesion: "hace 2 meses", ultimaAlerta: true },
  ],
  detalle: {
    id: "s1",
    ini: "AS",
    nombre: "Dr. Alejandro Sandoval",
    rol: "docente",
    activo: true,
    area: "Renal y abdomen",
    desde: "marzo de 2024",
    correo: "a.sandoval@medicacapacitacion.mx",
    telefono: "+52 33 1188 4420",
    senal: "Sobrecarga · 9 casos en cola",
    cifras: [
      { etiqueta: "grupos · 68 alumnos", valor: "3", icono: "grupos" },
      { etiqueta: "casos en cola · 3 con más de 72 h", valor: "9", icono: "casos", alerta: true },
      { etiqueta: "tiempo medio de respuesta", valor: "6 h", icono: "reloj" },
      { etiqueta: "consultas atendidas este mes", valor: "24", icono: "consultas" },
    ],
    aviso: {
      titulo: "Valida el 32% de los casos de la escuela.",
      detalle:
        "Tiene 9 en cola y es el único docente de renal; considere repartir el área o abrirle apoyo.",
    },
    grupos: [
      { nombre: "Grupo B · Nov 2026", alumnos: 28, avance: 48, cola: "4 casos en cola" },
      { nombre: "Grupo A · Sep 2026", alumnos: 24, avance: 72 },
      { nombre: "Grupo POCUS · Oct 2026", alumnos: 16, avance: 34, cola: "2 alumnos atrasados" },
    ],
    registro: [
      { titulo: "Casos validados", detalle: "41 esta semana · 186 en el mes", icono: "casos" },
      { titulo: "Casos en cola", detalle: "9 esperando · el más antiguo lleva 4 días", alerta: true, icono: "cola" },
      { titulo: "Entregas calificadas", detalle: "38 en el mes · 6 con nota corregida a Eco", icono: "entregas" },
      { titulo: "Consultas", detalle: "24 atendidas · 1 sin responder desde ayer", icono: "consultas" },
    ],
    permisos: [
      { etiqueta: "Rol", valor: "Docente" },
      { etiqueta: "Alcance", valor: "Solo sus 3 grupos" },
      { etiqueta: "Desde", valor: "marzo de 2024" },
      { etiqueta: "Última sesión", valor: "hoy 10:40" },
    ],
    eco: {
      pregunta: "¿Qué docente tiene más carga?",
      respuesta:
        "Sandoval, y no por número de grupos sino por concentración: es el único de renal, el área con más casos.",
      comparativa: [
        { quien: "Sandoval", detalle: "9 en cola · 68 alumnos", pct: 100, alerta: true },
        { quien: "Lugo", detalle: "3 en cola · 44 alumnos", pct: 42 },
        { quien: "Peña", detalle: "1 en cola · 24 alumnos", pct: 18 },
      ],
      sugerencia:
        "los 3 casos de más de 72 h son de vías urinarias; Lugo podría validarlos sin perder contexto.",
      cta: "Ver esos 3 casos",
      sugerencias: ["¿Quién tiene casos acumulados?", "¿Quién responde más lento?", "Reparte la carga de renal"],
    },
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


/** El nivel de poder se lee de un barrido: cada rol tiene color e ícono propios. */
const ROL: Record<Rol, { etiqueta: string; clase: string; icono: "escudo" | "regla" | "sonda" }> = {
  super: { etiqueta: "Súper admin", clase: "bg-sidebar text-sidebar-foreground", icono: "escudo" },
  admin: {
    etiqueta: "Admin",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: "escudo",
  },
  disenador: { etiqueta: "Diseñador", clase: "bg-accent text-accent-foreground", icono: "regla" },
  docente: { etiqueta: "Docente", clase: `border border-border bg-muted ${softText}`, icono: "sonda" },
};

const ICONO_CIFRA = { grupos: Users, casos: ScanLine, reloj: Clock, consultas: MessageCircle } as const;
const ICONO_REGISTRO = { casos: ScanLine, cola: AlertTriangle, entregas: ClipboardCheck, consultas: MessageCircle } as const;

function IconoRol({ tipo, className }: { tipo: "escudo" | "regla" | "sonda"; className?: string }) {
  if (tipo === "sonda") return <SondaIcon className={className} />;
  if (tipo === "regla") return <SquarePen aria-hidden className={className} strokeWidth={2} />;
  return <ShieldCheck aria-hidden className={className} strokeWidth={2} />;
}


function ChipRol({ rol }: { rol: Rol }) {
  const r = ROL[rol];
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${r.clase}`}
    >
      <IconoRol tipo={r.icono} className="h-[11px] w-[11px]" />
      {r.etiqueta}
    </span>
  );
}

function ChipEstado({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
        activo ? "bg-accent text-accent-foreground" : `border border-border bg-muted text-muted-foreground`
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-current" : "bg-[color:var(--track)]"}`}
      />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

/* pistas compartidas por encabezado y filas: el encabezado nunca miente */
const TRACKS = "1.45fr 148px 1.25fr 1.5fr 118px 62px";

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Staff({ data = MOCK }: { data?: StaffData }) {
  const { totales, detalleTotales, conteos, staff, detalle } = data;
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [filtroRol, setFiltroRol] = useState<"todos" | Rol>("todos");
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirMiembro = (_id: string) => setVista("detalle");
  const onInvitar = () => {};
  const onCambiarRol = (_id: string) => {};
  const onActivar = (_id: string, _activo: boolean) => {};
  const onFiltrar = (_f: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onVerActividad = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return staff.filter((s) => {
      const porRol =
        filtroRol === "todos" ||
        (filtroRol === "admin" ? s.rol === "admin" || s.rol === "super" : s.rol === filtroRol);
      return porRol && (!q || s.nombre.toLowerCase().includes(q) || s.area.toLowerCase().includes(q));
    });
  }, [staff, filtroRol, busca]);

  /* ══════════════════════ DETALLE ══════════════════════ */
  if (vista === "detalle") {
    const d = detalle;
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a Staff"
            className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>

          <Avatar ini={d.ini} size={52} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{d.nombre}</h1>
              <ChipRol rol={d.rol} />
              <ChipEstado activo={d.activo} />
              {d.senal && (
                <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  {d.senal}
                </span>
              )}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              {d.area} · en la escuela desde <span className={mono}>{d.desde}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3.5">
              <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
                <Mail aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                {d.correo}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
                <Phone aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                {d.telefono}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex shrink-0 flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onVerActividad(d.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Ver su actividad
            </button>
            <button
              type="button"
              onClick={() => onActivar(d.id, !d.activo)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Pause aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {d.activo ? "Desactivar" : "Activar"}
            </button>
            <button
              type="button"
              onClick={() => onCambiarRol(d.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Cambiar rol
              <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {/* carga y desempeño según el rol */}
            <section className={`${card} p-[18px]`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>
                  Carga y desempeño · {ROL[d.rol].etiqueta.toLowerCase()}
                </p>
                <span className={`${mono} ml-auto whitespace-nowrap text-[10.5px] text-muted-foreground`}>
                  últimos 30 días
                </span>
              </div>

              <div className="mt-3.5 flex gap-2.5">
                {d.cifras.map((c) => {
                  const Icono = ICONO_CIFRA[c.icono];
                  return (
                    <div
                      key={c.etiqueta}
                      className={`min-w-0 flex-1 rounded-[11px] border p-3 ${
                        c.alerta
                          ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          : "border-border bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                          c.alerta ? "text-[color:var(--warning-foreground)]" : "text-accent-foreground"
                        }`}
                      >
                        <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{c.valor}</p>
                      <p
                        className={`mt-1 text-[10.5px] leading-snug ${
                          c.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                      >
                        {c.etiqueta}
                      </p>
                    </div>
                  );
                })}
              </div>

              {d.aviso && (
                <div className="mt-4 flex items-center gap-3.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
                  <span
                    aria-hidden
                    className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
                  >
                    <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} />
                  </span>
                  <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                    <span className="font-bold">{d.aviso.titulo}</span> {d.aviso.detalle}
                  </p>
                </div>
              )}
            </section>

            {/* docente: grupos que imparte */}
            {d.grupos && d.grupos.length > 0 && (
              <section className={`${card} p-[18px]`}>
                <p className={`${kicker} text-muted-foreground`}>Grupos que imparte</p>
                <ul className="mt-1.5">
                  {d.grupos.map((g) => (
                    <li key={g.nombre} className="flex items-center gap-3.5 border-t border-border py-3">
                      <span className="min-w-0 flex-[1.3]">
                        <span className="block text-[12.5px] font-bold">{g.nombre}</span>
                        <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                          {g.alumnos} alumnos
                        </span>
                      </span>
                      <span className="flex min-w-[90px] flex-1 items-center gap-2.5">
                        <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${g.avance}%` }} />
                        </span>
                        <span className={`${mono} shrink-0 text-[12px] font-bold`}>{g.avance}%</span>
                      </span>
                      <span className="w-[150px] shrink-0 text-right">
                        {g.cola ? (
                          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                            <AlertTriangle aria-hidden className="h-3 w-3" strokeWidth={2} />
                            {g.cola}
                          </span>
                        ) : (
                          <span className={`${mono} text-[11px] text-muted-foreground`}>sin cola</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* registro de su trabajo */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Validación y entregas</p>
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {d.registro.map((r) => {
                  const Icono = ICONO_REGISTRO[r.icono];
                  return (
                    <li
                      key={r.titulo}
                      className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-3 ${
                        r.alerta ? "bg-[color:var(--warning-surface)]" : ""
                      }`}
                    >
                      <Icono
                        aria-hidden
                        className={`mt-px h-[15px] w-[15px] shrink-0 ${
                          r.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[12.5px] font-bold ${
                            r.alerta ? "text-[color:var(--warning-foreground)]" : ""
                          }`}
                        >
                          {r.titulo}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11.5px] leading-snug ${
                            r.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                          }`}
                        >
                          {r.detalle}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* rail: rol con candado + Eco */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Rol y permisos</p>
                <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                  <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  Se edita en Configuración
                </span>
              </div>
              <div className="p-4">
                <dl className="flex flex-col gap-2.5">
                  {d.permisos.map((p) => (
                    <div key={p.etiqueta} className="flex items-baseline gap-2.5">
                      <dt className="w-[100px] shrink-0 text-[11.5px] text-muted-foreground">
                        {p.etiqueta}
                      </dt>
                      <dd className="min-w-0 flex-1 text-right text-[12.5px] font-semibold">{p.valor}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Para cambiar su rol o sus permisos se pasa a Configuración → Usuarios y roles; el
                  cambio queda en auditoría.
                </p>
                <button
                  type="button"
                  onClick={() => onCambiarRol(d.id)}
                  className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Abrir Usuarios y roles
                </button>
              </div>
            </section>

            {/* Eco: compara la carga del equipo, no repite las cifras */}
            {ecoAbierto && (
              <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
                <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
                  <EcoMark size={32} invertido />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                    <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                      Sobre la carga del equipo
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
                      {d.eco.pregunta}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2.5">
                    <EcoMark size={26} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] leading-relaxed ${softText}`}>{d.eco.respuesta}</p>

                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {d.eco.comparativa.map((c) => (
                          <li key={c.quien} className="flex items-center gap-2.5">
                            <span className="w-[62px] shrink-0 text-[11.5px] font-semibold">{c.quien}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                              <span
                                className={`block h-full rounded-full ${
                                  c.alerta ? "bg-[color:var(--warning)]" : "bg-primary"
                                }`}
                                style={{ width: `${c.pct}%` }}
                              />
                            </span>
                            <span className={`${mono} shrink-0 whitespace-nowrap text-[10px] text-muted-foreground`}>
                              {c.detalle}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                        <span className="font-bold text-foreground">Sugerencia:</span> {d.eco.sugerencia}
                      </p>

                      <button
                        type="button"
                        className={`mt-2.5 inline-flex h-9 w-full items-center justify-center rounded-[9px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                      >
                        {d.eco.cta}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 pb-3.5 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {d.eco.sugerencias.map((s) => (
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

  /* ══════════════════════ LISTA ══════════════════════ */
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Staff</h1>
            {/* la frontera con Configuración se declara */}
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta y roles: Configuración
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Quién es staff, qué rol tiene y cómo va su carga. Esta es la vista operativa: el alta y el
            cambio de rol se hacen en Configuración.
          </p>
        </div>

        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => onPreguntarEco("¿qué docente tiene más carga?")}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
          <button
            type="button"
            onClick={onInvitar}
            className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Invitar a alguien
            <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* totales: carga y respuesta, no productividad */}
      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Staff activo", totales.activo, detalleTotales.activo, false],
            ["Con sobrecarga", totales.sobrecarga, detalleTotales.sobrecarga, true],
            ["Casos validados esta semana", totales.validados, detalleTotales.validados, false],
            ["Respuesta media", totales.respuesta, detalleTotales.respuesta, false],
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

      {/* filtros por rol y estado */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre o área</span>
          <input
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Buscar por nombre o área…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["todos", "Todos", conteos.todos],
              ["docente", "Docentes", conteos.docentes],
              ["disenador", "Diseñadores", conteos.disenadores],
              ["admin", "Admins", conteos.admins],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltroRol(id)}
              aria-pressed={filtroRol === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtroRol === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtroRol === id ? "text-white/70" : "text-muted-foreground"}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onFiltrar("estado")}
          className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold ${softText} transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
        >
          Cualquier estado
          <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {conteos.todos + 1} · incluye {staff.filter((s) => !s.activo).length} inactivo
        </span>
      </div>

      {/* tabla: encabezado y filas comparten las mismas pistas */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div
          className="grid items-center gap-3.5 bg-muted px-[18px] py-2.5"
          style={{ gridTemplateColumns: TRACKS }}
        >
          {(
            [
              ["Persona", ""],
              ["Rol y estado", ""],
              ["A su cargo", ""],
              ["Actividad reciente", ""],
              ["Última sesión", ""],
              ["", "text-right"],
            ] as const
          ).map(([t, extra]) => (
            <span
              key={t || "acc"}
              className={`min-w-0 ${extra} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
            >
              {t}
            </span>
          ))}
        </div>

        {visibles.map((s) => (
          <div
            key={s.id}
            className={`grid items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
              s.senal && s.activo ? "bg-[#fffdf7]" : ""
            }`}
            style={{ gridTemplateColumns: TRACKS }}
          >
            <button
              type="button"
              onClick={() => onAbrirMiembro(s.id)}
              title="Ver su detalle"
              className={`flex min-w-0 items-center gap-2.5 text-left transition-colors hover:text-secondary ${focusRing}`}
            >
              <Avatar ini={s.ini} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-snug">{s.nombre}</span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                  {s.area}
                </span>
              </span>
            </button>

            <span className="flex min-w-0 flex-col items-start gap-1.5">
              <ChipRol rol={s.rol} />
              <ChipEstado activo={s.activo} />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold">{s.cargo}</span>
              {s.senal && (
                <span className="mt-0.5 block text-[10.5px] font-semibold text-[color:var(--warning-foreground)]">
                  {s.senal}
                </span>
              )}
            </span>

            <span className={`min-w-0 truncate text-[12px] ${softText}`}>{s.actividad}</span>

            <span
              className={`${mono} whitespace-nowrap text-[11px] ${
                s.ultimaAlerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
              }`}
            >
              {s.ultimaSesion}
            </span>

            <span className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label={`Más acciones de ${s.nombre}`}
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

"use client";

/**
 * Studio · Anuncios — gestor de la comunicación oficial de la escuela
 *
 * Los anuncios son comunicación VERTICAL (de la escuela hacia la comunidad), distinta del Ateneo.
 * La MISMA pantalla sirve a tres roles y el rol acota el ALCANCE que puede segmentar:
 *   · superadmin → toda la comunidad (alumnos y staff)
 *   · admin      → global o por programa / generación
 *   · docente    → solo sus grupos
 *
 * Reglas que la pantalla sostiene:
 *   · La CADUCIDAD es obligatoria: al vencer, el anuncio sale del home solo (nada de muros viejos).
 *   · In-app siempre va; correo y WhatsApp los elige quien publica (WhatsApp advertido: llega al
 *     teléfono).
 *   · ECO redacta pero NO firma: su borrador se presenta como tal y sale con el nombre del staff.
 *   · Un solo color de atención: ROJO solo para prioridad urgente; ámbar para importante.
 *
 * La visualización en el home del alumno ya existe: aquí solo se gestiona, con vista previa fiel.
 *
 * Stubs: onNuevoAnuncio · onEditar · onPublicar · onProgramar · onRedactarConEco · onSegmentar ·
 *        onVistaPrevia · onDuplicar
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Lock,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";


/* ───────────────────────────── Tipos ───────────────────────────── */

export type RolStaff = "superadmin" | "admin" | "docente";
export type Prioridad = "normal" | "importante" | "urgente";
export type EstadoAnuncio = "publicado" | "programado" | "borrador" | "vencido";
export type Canal = "app" | "correo" | "whatsapp";
export type TipoAlcance =
  | "comunidad"
  | "alumnos"
  | "staff"
  | "programa"
  | "generacion"
  | "grupo";

export type Anuncio = {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  estado: EstadoAnuncio;
  alcance: { tipo: TipoAlcance; etiqueta: string; personas: string };
  canales: Canal[];
  publicacion: string;
  vigencia: string;
  vistas: string;
  pctVisto: string;
};

export type AnunciosData = {
  rol: RolStaff;
  anuncios: Anuncio[];
  conteos: Record<EstadoAnuncio, number>;
  resumen: string;
};

/** Qué puede segmentar cada rol: el rol acota, la pantalla es la misma. */
export const ALCANCE_POR_ROL: Record<RolStaff, TipoAlcance[]> = {
  superadmin: ["comunidad", "alumnos", "staff", "programa", "generacion", "grupo"],
  admin: ["comunidad", "alumnos", "programa", "generacion", "grupo"],
  docente: ["grupo"],
};

const ETIQUETA_ALCANCE: Record<TipoAlcance, string> = {
  comunidad: "Toda la comunidad",
  alumnos: "Solo alumnos",
  staff: "Solo staff",
  programa: "Un programa",
  generacion: "Una generación",
  grupo: "Un grupo",
};

const MOCK: AnunciosData = {
  rol: "superadmin",
  conteos: { publicado: 3, programado: 2, borrador: 1, vencido: 8 },
  resumen: "14 anuncios · 86% de la comunidad vio el último urgente",
  anuncios: [
    { id: "a1", titulo: "Sesión de mañana movida a las 20:00", prioridad: "urgente", estado: "publicado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app", "correo", "whatsapp"], publicacion: "hoy 09:12", vigencia: "vence hoy 23:59", vistas: "1 108", pctVisto: "86%" },
    { id: "a2", titulo: "Nuevo módulo de Doppler renal disponible", prioridad: "importante", estado: "publicado", alcance: { tipo: "generacion", etiqueta: "Generación 1000 h", personas: "412 alumnos" }, canales: ["app", "correo"], publicacion: "14 sep", vigencia: "vence el 30 sep", vistas: "386", pctVisto: "94%" },
    { id: "a3", titulo: "Cambio de sede para las prácticas de octubre", prioridad: "normal", estado: "publicado", alcance: { tipo: "programa", etiqueta: "Programa POCUS", personas: "96 alumnos" }, canales: ["app", "correo"], publicacion: "12 sep", vigencia: "vence el 5 oct", vistas: "71", pctVisto: "74%" },
    { id: "a4", titulo: "Cierre de inscripciones de la generación de enero", prioridad: "importante", estado: "programado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app", "correo", "whatsapp"], publicacion: "sale el 20 sep 08:00", vigencia: "vence el 15 oct", vistas: "—", pctVisto: "—" },
    { id: "a5", titulo: "Mantenimiento del campus el domingo", prioridad: "normal", estado: "programado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app"], publicacion: "sale el 21 sep 18:00", vigencia: "vence el 22 sep", vistas: "—", pctVisto: "—" },
    { id: "a6", titulo: "Convocatoria al Ateneo de casos difíciles", prioridad: "normal", estado: "borrador", alcance: { tipo: "alumnos", etiqueta: "Solo alumnos", personas: "sin definir" }, canales: ["app"], publicacion: "sin fecha", vigencia: "sin caducidad", vistas: "—", pctVisto: "—" },
    { id: "a7", titulo: "Bienvenida a la generación de septiembre", prioridad: "normal", estado: "vencido", alcance: { tipo: "generacion", etiqueta: "Generación sep 2026", personas: "186 alumnos" }, canales: ["app", "correo"], publicacion: "1 sep", vigencia: "venció el 10 sep", vistas: "178", pctVisto: "96%" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


/** El rojo se gasta una sola vez: la prioridad urgente. */
const PRIORIDAD: Record<Prioridad, { etiqueta: string; clase: string }> = {
  urgente: {
    etiqueta: "Urgente",
    clase:
      "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
  },
  importante: {
    etiqueta: "Importante",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  normal: { etiqueta: "Normal", clase: "border border-border bg-muted text-muted-foreground" },
};

const ESTADO: Record<EstadoAnuncio, { etiqueta: string; clase: string }> = {
  publicado: { etiqueta: "Publicado", clase: "bg-accent text-accent-foreground" },
  programado: {
    etiqueta: "Programado",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
  borrador: { etiqueta: "Borrador", clase: "border border-border bg-muted text-muted-foreground" },
  vencido: { etiqueta: "Vencido", clase: "border border-border bg-muted text-muted-foreground" },
};

const ICONO_CANAL: Record<Canal, typeof Smartphone> = {
  app: Smartphone,
  correo: Mail,
  whatsapp: MessageCircle,
};
const NOMBRE_CANAL: Record<Canal, string> = {
  app: "In-app",
  correo: "Correo",
  whatsapp: "WhatsApp",
};

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Anuncios({ data = MOCK }: { data?: AnunciosData }) {
  const { rol, anuncios, conteos, resumen } = data;
  const [vista, setVista] = useState<"lista" | "editor">("lista");
  const [filtro, setFiltro] = useState<EstadoAnuncio>("publicado");
  const [busca, setBusca] = useState("");

  /* estado del editor */
  const [titulo, setTitulo] = useState("Ya está abierto el módulo de Doppler renal");
  const [alcance, setAlcance] = useState<TipoAlcance>("generacion");
  const [canales, setCanales] = useState<Canal[]>(["app", "correo"]);
  const [prioridad, setPrioridad] = useState<Prioridad>("importante");
  const [borradorEco, setBorradorEco] = useState(true);
  const [previsualiza, setPrevisualiza] = useState<"home" | "correo">("home");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNuevoAnuncio = () => setVista("editor");
  const onEditar = (_id: string) => setVista("editor");
  const onDuplicar = (_id: string) => {};
  const onPublicar = () => {};
  const onProgramar = () => {};
  const onRedactarConEco = () => setBorradorEco(true);
  const onSegmentar = (t: TipoAlcance) => setAlcance(t);
  const onVistaPrevia = (v: "home" | "correo") => setPrevisualiza(v);
  /* ──────────────────────────────────────────────────────── */

  const permitidos = ALCANCE_POR_ROL[rol];
  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return anuncios.filter(
      (a) =>
        a.estado === filtro &&
        (!q || a.titulo.toLowerCase().includes(q) || a.alcance.etiqueta.toLowerCase().includes(q)),
    );
  }, [anuncios, filtro, busca]);

  /* ══════════════════════ EDITOR ══════════════════════ */
  if (vista === "editor") {
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col bg-card">
        {/* migaja del editor */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-6">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a Anuncios"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="whitespace-nowrap text-[12.5px] font-medium text-muted-foreground">
              Anuncios
            </span>
            <ChevronRight aria-hidden className="h-3.5 w-3.5 text-[color:var(--track)]" strokeWidth={2} />
            <span className="whitespace-nowrap text-[14px] font-bold">Nuevo anuncio</span>
            <span
              className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO.borrador.clase}`}
            >
              Borrador
            </span>
          </span>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* ── columna de autoría ── */}
          <div className="flex min-w-0 flex-col gap-5 overflow-y-auto p-6">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Contenido</p>
              <button
                type="button"
                onClick={onRedactarConEco}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
              >
                <Sparkles aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Redactar con Eco
              </button>
            </div>

            {/* Eco redacta pero no firma */}
            {borradorEco && (
              <div className="flex items-start gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3">
                <EcoMark size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                    Eco escribió este borrador
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
                    Le pidió: “un anuncio sobre el nuevo módulo de Doppler para la generación 1000 h”.
                    Edítelo antes de publicar: sale con su nombre, no con el de Eco.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setBorradorEco(false)}
                  aria-label="Descartar el borrador de Eco"
                  className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-[color:var(--info-foreground)] ${focusRing}`}
                >
                  <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            )}

            <label className="block">
              <span className="block text-[11.5px] font-semibold">Título</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={`mt-1.5 h-[46px] w-full rounded-[10px] border border-border bg-card px-3.5 text-[15px] font-bold text-foreground outline-none transition-colors focus:border-secondary ${focusRing}`}
              />
              <span className="mt-1.5 block text-[11px] text-muted-foreground">
                {titulo.length} de 90 caracteres · en el home del alumno se ve completo
              </span>
            </label>

            {/* cuerpo enriquecido con imagen y video */}
            <div>
              <span className="block text-[11.5px] font-semibold">Cuerpo</span>
              <div className="mt-1.5 overflow-hidden rounded-[11px] border border-border bg-card">
                <div className="flex items-center gap-1 border-b border-border bg-muted px-2.5 py-2">
                  {["Negrita", "Cursiva", "Lista", "Enlace"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-label={t}
                      className={`h-[30px] w-[30px] rounded-md text-[13px] font-bold text-[color:var(--foreground-soft)] transition-colors hover:bg-card ${focusRing}`}
                    >
                      {t[0]}
                    </button>
                  ))}
                  <span aria-hidden className="mx-1.5 h-[18px] w-px bg-border" />
                  <button
                    type="button"
                    className={`inline-flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-semibold ${softText} transition-colors hover:bg-card ${focusRing}`}
                  >
                    <ImageIcon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Imagen
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-[30px] items-center gap-1.5 rounded-md bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground ${focusRing}`}
                  >
                    <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Video
                  </button>
                </div>

                <div className="p-3.5">
                  <p className={`text-[13.5px] leading-[1.7] ${softText}`}>
                    Doctoras y doctores: desde hoy pueden entrar al{" "}
                    <strong className="text-foreground">módulo 8 · Doppler y hemodinamia</strong>. Son
                    88 horas acreditables y trae cuatro cine-loops nuevos grabados en el equipo de la
                    sede.
                  </p>
                  <p className={`mt-3 text-[13.5px] leading-[1.7] ${softText}`}>
                    La primera sesión en vivo es el jueves a las 19:00. Si su grupo ya cerró el módulo
                    7, el temario se les abre solo.
                  </p>

                  {/* el anuncio puede llevar video */}
                  <div className="mt-3.5 flex items-center gap-3 rounded-[10px] border border-border bg-muted p-3">
                    <span
                      aria-hidden
                      className="grid h-11 w-[72px] shrink-0 place-items-center rounded-[7px] bg-sidebar text-primary"
                    >
                      <Play className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold">bienvenida_doppler.mp4</span>
                      <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                        1:48 · se reproduce dentro del anuncio
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar el video"
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground ${focusRing}`}
                    >
                      <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* segmentación: el rol acota */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11.5px] font-semibold">A quién llega</span>
                <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full bg-sidebar px-2 text-[10px] font-bold text-sidebar-foreground">
                  {rol === "superadmin"
                    ? "Súper admin: sin límite"
                    : rol === "admin"
                      ? "Admin: global o por programa"
                      : "Docente: solo sus grupos"}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(Object.keys(ETIQUETA_ALCANCE) as TipoAlcance[]).map((t) => {
                  const puede = permitidos.includes(t);
                  const on = alcance === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!puede}
                      onClick={() => onSegmentar(t)}
                      aria-pressed={on}
                      className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                        !puede
                          ? "cursor-not-allowed border-border bg-card text-[color:var(--track)]"
                          : on
                            ? "border-transparent bg-accent text-accent-foreground"
                            : `border-border bg-card ${softText} hover:bg-muted`
                      }`}
                    >
                      {!puede && <Lock aria-hidden className="h-3 w-3" strokeWidth={2} />}
                      {ETIQUETA_ALCANCE[t]}
                    </button>
                  );
                })}
              </div>

              {/* confirma el alcance con cifras: equivocarse de audiencia es el error caro */}
              <div className="mt-3 flex items-center gap-3 rounded-[11px] border border-primary bg-accent px-3.5 py-3">
                <Users aria-hidden className="h-[17px] w-[17px] shrink-0 text-accent-foreground" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold">
                    Generación 1000 h · Ultrasonografía Médica
                  </span>
                  <span className={`${mono} mt-0.5 block text-[11px] text-accent-foreground`}>
                    412 alumnos en 9 grupos · excluye staff
                  </span>
                </span>
                <button
                  type="button"
                  className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] bg-card px-3 text-[12px] font-semibold text-accent-foreground ${focusRing}`}
                >
                  Cambiar
                </button>
              </div>
            </div>

            {/* canales */}
            <div>
              <span className="block text-[11.5px] font-semibold">Canales</span>
              <div className="mt-2.5 flex flex-col gap-2">
                {(
                  [
                    ["app", "Aparece en el home del alumno"],
                    ["correo", "Se envía a los 412 correos de la generación"],
                    ["whatsapp", "Resérvelo para lo urgente: llega al teléfono"],
                  ] as const
                ).map(([k, sub]) => {
                  const on = canales.includes(k);
                  const Icono = ICONO_CANAL[k];
                  const fijo = k === "app";
                  return (
                    <div
                      key={k}
                      className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${
                        on ? "border-primary bg-accent" : "border-border bg-card"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] ${
                          on ? "bg-card text-accent-foreground" : `bg-muted ${softText}`
                        }`}
                      >
                        <Icono className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-bold">{NOMBRE_CANAL[k]}</span>
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            on ? "text-accent-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {sub}
                        </span>
                      </span>
                      {fijo ? (
                        <span
                          className={`inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[10px] font-bold text-muted-foreground`}
                        >
                          <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                          Siempre
                        </span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={NOMBRE_CANAL[k]}
                          onClick={() =>
                            setCanales((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))
                          }
                          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${focusRing} ${
                            on ? "bg-primary" : "bg-[color:var(--track)]"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card transition-all ${
                              on ? "right-0.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* prioridad y programación */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <span className="block text-[11.5px] font-semibold">Prioridad</span>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(["normal", "importante", "urgente"] as Prioridad[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridad(p)}
                      aria-pressed={prioridad === p}
                      className={`h-9 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                        prioridad === p
                          ? PRIORIDAD[p].clase
                          : `border-border bg-card ${softText} hover:bg-muted`
                      }`}
                    >
                      {PRIORIDAD[p].etiqueta}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Urgente lo pinta en rojo y fija el anuncio arriba del home.
                </p>
              </div>

              <div>
                <span className="block text-[11.5px] font-semibold">Programación</span>
                <div className="mt-2.5 flex flex-col gap-2">
                  {[
                    ["Publicar", "ahora · 16 sep 12:40"],
                    ["Caduca", "el 30 de septiembre"],
                  ].map(([l, v]) => (
                    <button
                      key={l}
                      type="button"
                      onClick={onProgramar}
                      className={`flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-left ${focusRing}`}
                    >
                      <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="shrink-0 text-[11.5px] font-semibold text-muted-foreground">
                        {l}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right text-[12.5px] font-semibold">
                        {v}
                      </span>
                      <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  La caducidad es obligatoria: al vencer sale del home solo.
                </p>
              </div>
            </div>
          </div>

          {/* ── vista previa: como lo verá el alumno ── */}
          <div className="flex min-w-0 flex-col border-l border-border bg-muted">
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-card px-5 py-4">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Vista previa</p>
              <div className="flex gap-1 rounded-full bg-muted p-[3px]">
                {(
                  [
                    ["home", "Home del alumno"],
                    ["correo", "Correo"],
                  ] as const
                ).map(([id, etiqueta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onVistaPrevia(id)}
                    aria-pressed={previsualiza === id}
                    className={`h-7 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold transition-colors ${focusRing} ${
                      previsualiza === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <p className={`${mono} text-[11px] text-muted-foreground`}>
                así lo verá un alumno de la generación 1000 h
              </p>

              <article className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
                <div
                  className={`flex items-center gap-3 border-b px-3.5 py-3 ${
                    prioridad === "urgente"
                      ? "border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]"
                      : prioridad === "importante"
                        ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                        : "border-border bg-muted"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card ${
                      prioridad === "urgente"
                        ? "text-[color:var(--destructive-foreground)]"
                        : prioridad === "importante"
                          ? "text-[color:var(--warning-foreground)]"
                          : "text-muted-foreground"
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-[11.5px] font-bold ${
                      prioridad === "urgente"
                        ? "text-[color:var(--destructive-foreground)]"
                        : prioridad === "importante"
                          ? "text-[color:var(--warning-foreground)]"
                          : "text-muted-foreground"
                    }`}
                  >
                    Anuncio {PRIORIDAD[prioridad].etiqueta.toLowerCase()} · Dirección académica
                  </span>
                  <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>hoy</span>
                </div>

                <div className="p-4">
                  <p
                    className="text-[16px] font-extrabold leading-snug tracking-[-0.01em]"
                    style={{ textWrap: "pretty" }}
                  >
                    {titulo}
                  </p>

                  <div
                    aria-hidden
                    className="relative mt-3 grid w-full place-items-center overflow-hidden rounded-[10px]"
                    style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                      }}
                    />
                    <span className="relative grid h-[46px] w-[46px] place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
                      <Play className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span
                      className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
                      style={{ background: "rgba(15,45,82,.82)" }}
                    >
                      1:48
                    </span>
                  </div>

                  <p className={`mt-3.5 text-[13px] leading-relaxed ${softText}`}>
                    Doctoras y doctores: desde hoy pueden entrar al{" "}
                    <strong className="text-foreground">módulo 8 · Doppler y hemodinamia</strong>. Son
                    88 horas acreditables y trae cuatro cine-loops nuevos.
                  </p>

                  <div className="mt-3.5 flex items-center gap-2.5 border-t border-border pt-3">
                    <span className={`${mono} min-w-0 flex-1 text-[10.5px] text-muted-foreground`}>
                      vigente hasta el 30 de septiembre
                    </span>
                    <button
                      type="button"
                      className="h-9 shrink-0 whitespace-nowrap rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)]"
                    >
                      Ir al módulo
                    </button>
                  </div>
                </div>
              </article>

              <div className="mt-3.5 flex items-start gap-2.5 rounded-[11px] border border-border bg-card px-3.5 py-3">
                <Check aria-hidden className="mt-px h-[15px] w-[15px] shrink-0 text-secondary" strokeWidth={2.4} />
                <span className={`min-w-0 flex-1 text-[11.5px] leading-relaxed ${softText}`}>
                  Llega a <span className="font-bold text-foreground">412 alumnos</span> por in-app y
                  correo. El correo usa la misma plantilla de la escuela.
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-border bg-card px-5 py-3.5">
              <span className={`${mono} min-w-0 flex-1 text-[11px] text-muted-foreground`}>
                borrador guardado hace 12 s
              </span>
              <span className="flex shrink-0 gap-2.5">
                <button
                  type="button"
                  onClick={onProgramar}
                  className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Programar
                </button>
                <button
                  type="button"
                  onClick={onPublicar}
                  className={`h-12 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Publicar ahora
                </button>
              </span>
            </div>
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
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Anuncios</h1>
            <span className="inline-flex h-[23px] items-center whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[10.5px] font-bold text-sidebar-foreground">
              {rol === "superadmin"
                ? "Alcance global"
                : rol === "admin"
                  ? "Alcance académico"
                  : "Solo sus grupos"}
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Comunicación oficial de la escuela. Todo anuncio lleva caducidad para que no se quede
            colgado.
          </p>
        </div>

        <button
          type="button"
          onClick={onNuevoAnuncio}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Nuevo anuncio
        </button>
      </div>

      {/* filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["publicado", "Publicados"],
              ["programado", "Programados"],
              ["borrador", "Borradores"],
              ["vencido", "Vencidos"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtro === id ? "text-white/70" : "text-muted-foreground"}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <label className="flex h-10 w-[250px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar anuncio</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título o alcance…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          Cualquier alcance
          <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>{resumen}</span>
      </div>

      {/* lista: a quién llegó, por dónde, hasta cuándo y cuántos lo vieron */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ["Anuncio", "flex-[1.6]"],
              ["A quién llega", "flex-1 min-w-0"],
              ["Canales", "shrink-0 w-[96px]"],
              ["Publicación y vigencia", "shrink-0 w-[150px]"],
              ["Vistas", "shrink-0 w-[92px] text-right"],
              ["", "shrink-0 w-[102px]"],
            ] as const
          ).map(([t, cls]) => (
            <span
              key={t || "acciones"}
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
              a.prioridad === "urgente" && a.estado === "publicado" ? "bg-[#fffdfd]" : ""
            }`}
          >
            <span className="min-w-0 flex-[1.6]">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${PRIORIDAD[a.prioridad].clase}`}
                >
                  {a.prioridad === "urgente" && (
                    <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  )}
                  {PRIORIDAD[a.prioridad].etiqueta}
                </span>
                <span
                  className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}
                >
                  {ESTADO[a.estado].etiqueta}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onEditar(a.id)}
                className={`mt-1.5 block w-full truncate text-left text-[13.5px] font-bold leading-snug ${focusRing}`}
              >
                {a.titulo}
              </button>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <Users aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="truncate text-[12px] font-semibold">{a.alcance.etiqueta}</span>
              </span>
              <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                {a.alcance.personas}
              </span>
            </span>

            <span className="flex w-[96px] shrink-0 gap-1.5">
              {(["app", "correo", "whatsapp"] as Canal[]).map((k) => {
                const Icono = ICONO_CANAL[k];
                const on = a.canales.includes(k);
                return (
                  <span
                    key={k}
                    title={NOMBRE_CANAL[k]}
                    className={`grid h-6 w-6 place-items-center rounded-[7px] ${
                      on ? "bg-accent text-accent-foreground" : "bg-muted text-[color:var(--track)]"
                    }`}
                  >
                    <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  </span>
                );
              })}
            </span>

            <span className="w-[150px] shrink-0">
              <span className="block text-[11.5px] font-semibold">{a.publicacion}</span>
              <span
                className={`${mono} mt-0.5 block text-[10.5px] ${
                  a.vigencia.startsWith("vence hoy")
                    ? "text-[color:var(--warning-foreground)]"
                    : "text-muted-foreground"
                }`}
              >
                {a.vigencia}
              </span>
            </span>

            <span className="w-[92px] shrink-0 text-right">
              <span className={`${mono} block text-[13px] font-bold`}>{a.vistas}</span>
              <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                {a.pctVisto} lo vio
              </span>
            </span>

            <span className="flex shrink-0 gap-0.5">
              {(
                [
                  ["Editar", Pencil, () => onEditar(a.id)],
                  ["Duplicar", Copy, () => onDuplicar(a.id)],
                  ["Más acciones", MoreHorizontal, () => {}],
                ] as const
              ).map(([label, Icono, fn]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${label}: ${a.titulo}`}
                  onClick={fn}
                  className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
              ))}
            </span>
          </div>
        ))}

        {visibles.length === 0 && (
          <div className="border-t border-border px-6 py-12 text-center">
            <p className="text-[15px] font-bold">Nada en esta bandeja</p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              Cambie de estado o publique el primer anuncio para esta audiencia.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

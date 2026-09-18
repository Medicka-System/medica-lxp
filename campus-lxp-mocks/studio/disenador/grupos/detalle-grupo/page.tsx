"use client";

/**
 * Studio · Gestión de un grupo — herencia vs personalización
 *
 * El grupo NO copia el contenido del programa: apunta a él. Cada nodo del temario se muestra con
 * UNA señal consistente:
 *   Heredado      → gris + eslabón. Se actualiza solo cuando se corrige el programa.
 *   Personalizado → violeta (info) + ajustes, y dice QUÉ se cambió (oculta / recurso reemplazado /
 *                   módulo extra / fecha movida). Solo se guarda la excepción.
 *   Atención      → ámbar, y SOLO cuando el programa base cambió justo en un nodo overrideado:
 *                   el sistema avisa, el diseñador decide (Ver la diferencia / Re-sincronizar).
 * Nunca rojo: personalizar no es un error.
 *
 * Lo editable aquí: datos del grupo, calendario de liberación, docente y overrides de contenido.
 * Alumnos / inscripciones / calificaciones son de CORA (ERP) → panel de solo lectura.
 *
 * Header contextual propio (sin la navegación general del Studio): se monta FUERA de
 * app/(studio)/layout.tsx.
 *
 * Stubs: onEditarCalendario · onPersonalizarNodo · onResincronizar · onAsignarDocente · onGuardar
 */

import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Repeat2,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { mono, kicker, softText, focusRing, focusRingDark } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoOverride = "oculta" | "reemplaza" | "extra" | "fecha";

export type NodoLeccion = {
  id: string;
  titulo: string;
  override?: TipoOverride;
  /** el programa base cambió en este nodo overrideado */
  avisoResync?: boolean;
};

export type NodoModulo = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  override?: TipoOverride;
  nota?: string;
  lecciones: NodoLeccion[];
};

export type LiberacionModulo = {
  clave: string;
  titulo: string;
  fecha: string;
  estado: "abierto" | "programado";
  fechaMovida?: boolean;
};

export type AlumnoConsulta = { ini: string; nombre: string; avance: number; alDia: boolean };

export type GrupoData = {
  id: string;
  nombre: string;
  /** Portada del grupo: se configura aquí dentro. Proporción fija 16:9 (nunca medidas en px). */
  portada?: { url: string; alt: string; original?: string };
  estado: "proximo" | "curso" | "finalizado";
  programa: { id: string; nombre: string; version: string };
  modalidad: "sincrono" | "asincrono";
  fechas?: { inicio: string; fin: string };
  docente?: { ini: string; nombre: string; area: string; grupos: number };
  alumnos: { inscritos: number; avanceMedio: number; atrasados: number; lista: AlumnoConsulta[] };
  liberacion: LiberacionModulo[];
  temario: NodoModulo[];
  overrides: { tipo: TipoOverride; titulo: string; donde: string; avisoResync?: boolean }[];
  resync?: { donde: string; versionNueva: string; versionGrupo: string; detalle: string };
  totales: { modulosAbiertos: number; modulos: number; horas: number };
};

const MOCK: GrupoData = {
  id: "g1",
  nombre: "Grupo B · Nov 2026",
  portada: { url: "", alt: "Portada del Grupo B", original: "1531 × 839" },
  estado: "curso",
  programa: { id: "p1", nombre: "Ultrasonografía Médica", version: "v3" },
  modalidad: "sincrono",
  fechas: { inicio: "4 feb 2026", fin: "12 dic 2026" },
  docente: { ini: "AS", nombre: "Dr. Alejandro Sandoval", area: "Renal y abdomen", grupos: 3 },
  alumnos: {
    inscritos: 28,
    avanceMedio: 34,
    atrasados: 6,
    lista: [
      { ini: "SR", nombre: "Dra. Sofía Ramírez", avance: 48, alDia: true },
      { ini: "IT", nombre: "Dr. Iván Torres", avance: 41, alDia: true },
      { ini: "KM", nombre: "Dra. Karla Méndez", avance: 39, alDia: true },
      { ini: "LA", nombre: "Dr. Luis Arreola", avance: 26, alDia: false },
      { ini: "HC", nombre: "Dr. Hugo Cuevas", avance: 22, alDia: false },
      { ini: "RS", nombre: "Dra. Renata Salas", avance: 19, alDia: false },
    ],
  },
  liberacion: [
    { clave: "01", titulo: "Fundamentos y modo B", fecha: "4 feb", estado: "abierto" },
    { clave: "02", titulo: "Abdomen y retroperitoneo", fecha: "9 mar", estado: "abierto" },
    { clave: "03", titulo: "Hígado y vía biliar", fecha: "13 abr", estado: "abierto" },
    { clave: "04", titulo: "Interpretación renal", fecha: "18 may", estado: "abierto" },
    { clave: "05", titulo: "Vías urinarias y vejiga", fecha: "29 jun", estado: "programado", fechaMovida: true },
    { clave: "06", titulo: "Obstétrico I", fecha: "3 ago", estado: "programado" },
    { clave: "07", titulo: "Obstétrico II", fecha: "14 sep", estado: "programado" },
    { clave: "08", titulo: "Doppler y hemodinamia", fecha: "19 oct", estado: "programado" },
  ],
  temario: [
    { id: "m1", clave: "01", titulo: "Fundamentos y modo B", horas: 64, lecciones: [] },
    { id: "m2", clave: "02", titulo: "Abdomen y retroperitoneo", horas: 96, lecciones: [] },
    { id: "m3", clave: "03", titulo: "Hígado y vía biliar", horas: 120, lecciones: [] },
    {
      id: "m4",
      clave: "04",
      titulo: "Interpretación renal",
      horas: 88,
      nota: "2 personalizaciones",
      lecciones: [
        { id: "l1", titulo: "Anatomía sonográfica del riñón" },
        { id: "l2", titulo: "Técnica de barrido y ventanas" },
        { id: "l3", titulo: "Hidronefrosis: gradación y trampas del modo B", override: "reemplaza", avisoResync: true },
        { id: "l4", titulo: "Quistes y lesiones sólidas" },
        { id: "l5", titulo: "Doppler renal aplicado", override: "oculta" },
        { id: "l6", titulo: "Cierre: informe estructurado" },
      ],
    },
    { id: "me1", clave: "E1", titulo: "Taller de informe radiológico", horas: 16, override: "extra", nota: "solo en este grupo", lecciones: [] },
    { id: "m5", clave: "05", titulo: "Vías urinarias y vejiga", horas: 72, override: "fecha", nota: "se abre el 29 jun", lecciones: [] },
  ],
  overrides: [
    { tipo: "reemplaza", titulo: "Recurso reemplazado", donde: "Módulo 04 · Lección 3", avisoResync: true },
    { tipo: "oculta", titulo: "Lección oculta", donde: "Módulo 04 · Lección 5" },
    { tipo: "extra", titulo: "Módulo extra", donde: "E1 · Taller de informe radiológico" },
    { tipo: "fecha", titulo: "Fecha movida", donde: "Módulo 05 · 22 jun → 29 jun" },
  ],
  resync: {
    donde: "Módulo 04 · Lección 3",
    versionNueva: "v4",
    versionGrupo: "v3",
    detalle: "agregó 3 bloques",
  },
  totales: { modulosAbiertos: 4, modulos: 12, horas: 1000 },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const OVERRIDE: Record<TipoOverride, { texto: string; icono: typeof EyeOff }> = {
  oculta: { texto: "Oculta en este grupo", icono: EyeOff },
  reemplaza: { texto: "Recurso reemplazado", icono: Repeat2 },
  extra: { texto: "Módulo extra del grupo", icono: Plus },
  fecha: { texto: "Fecha movida", icono: Calendar },
};

/** La señal: heredado (gris + eslabón) vs personalizado (violeta + qué se cambió). */
function Sello({ override }: { override?: TipoOverride }) {
  if (!override) {
    return (
      <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10.5px] font-semibold text-muted-foreground">
        <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
        Heredado
      </span>
    );
  }
  const o = OVERRIDE[override];
  const Icono = o.icono;
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
      <Icono aria-hidden className="h-3 w-3" strokeWidth={2} />
      {o.texto}
    </span>
  );
}

function ChipResync() {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
      <RefreshCw aria-hidden className="h-3 w-3" strokeWidth={2.2} />
      El programa cambió
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function GestionGrupo({ data = MOCK }: { data?: GrupoData }) {
  const {
    nombre,
    portada,
    programa,
    modalidad,
    fechas,
    docente,
    alumnos,
    liberacion,
    temario,
    overrides,
    resync,
    totales,
  } = data;

  const [abierto, setAbierto] = useState<string[]>(["m4"]);
  const [hoja, setHoja] = useState<{ modulo: string; leccion: NodoLeccion } | null>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onEditarCalendario = () => {};
  const onPersonalizarNodo = (_nodoId: string, _tipo: TipoOverride | "heredar") => setHoja(null);
  const onResincronizar = (_nodoId: string) => {};
  const onAsignarDocente = () => {};
  const onCambiarPortada = () => {};
  const onGuardar = () => {};
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ───── Header contextual del grupo ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <button
          type="button"
          aria-label="Volver a Grupos"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Grupos</span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
          <span className="whitespace-nowrap text-[14.5px] font-bold text-sidebar-foreground">
            {nombre}
          </span>
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
            En curso
          </span>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
            <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {overrides.length} personalizaciones
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Eye aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Vista previa del grupo
          </button>
          <button
            type="button"
            onClick={onGuardar}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            Guardar cambios
          </button>
        </div>
      </header>

      {/* ───── Franja: de dónde hereda ───── */}
      <div className="flex h-[52px] shrink-0 items-center gap-5 border-b border-border bg-card px-6">
        <span className="flex items-baseline gap-1.5">
          <span className={`${kicker} text-muted-foreground`}>Programa base</span>
          <a
            href={`/studio/programas/${programa.id}`}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-secondary no-underline"
          >
            <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {programa.nombre}
            <span className={`${mono} font-normal text-muted-foreground`}>{programa.version}</span>
          </a>
        </span>
        <span aria-hidden className="h-[22px] w-px bg-border" />
        {[
          ["Modalidad", modalidad === "sincrono" ? "Síncrono" : "Asíncrono"],
          ["Fechas", fechas ? `${fechas.inicio} – ${fechas.fin}` : "sin fechas"],
          ["Módulos abiertos", `${totales.modulosAbiertos} de ${totales.modulos}`],
          ["Horas", `${totales.horas} h`],
        ].map(([t, v]) => (
          <span key={t} className="flex items-baseline gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>{t}</span>
            <span className={`whitespace-nowrap text-[13.5px] font-bold ${t === "Modalidad" ? "" : mono}`}>
              {v}
            </span>
          </span>
        ))}
        <span aria-hidden className="h-[22px] w-px bg-border" />
        {docente && (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] place-items-center rounded-full bg-sidebar text-[9.5px] font-bold text-sidebar-foreground"
            >
              {docente.ini}
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold">{docente.nombre}</span>
          </span>
        )}
        <span className={`ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-3 text-[12px] font-semibold ${softText}`}>
          <Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className={`${mono} font-bold text-foreground`}>{alumnos.inscritos}</span>
          alumnos · CORA
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Lo que el grupo SÍ posee ════════ */}
        <aside className="w-[328px] shrink-0 overflow-y-auto border-r border-border bg-card p-5">
          <p className={`${kicker} text-muted-foreground`}>Datos del grupo</p>

          {/* Portada: proporción 16:9 por sistema, sin medidas en px */}
          <div className="mt-3.5 flex items-center gap-2.5">
            <p className="text-[11.5px] font-semibold">Portada del grupo</p>
            <span className={`${mono} ml-auto inline-flex h-5 items-center rounded-full border border-border bg-muted px-[7px] text-[10px] font-bold text-muted-foreground`}>
              16:9
            </span>
          </div>
          <div className="mt-2 overflow-hidden rounded-[11px] border border-border">
            <div
              className="relative grid w-full place-items-center bg-sidebar"
              style={{ aspectRatio: "16 / 9" }}
            >
              {portada?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portada.url} alt={portada.alt} className="h-full w-full object-cover" />
              ) : (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)",
                    }}
                  />
                  <span
                    className={`${mono} relative text-[9.5px] uppercase tracking-[0.14em]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    portada del grupo
                  </span>
                </>
              )}
              {portada?.original && (
                <span
                  className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
                  style={{ background: "rgba(15,45,82,.82)" }}
                >
                  {portada.original}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border bg-muted px-3 py-2.5">
              <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-muted-foreground">
                Se recorta a <span className={`${mono} font-bold text-foreground`}>16:9</span>; suba
                la más grande que tenga.
              </p>
              <button
                type="button"
                onClick={onCambiarPortada}
                className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                Cambiar
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5">
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Nombre del grupo</span>
              <input
                defaultValue={nombre}
                className="mt-1.5 h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Modalidad</span>
              <span className="mt-1.5 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                <select
                  defaultValue={modalidad}
                  className="w-full appearance-none bg-transparent text-[13.5px] font-medium text-foreground outline-none"
                >
                  <option value="sincrono">Síncrono · con fechas</option>
                  <option value="asincrono">Asíncrono · sin fechas</option>
                </select>
                <ChevronDown aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
              </span>
            </label>
            {fechas &&
              (
                [
                  ["Inicio", fechas.inicio],
                  ["Fin", fechas.fin],
                ] as const
              ).map(([l, v]) => (
                <label key={l} className="block">
                  <span className="block text-[11.5px] font-semibold">{l}</span>
                  <span className="mt-1.5 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                    <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className={`${mono} text-[13px]`}>{v}</span>
                  </span>
                </label>
              ))}
          </div>

          {docente && (
            <>
              <div className="mt-5 flex items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Docente asignado</p>
                <button
                  type="button"
                  onClick={onAsignarDocente}
                  className={`ml-auto h-[30px] rounded-full border border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  Cambiar
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 rounded-[11px] border border-border p-3">
                <span
                  aria-hidden
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-sidebar text-[12.5px] font-bold text-sidebar-foreground"
                >
                  {docente.ini}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold leading-snug">{docente.nombre}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {docente.area} · {docente.grupos} grupos
                  </span>
                </span>
              </div>
            </>
          )}

          <div className="mt-6 flex items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Calendario de liberación</p>
            <button
              type="button"
              onClick={onEditarCalendario}
              className={`ml-auto h-[30px] rounded-full border border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Editar
            </button>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            {modalidad === "sincrono"
              ? "Síncrono: cada módulo se abre en su fecha. El alumno ve el siguiente cuando llega el día."
              : "Asíncrono: disponible desde la inscripción, en orden secuencial."}
          </p>
          <ul className="mt-3 flex flex-col gap-0.5">
            {liberacion.map((m) => (
              <li
                key={m.clave}
                className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 ${
                  m.fechaMovida ? "bg-[color:var(--info-surface)]" : "hover:bg-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                    m.estado === "abierto" ? "bg-primary" : "bg-[color:var(--track)]"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold leading-snug">
                    {m.clave} · {m.titulo}
                  </span>
                  {m.fechaMovida && (
                    <span className="mt-0.5 block text-[10.5px] font-semibold text-[color:var(--info-foreground)]">
                      fecha movida en este grupo
                    </span>
                  )}
                </span>
                <span
                  className={`${mono} shrink-0 whitespace-nowrap text-[12px] font-semibold ${
                    m.fechaMovida ? "text-[color:var(--info-foreground)]" : softText
                  }`}
                >
                  {m.fecha}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* ════════ Contenido: heredado vs personalizado ════════ */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <h2 className="text-[17px] font-extrabold tracking-[-0.015em]">Contenido del grupo</h2>
          <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>
            Todo viene del programa y se actualiza solo. Lo que este grupo personalizó se queda como
            lo dejó.
          </p>

          {/* leyenda: si esto no se entiende, la pantalla falla */}
          <div className="mt-3.5 flex flex-wrap items-center gap-4 rounded-[11px] border border-border bg-card px-4 py-3">
            <span className={`${kicker} text-muted-foreground`}>Cómo leerlo</span>
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
              <Sello />
              se actualiza cuando se corrige el programa
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
              <span
                aria-hidden
                className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
              >
                <SlidersHorizontal className="h-3 w-3" strokeWidth={2} />
              </span>
              lo cambió este grupo · no se toca
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
              <span
                aria-hidden
                className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={2.2} />
              </span>
              el programa cambió ahí: decida
            </span>
          </div>

          {/* aviso de re-sincronización */}
          {resync && (
            <div className="mt-3.5 flex flex-wrap items-start gap-3.5 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] p-4">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
              >
                <RefreshCw className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="min-w-[280px] flex-1">
                <p className="text-[14px] font-bold leading-snug text-[color:var(--warning-foreground)]">
                  El programa base cambió en una lección que este grupo personalizó
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--warning-foreground)]">
                  {resync.donde}: el programa pasó a la{" "}
                  <span className={`${mono} font-bold`}>{resync.versionNueva}</span> y{" "}
                  {resync.detalle}. Su grupo mantiene el recurso reemplazado de la{" "}
                  <span className={`${mono} font-bold`}>{resync.versionGrupo}</span>.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={`h-10 whitespace-nowrap rounded-[10px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[13px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
                >
                  Ver la diferencia
                </button>
                <button
                  type="button"
                  onClick={() => onResincronizar("l3")}
                  className={`h-10 whitespace-nowrap rounded-[10px] bg-sidebar px-3.5 text-[13px] font-bold text-sidebar-foreground ${focusRing}`}
                >
                  Re-sincronizar
                </button>
              </div>
            </div>
          )}

          {/* temario */}
          <ul className="mt-4 flex flex-col gap-2.5">
            {temario.map((m) => {
              const on = abierto.includes(m.id);
              return (
                <li
                  key={m.id}
                  className={`overflow-hidden rounded-xl border bg-card ${
                    m.override ? "border-[color:var(--info-border)]" : "border-border"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 px-4 py-3.5 ${
                      m.override ? "bg-[color:var(--info-surface)]" : ""
                    } ${on ? "border-b border-border" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setAbierto((a) => (on ? a.filter((x) => x !== m.id) : [...a, m.id]))}
                      aria-expanded={on}
                      className={`flex min-w-0 flex-1 items-center gap-3 text-left ${focusRing}`}
                    >
                      <ChevronDown
                        aria-hidden
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${on ? "" : "-rotate-90"}`}
                        strokeWidth={2}
                      />
                      <span
                        aria-hidden
                        className={`${mono} grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[11.5px] font-bold ${
                          m.override
                            ? "bg-[color:var(--info)] text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.clave}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold leading-snug">{m.titulo}</span>
                        <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                          {m.horas} h · {m.lecciones.length || "—"} lecciones
                          {m.nota ? ` · ${m.nota}` : ""}
                        </span>
                      </span>
                    </button>
                    <Sello override={m.override} />
                    <button
                      type="button"
                      onClick={() => setHoja({ modulo: m.titulo, leccion: { id: m.id, titulo: m.titulo, override: m.override } })}
                      className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                    >
                      {m.override ? "Editar cambio" : "Personalizar"}
                    </button>
                  </div>

                  {on && m.lecciones.length > 0 && (
                    <ul className="px-2 pb-2.5 pt-1.5">
                      {m.lecciones.map((l, i) => (
                        <li
                          key={l.id}
                          className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 ${
                            l.override
                              ? "bg-[color:var(--info-surface)] shadow-[inset_3px_0_0_var(--info)]"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span
                            className={`min-w-0 flex-1 text-[13px] leading-relaxed ${
                              l.override === "oculta"
                                ? "text-[color:var(--info-foreground)] line-through"
                                : l.override
                                  ? "font-semibold"
                                  : ""
                            }`}
                          >
                            {i + 1}. {l.titulo}
                          </span>
                          <Sello override={l.override} />
                          {l.avisoResync && <ChipResync />}
                          <button
                            type="button"
                            onClick={() => setHoja({ modulo: m.titulo, leccion: l })}
                            className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold transition-colors hover:bg-accent ${focusRing} ${
                              l.override ? "text-[color:var(--info-foreground)]" : "text-secondary"
                            }`}
                          >
                            {l.override ? "Editar cambio" : "Personalizar"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={`mt-3 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
          >
            <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
            Agregar un módulo extra a este grupo
          </button>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            El contenido no se copia: el grupo apunta al programa. Personalizar guarda solo la
            excepción, así que una corrección en el programa llega sola a todo lo heredado.
          </p>
        </div>

        {/* ════════ Consulta: alumnos (CORA) + overrides ════════ */}
        <aside className="w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Alumnos y avance</p>
            <span className={`ml-auto inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-muted-foreground`}>
              <Lock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Solo lectura
            </span>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            Las inscripciones vienen de CORA. Para dar de alta o baja a alguien, hágalo allá.
          </p>

          <div className="mt-3.5 flex items-center gap-3.5 rounded-[11px] bg-muted px-3.5 py-3">
            {(
              [
                [alumnos.inscritos, "inscritos", ""],
                [`${alumnos.avanceMedio}%`, "avance medio", "text-accent-foreground"],
                [alumnos.atrasados, "atrasados", "text-[color:var(--warning-foreground)]"],
              ] as const
            ).map(([v, l, c]) => (
              <span key={l}>
                <span className={`${mono} block text-[20px] font-extrabold ${c}`}>{v}</span>
                <span className="block text-[11px] text-muted-foreground">{l}</span>
              </span>
            ))}
          </div>

          <ul className="mt-3.5 flex flex-col gap-0.5">
            {alumnos.lista.map((a) => (
              <li key={a.ini} className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 hover:bg-muted">
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[10.5px] font-bold text-sidebar-foreground"
                >
                  {a.ini}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold leading-snug">
                    {a.nombre}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
                    >
                      <span
                        className={`block h-full rounded-full ${a.alDia ? "bg-primary" : "bg-[color:var(--warning)]"}`}
                        style={{ width: `${a.avance}%` }}
                      />
                    </span>
                    <span className={`${mono} shrink-0 text-[10.5px] font-bold text-muted-foreground`}>
                      {a.avance}%
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`mt-2.5 h-10 w-full rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver los {alumnos.inscritos} en CORA
          </button>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Personalizaciones de este grupo</p>
          <ul className="mt-3 flex flex-col gap-2">
            {overrides.map((o) => (
              <li
                key={o.donde}
                className="flex gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--info)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold leading-snug text-[color:var(--info-foreground)]">
                    {o.titulo}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[color:var(--info-foreground)]">
                    {o.donde}
                  </span>
                  {o.avisoResync && (
                    <span className="mt-1.5 inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                      El programa cambió
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* ───── Hoja: personalizar un nodo (mantener heredado va primero) ───── */}
      {hoja && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Personalizar en este grupo"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <p className={`${kicker} text-[color:var(--info-foreground)]`}>
                Personalizar en este grupo
              </p>
              <h2 className="mt-2.5 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
                {hoja.modulo} · {hoja.leccion.titulo}
              </h2>
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                Hoy este nodo es <span className="font-bold text-foreground">heredado</span>:
                cualquier corrección en el programa llega sola. Si lo personaliza, este grupo deja de
                recibir esos cambios aquí.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                {(
                  [
                    ["heredar", Link2, "Mantener heredada", "Sigue el programa base. Es el estado recomendado."],
                    ["reemplaza", Repeat2, "Reemplazar un recurso", "Cambie el cine-loop o la lectura solo para este grupo; el resto sigue heredado."],
                    ["oculta", EyeOff, "Ocultar en este grupo", "El alumno no la verá ni contará en su avance. Nada se borra del programa."],
                    ["fecha", Calendar, "Mover su fecha", "Se abre en otro día, sin tocar el calendario del programa."],
                  ] as const
                ).map(([k, Icono, t, d]) => {
                  const on = k === (hoja.leccion.override ?? "heredar");
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-start gap-3 rounded-[11px] border p-3.5 transition-colors ${
                        on
                          ? "border-[color:var(--info)] bg-[color:var(--info-surface)]"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="override"
                        defaultChecked={on}
                        onChange={() => onPersonalizarNodo(hoja.leccion.id, k)}
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--info)]"
                      />
                      <span
                        aria-hidden
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${
                          on ? "bg-[color:var(--info)] text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icono className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[13.5px] font-bold leading-snug ${
                            on ? "text-[color:var(--info-foreground)]" : ""
                          }`}
                        >
                          {t}
                        </span>
                        <span
                          className={`mt-1 block text-[12.5px] leading-relaxed ${
                            on ? "text-[color:var(--info-foreground)]" : "text-muted-foreground"
                          }`}
                        >
                          {d}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-[11px] bg-muted px-3.5 py-3">
                <Link2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>
                  Solo se guarda la excepción, no una copia. Si el programa cambia aquí, le
                  avisaremos para que decida si re-sincroniza.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 text-[11.5px] text-muted-foreground`}>
                quedará como personalización de {nombre}
              </span>
              <span className="ml-auto flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setHoja(null)}
                  className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onPersonalizarNodo(hoja.leccion.id, "reemplaza")}
                  className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Guardar personalización
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

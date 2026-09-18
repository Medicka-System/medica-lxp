"use client";

/**
 * Studio · Builder del programa — la pieza principal del back office
 *
 * El programa es la PLANTILLA viva. Aquí se construye su temario: Programa → Módulos → Lecciones →
 * Bloques de actividad. Nada de herencia ni overrides: eso es de Grupos.
 *
 * Header contextual: al entrar a un programa la navegación general se oculta y el header pasa a
 * breadcrumb + estado + Guardar / Publicar / Vista previa, para dar todo el ancho al lienzo. Esta
 * página trae su propio header, así que se monta FUERA de app/(studio)/layout.tsx.
 *
 * Publicación explícita: borrador → revisión → publicado. Los grupos en curso siguen viendo la
 * versión publicada hasta que el diseñador publica.
 *
 * El editor PROFUNDO de cada bloque (subir el loop, armar el H5P, escribir preguntas) es otra
 * pantalla: aquí sólo esqueleto, tipo, título y orden.
 *
 * Stubs: onAgregarModulo · onAgregarLeccion · onAgregarActividad · onReordenar · onGuardar ·
 *        onPublicar · onVistaPrevia
 */

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileCheck2,
  GripVertical,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { mono, kicker, softText, focusRing, focusRingDark } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoBloque = "video" | "teoria" | "h5p" | "autoevaluacion" | "tarea" | "foro";
export type EstadoPieza = "publicado" | "borrador";

export type Bloque = {
  id: string;
  tipo: TipoBloque;
  titulo: string;
  meta: string;
  estado: EstadoPieza;
};

export type Leccion = {
  id: string;
  titulo: string;
  estado: EstadoPieza;
  minutos: number;
  bloques: Bloque[];
};

export type Modulo = {
  id: string;
  clave: string;
  titulo: string;
  horas: number;
  lecciones: Leccion[];
};

export type Version = {
  id: string;
  etiqueta: string;
  quien: string;
  estado: "borrador" | "publicada";
  fecha: string;
};

export type Cambio = { titulo: string; detalle: string; clase: "nuevo" | "cambio" };

export type ProgramaData = {
  id: string;
  nombre: string;
  estado: "borrador" | "revision" | "publicado";
  versionBorrador: string;
  versionPublicada: string;
  gruposActivos: number;
  guardado: string;
  totales: { modulos: number; horas: number; lecciones: number; actividades: number };
  modulos: Modulo[];
  cambiosSinPublicar: Cambio[];
  versiones: Version[];
};

const MOCK: ProgramaData = {
  id: "p1",
  nombre: "Ultrasonografía Médica",
  estado: "borrador",
  versionBorrador: "v4",
  versionPublicada: "v3",
  gruposActivos: 8,
  guardado: "hace 12 s",
  totales: { modulos: 12, horas: 1000, lecciones: 68, actividades: 214 },
  modulos: [
    { id: "m1", clave: "01", titulo: "Fundamentos y modo B", horas: 64, lecciones: [] },
    { id: "m2", clave: "02", titulo: "Abdomen y retroperitoneo", horas: 96, lecciones: [] },
    { id: "m3", clave: "03", titulo: "Hígado y vía biliar", horas: 120, lecciones: [] },
    {
      id: "m4",
      clave: "04",
      titulo: "Interpretación renal",
      horas: 88,
      lecciones: [
        { id: "l1", titulo: "Anatomía sonográfica del riñón", estado: "publicado", minutos: 40, bloques: [] },
        { id: "l2", titulo: "Técnica de barrido y ventanas", estado: "publicado", minutos: 35, bloques: [] },
        {
          id: "l3",
          titulo: "Hidronefrosis: gradación y trampas del modo B",
          estado: "borrador",
          minutos: 45,
          bloques: [
            { id: "b1", tipo: "video", titulo: "Hidronefrosis grado I a IV con marcadores", meta: "18:40", estado: "publicado" },
            { id: "b2", tipo: "teoria", titulo: "Lectura: gradación y trampas del modo B", meta: "10 min", estado: "publicado" },
            { id: "b3", tipo: "h5p", titulo: "Arrastra el grado correcto a cada imagen", meta: "8 ítems", estado: "borrador" },
            { id: "b4", tipo: "autoevaluacion", titulo: "Punto de control: 5 preguntas de una respuesta", meta: "5 preguntas", estado: "publicado" },
            { id: "b5", tipo: "tarea", titulo: "Suba un caso propio con gradación argumentada", meta: "se acredita al validar", estado: "publicado" },
            { id: "b6", tipo: "foro", titulo: "¿Qué los hace dudar entre grado II y III?", meta: "discusión cerrada", estado: "borrador" },
          ],
        },
        { id: "l4", titulo: "Quistes y lesiones sólidas", estado: "publicado", minutos: 40, bloques: [] },
        { id: "l5", titulo: "Doppler renal aplicado", estado: "borrador", minutos: 45, bloques: [] },
        { id: "l6", titulo: "Cierre: informe estructurado", estado: "publicado", minutos: 30, bloques: [] },
      ],
    },
    { id: "m5", clave: "05", titulo: "Vías urinarias y vejiga", horas: 72, lecciones: [] },
    { id: "m6", clave: "06", titulo: "Obstétrico I · primer trimestre", horas: 96, lecciones: [] },
    { id: "m7", clave: "07", titulo: "Obstétrico II · seguimiento", horas: 104, lecciones: [] },
    { id: "m8", clave: "08", titulo: "Doppler y hemodinamia", horas: 88, lecciones: [] },
  ],
  cambiosSinPublicar: [
    { titulo: "3 bloques nuevos", detalle: "Lección 3 · Interpretación renal", clase: "nuevo" },
    { titulo: "1 lección agregada", detalle: "Módulo 04", clase: "nuevo" },
    { titulo: "Horas del módulo 04", detalle: "80 h → 88 h", clase: "cambio" },
    { titulo: "Total del programa", detalle: "992 h → 1000 h", clase: "cambio" },
  ],
  versiones: [
    { id: "v4", etiqueta: "v4", quien: "Mariana V.", estado: "borrador", fecha: "hace 12 min" },
    { id: "v3", etiqueta: "v3", quien: "Mariana V.", estado: "publicada", fecha: "2 oct 2026" },
    { id: "v2", etiqueta: "v2", quien: "Karla L.", estado: "publicada", fecha: "18 jul 2026" },
    { id: "v1", etiqueta: "v1", quien: "Hugo C.", estado: "publicada", fecha: "3 may 2026" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const BLOQUE: Record<
  TipoBloque,
  { rotulo: string; corto: string; icono: typeof Video; clase: string }
> = {
  video: { rotulo: "Contenido · Cine-loop", corto: "Cine-loop o video", icono: Video, clase: "bg-accent text-accent-foreground" },
  teoria: { rotulo: "Contenido · Teoría", corto: "Teoría", icono: BookOpen, clase: "bg-accent text-accent-foreground" },
  h5p: { rotulo: "Contenido · H5P", corto: "H5P interactivo", icono: SlidersHorizontal, clase: "bg-accent text-accent-foreground" },
  autoevaluacion: {
    rotulo: "Autoevaluación",
    corto: "Autoevaluación",
    icono: CheckCircle2,
    clase: "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
  tarea: {
    rotulo: "Tarea",
    corto: "Tarea",
    icono: FileCheck2,
    clase: "bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  // el foro es discusión CERRADA del grupo — distinto del Ateneo (comunidad abierta)
  foro: { rotulo: "Foro del grupo", corto: "Foro del grupo", icono: MessageSquare, clase: "bg-sidebar text-sidebar-foreground" },
};

function ChipBorrador() {
  return (
    <span className="inline-flex h-[19px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
      Borrador
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function BuilderPrograma({ data = MOCK }: { data?: ProgramaData }) {
  const {
    nombre,
    versionBorrador,
    versionPublicada,
    gruposActivos,
    guardado,
    totales,
    modulos,
    cambiosSinPublicar,
    versiones,
  } = data;

  const moduloInicial = modulos.find((m) => m.lecciones.length > 0) ?? modulos[0];
  const [abierto, setAbierto] = useState<string[]>([moduloInicial.id]);
  const [leccionId, setLeccionId] = useState(
    moduloInicial.lecciones.find((l) => l.bloques.length > 0)?.id ?? moduloInicial.lecciones[0]?.id,
  );
  const [dialogo, setDialogo] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAgregarModulo = () => {};
  const onAgregarLeccion = (_moduloId: string) => {};
  const onAgregarActividad = (_leccionId: string, _tipo: TipoBloque) => {};
  const onReordenar = (_tipo: "modulo" | "leccion" | "bloque", _de: number, _a: number) => {};
  const onGuardar = () => {};
  const onPublicar = () => setDialogo(false);
  const onVistaPrevia = () => {};
  /* ──────────────────────────────────────────────────────── */

  const modulo = modulos.find((m) => m.lecciones.some((l) => l.id === leccionId));
  const leccion = modulo?.lecciones.find((l) => l.id === leccionId);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ───── Header contextual: sin navegación general ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <button
          type="button"
          aria-label="Volver a Programas"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Programas</span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
          <span className="whitespace-nowrap text-[14.5px] font-bold text-sidebar-foreground">
            {nombre}
          </span>
          <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
            Borrador
          </span>
          <span className={`${mono} whitespace-nowrap text-[11.5px] text-white/55`}>
            {versionBorrador} · cambios sin publicar
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`${mono} inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-white/60`}>
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
            guardado {guardado}
          </span>
          <button
            type="button"
            onClick={onVistaPrevia}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Eye aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Vista previa como alumno
          </button>
          <button
            type="button"
            onClick={onGuardar}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => setDialogo(true)}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
            Publicar
          </button>
        </div>
      </header>

      {/* ───── Franja de contexto del programa ───── */}
      <div className="flex h-[52px] shrink-0 items-center gap-5 border-b border-border bg-card px-6">
        {[
          ["Módulos", String(totales.modulos)],
          ["Horas del programa", `${totales.horas} h`],
          ["Lecciones", String(totales.lecciones)],
          ["Actividades", String(totales.actividades)],
          ["Grupos que derivan", String(gruposActivos)],
        ].map(([t, v]) => (
          <span key={t} className="flex items-baseline gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>{t}</span>
            <span className={`${mono} text-[14px] font-bold`}>{v}</span>
          </span>
        ))}
        <button
          type="button"
          className={`ml-auto inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Historial de versiones
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Estructura ════════ */}
        <aside className="flex w-[324px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <p className={`${kicker} text-muted-foreground`}>Estructura</p>
            <button
              type="button"
              onClick={onAgregarModulo}
              className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
              Módulo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 pb-4">
            {modulos.map((m, iM) => {
              const on = abierto.includes(m.id);
              return (
                <div key={m.id} className="mb-0.5">
                  <div
                    className={`flex items-center gap-2 rounded-[9px] px-2 py-2.5 ${
                      on ? "bg-muted" : "hover:bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Reordenar ${m.titulo}`}
                      onKeyDown={(e) => e.key === "ArrowDown" && onReordenar("modulo", iM, iM + 1)}
                      className={`shrink-0 cursor-grab text-[color:var(--track)] ${focusRing}`}
                    >
                      <GripVertical aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbierto((a) => (on ? a.filter((x) => x !== m.id) : [...a, m.id]))}
                      aria-expanded={on}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${focusRing}`}
                    >
                      <ChevronDown
                        aria-hidden
                        className={`h-[15px] w-[15px] shrink-0 text-muted-foreground transition-transform ${on ? "" : "-rotate-90"}`}
                        strokeWidth={2}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[13px] leading-snug ${on ? "font-bold" : "font-semibold"}`}
                        >
                          {m.clave} · {m.titulo}
                        </span>
                        <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                          {m.horas} h · {m.lecciones.length || "—"} lecciones
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Acciones de ${m.titulo}`}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-foreground ${focusRing}`}
                    >
                      <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  {on && m.lecciones.length > 0 && (
                    <div className="mb-1.5 ml-[26px] mt-0.5 border-l-[1.5px] border-border pl-3">
                      {m.lecciones.map((l, iL) => {
                        const sel = l.id === leccionId;
                        return (
                          <div
                            key={l.id}
                            className={`flex items-center gap-2 rounded-[9px] p-2 ${
                              sel ? "bg-accent shadow-[inset_0_0_0_1px_var(--primary)]" : "hover:bg-muted"
                            }`}
                          >
                            <button
                              type="button"
                              aria-label={`Reordenar ${l.titulo}`}
                              onKeyDown={(e) => e.key === "ArrowDown" && onReordenar("leccion", iL, iL + 1)}
                              className={`shrink-0 cursor-grab text-[color:var(--track)] ${focusRing}`}
                            >
                              <GripVertical aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setLeccionId(l.id)}
                              aria-current={sel ? "true" : undefined}
                              className={`min-w-0 flex-1 text-left ${focusRing}`}
                            >
                              <span
                                className={`block text-[12.5px] leading-snug ${
                                  sel ? "font-bold text-accent-foreground" : `font-medium ${softText}`
                                }`}
                              >
                                {iL + 1}. {l.titulo}
                              </span>
                            </button>
                            {l.estado === "borrador" && <ChipBorrador />}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => onAgregarLeccion(m.id)}
                        className={`flex w-full items-center gap-1.5 rounded-[9px] p-2 text-left text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                      >
                        <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Agregar lección
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-2.5 flex items-center gap-2 rounded-[10px] bg-muted px-3 py-2.5">
              <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>
                Suma del programa
              </span>
              <span className={`${mono} ml-auto text-[14px] font-extrabold`}>{totales.horas} h</span>
            </div>
          </div>
        </aside>

        {/* ════════ Lienzo: la lección y sus bloques ════════ */}
        <div className="min-w-0 flex-1 overflow-y-auto px-7 py-6">
          {leccion && modulo ? (
            <>
              <p className={`${kicker} text-secondary`}>
                Módulo {modulo.clave} · {modulo.titulo} · Lección{" "}
                {modulo.lecciones.findIndex((l) => l.id === leccion.id) + 1}
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                  {leccion.titulo}
                </h1>
                <button
                  type="button"
                  aria-label="Renombrar la lección"
                  className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                {leccion.estado === "borrador" && (
                  <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                    Borrador
                  </span>
                )}
                <span className={`${mono} inline-flex items-center gap-1.5 text-[12px] text-muted-foreground`}>
                  <Clock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {leccion.minutos} min estimados
                </span>
                <span className={`${mono} text-[12px] text-muted-foreground`}>
                  {leccion.bloques.length} bloques · editada hace 12 min
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <h2 className="text-[15px] font-bold tracking-[-0.01em]">Bloques de actividad</h2>
                <span className="text-[12.5px] text-muted-foreground">
                  Arrastre para cambiar el orden en que el alumno los ve.
                </span>
              </div>

              <ol className="mt-3.5 flex flex-col gap-2">
                {leccion.bloques.map((b, i) => {
                  const cfg = BLOQUE[b.tipo];
                  const Icono = cfg.icono;
                  return (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary"
                    >
                      <button
                        type="button"
                        aria-label={`Reordenar ${b.titulo}`}
                        onKeyDown={(e) => e.key === "ArrowDown" && onReordenar("bloque", i, i + 1)}
                        className={`shrink-0 cursor-grab text-[color:var(--track)] ${focusRing}`}
                      >
                        <GripVertical aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                      </button>
                      <span
                        aria-hidden
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${cfg.clase}`}
                      >
                        <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`${kicker} tracking-[0.12em] text-muted-foreground`}>
                            {cfg.rotulo}
                          </span>
                          {b.estado === "borrador" && <ChipBorrador />}
                        </span>
                        <span
                          className="mt-1 block text-[13.5px] font-semibold leading-snug"
                          style={{ textWrap: "pretty" }}
                        >
                          {b.titulo}
                        </span>
                      </span>
                      <span className={`${mono} shrink-0 whitespace-nowrap text-[11.5px] text-muted-foreground`}>
                        {b.meta}
                      </span>
                      <span className="flex shrink-0 gap-0.5">
                        {[
                          { label: "Editar a fondo", icono: Pencil },
                          { label: "Duplicar", icono: Copy },
                          { label: "Eliminar", icono: Trash2 },
                        ].map(({ label, icono: I }) => (
                          <button
                            key={label}
                            type="button"
                            aria-label={`${label}: ${b.titulo}`}
                            className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                          >
                            <I aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* agregar bloque */}
              <div className="mt-3.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card p-4">
                <p className={`${kicker} text-muted-foreground`}>Agregar bloque</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(BLOQUE) as TipoBloque[]).map((t) => {
                    const cfg = BLOQUE[t];
                    const Icono = cfg.icono;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onAgregarActividad(leccion.id, t)}
                        className={`inline-flex h-11 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                      >
                        <span
                          aria-hidden
                          className={`grid h-[26px] w-[26px] place-items-center rounded-lg ${cfg.clase}`}
                        >
                          <Icono className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        </span>
                        {cfg.corto}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
                  El editor a fondo de cada bloque —subir el loop, armar el H5P, escribir las
                  preguntas— se abre desde el propio bloque. Aquí define el esqueleto y el orden.
                </p>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <p className={`text-[14px] ${softText}`}>
                Seleccione una lección en la estructura para ver sus bloques.
              </p>
            </div>
          )}
        </div>

        {/* ════════ Publicación y versiones ════════ */}
        <aside className="w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
          <p className={`${kicker} text-muted-foreground`}>Publicación</p>
          <div className="mt-3.5 flex items-center gap-2">
            {(["Borrador", "Revisión", "Publicado"] as const).map((t, i) => (
              <span key={t} className="flex flex-1 items-center gap-2">
                {i > 0 && <span aria-hidden className="h-[1.5px] flex-1 bg-border" />}
                <span
                  className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
                    i === 0
                      ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i === 0 && (
                    <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[color:var(--warning)]" />
                  )}
                  {t}
                </span>
              </span>
            ))}
          </div>

          <p className={`mt-3.5 text-[12.5px] leading-relaxed ${softText}`}>
            Sus cambios viven en el borrador{" "}
            <span className={`${mono} font-bold text-foreground`}>{versionBorrador}</span>. Los{" "}
            <span className="font-bold text-foreground">{gruposActivos} grupos activos</span> siguen
            viendo la <span className={`${mono} font-bold text-foreground`}>{versionPublicada}</span>{" "}
            hasta que publique.
          </p>

          <div className="mt-4 rounded-[11px] bg-muted p-3.5">
            <p className={`${kicker} tracking-[0.1em] text-muted-foreground`}>
              Cambios sin publicar
            </p>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {cambiosSinPublicar.slice(0, 3).map((c) => (
                <li key={c.titulo} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      c.clase === "nuevo" ? "bg-primary" : "bg-[color:var(--warning)]"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold leading-snug">{c.titulo}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {c.detalle}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setDialogo(true)}
            className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Publicar la {versionBorrador}
          </button>
          <button
            type="button"
            className={`mt-2 h-11 w-full rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Enviar a revisión
          </button>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Versiones</p>
          <div className="mt-3 flex flex-col gap-0.5">
            {versiones.map((v) => {
              const on = v.estado === "borrador";
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left transition-colors ${focusRing} ${
                    on ? "bg-accent" : "hover:bg-muted"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`${mono} grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[11px] font-bold ${
                      on ? "bg-primary text-[color:var(--sidebar)]" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.etiqueta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">
                      {v.estado === "borrador" ? "Borrador" : "Publicada"} · {v.quien}
                    </span>
                    <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                      {v.fecha}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ───── Diálogo de publicación: acto explícito ───── */}
      {dialogo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Publicar la ${versionBorrador}`}
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <p className={`${kicker} text-secondary`}>Publicar la {versionBorrador}</p>
              <h2 className="mt-2.5 text-[21px] font-extrabold leading-snug tracking-[-0.02em]">
                Los {gruposActivos} grupos activos pasarán a la {versionBorrador}
              </h2>
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                Los alumnos que ya cursan verán los bloques nuevos en su próxima entrada. Lo ya
                acreditado no se recalcula.
              </p>

              <ul className="mt-4 overflow-hidden rounded-[11px] border border-border">
                {cambiosSinPublicar.map((c, i) => (
                  <li
                    key={c.titulo}
                    className={`flex items-center gap-3 bg-card px-3.5 py-3 ${i ? "border-t border-border" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        c.clase === "nuevo" ? "bg-primary" : "bg-[color:var(--warning)]"
                      }`}
                    />
                    <span className="min-w-0 flex-1 text-[13px] font-semibold">{c.titulo}</span>
                    <span className={`${mono} shrink-0 text-[12px] text-muted-foreground`}>
                      {c.detalle}
                    </span>
                  </li>
                ))}
              </ul>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--secondary)]"
                />
                <span className={`text-[13px] leading-relaxed ${softText}`}>
                  Avisar a los docentes de los {gruposActivos} grupos
                </span>
              </label>

              <label className="mt-3.5 block">
                <span className="block text-[11.5px] font-semibold">
                  Nota de la versión{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </span>
                <textarea
                  rows={2}
                  placeholder="Qué cambió y por qué…"
                  className="mt-1.5 w-full resize-none rounded-[10px] border border-border bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                quedará como {versionBorrador} · 16 nov 2026
              </span>
              <span className="ml-auto flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDialogo(false)}
                  className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onPublicar}
                  className={`h-12 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Publicar ahora
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

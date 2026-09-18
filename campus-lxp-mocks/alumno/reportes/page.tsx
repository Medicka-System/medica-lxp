"use client";

/**
 * Mis reportes · generador clínico — Campus Virtual · Médica Capacitación
 *
 * HERRAMIENTA, no vista de consulta: reemplaza el reporte hecho en Word. El médico crea el
 * reporte aquí, embebe sus imágenes DICOM (visor real: Cornerstone3D) y lo imprime, descarga en
 * PDF o envía al paciente. La plantilla GUÍA la redacción para que no haya omisiones.
 *
 * Dos piezas en este archivo:
 *   · ListadoReportes (default export)  — "qué me falta" + tabla de reportes
 *   · EditorReporte                     — documento a la izquierda, estación a la derecha
 *
 * ZONAS PLACEHOLDER (contenido clínico definido aparte, NO inventado aquí):
 *   · guía de cada sección de la plantilla
 *   · recomendaciones sugeridas
 *   · membrete del consultorio y firma del médico
 *
 * Stubs: onNuevoReporte · onAbrirReporte · onGuardarBorrador · onGenerarPDF · onImprimir
 *        onEnviarPaciente · onGuardarComoCaso
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Images,
  Mail,
  MoreHorizontal,
  NotebookText,
  Plus,
  Printer,
  Save,
  Search,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoReporte = "borrador" | "finalizado" | "enviado";
export type TipoEstudio = "Abdominal" | "Obstétrico" | "Mama" | "Doppler venoso";

export type Reporte = {
  id: string;
  folio: string;
  paciente: string;
  edadSexo: string;
  tipo: TipoEstudio;
  fecha: string;
  estado: EstadoReporte;
  imagenes: number;
  nota: string;
};

export type Plantilla = { tipo: TipoEstudio; secciones: string[] };

export type SeccionReporte = {
  id: string;
  titulo: string;
  estado: "listo" | "pendiente" | "vacio";
  texto: string;
  imagenesInsertadas: number;
};

export type ReporteEnEdicion = {
  folio: string;
  tipo: TipoEstudio;
  estado: EstadoReporte;
  guardado: string;
  estudio: { campo: string; valor: string; mono?: boolean }[];
  motivo: string;
  secciones: SeccionReporte[];
  seccionesTotales: number;
  piezas: { etiqueta: string; insertada?: boolean }[];
  checklist: { item: string; listo: boolean }[];
};

export type ReportesData = {
  resumen: { borradores: number; listos: number; enviadosSemana: number; delMes: number };
  conteos: { todos: number; borradores: number; finalizados: number; enviados: number };
  plantillas: Plantilla[];
  items: Reporte[];
};

const MOCK: ReportesData = {
  resumen: { borradores: 2, listos: 2, enviadosSemana: 9, delMes: 38 },
  conteos: { todos: 38, borradores: 2, finalizados: 12, enviados: 24 },
  plantillas: [
    {
      tipo: "Abdominal",
      secciones: [
        "Hígado y vía biliar",
        "Riñones y vía urinaria",
        "Bazo y páncreas",
        "Grandes vasos",
        "Vejiga",
        "Otros hallazgos",
      ],
    },
    { tipo: "Obstétrico", secciones: ["Biometría", "Anatomía", "Placenta", "Líquido", "Doppler"] },
    { tipo: "Mama", secciones: ["Mama derecha", "Mama izquierda", "Axilas", "Clasificación"] },
    {
      tipo: "Doppler venoso",
      secciones: ["Femoral", "Poplítea", "Tibiales", "Superficial", "Compresibilidad"],
    },
  ],
  items: [
    {
      id: "r248",
      folio: "RPT-0248",
      paciente: "María G. R.",
      edadSexo: "46 a · F",
      tipo: "Abdominal",
      fecha: "4 nov · 09:40",
      estado: "borrador",
      imagenes: 6,
      nota: "Sin firmar",
    },
    {
      id: "r247",
      folio: "RPT-0247",
      paciente: "Jorge A. M.",
      edadSexo: "58 a · M",
      tipo: "Doppler venoso",
      fecha: "3 nov · 18:05",
      estado: "enviado",
      imagenes: 8,
      nota: "Enviado al paciente",
    },
    {
      id: "r246",
      folio: "RPT-0246",
      paciente: "Lucía V. S.",
      edadSexo: "31 a · F",
      tipo: "Obstétrico",
      fecha: "3 nov · 11:20",
      estado: "finalizado",
      imagenes: 10,
      nota: "Listo para enviar",
    },
    {
      id: "r245",
      folio: "RPT-0245",
      paciente: "Ana P. L.",
      edadSexo: "44 a · F",
      tipo: "Mama",
      fecha: "2 nov · 16:50",
      estado: "finalizado",
      imagenes: 7,
      nota: "Listo para enviar",
    },
    {
      id: "r244",
      folio: "RPT-0244",
      paciente: "Raúl T. C.",
      edadSexo: "63 a · M",
      tipo: "Abdominal",
      fecha: "1 nov · 10:15",
      estado: "enviado",
      imagenes: 5,
      nota: "Enviado al paciente",
    },
    {
      id: "r243",
      folio: "RPT-0243",
      paciente: "Sofía N. H.",
      edadSexo: "28 a · F",
      tipo: "Obstétrico",
      fecha: "31 oct · 12:30",
      estado: "borrador",
      imagenes: 3,
      nota: "Falta impresión diagnóstica",
    },
  ],
};

const EN_EDICION: ReporteEnEdicion = {
  folio: "RPT-0248",
  tipo: "Abdominal",
  estado: "borrador",
  guardado: "hace 2 min",
  estudio: [
    { campo: "Paciente", valor: "María Guadalupe Ramírez" },
    { campo: "Edad y sexo", valor: "46 años · Femenino" },
    { campo: "Expediente", valor: "EXP-99421", mono: true },
    { campo: "Fecha del estudio", valor: "4 de noviembre de 2026" },
    { campo: "Médico solicitante", valor: "Dr. Iván Torres" },
    { campo: "Equipo", valor: "Convexo 3.5–5 MHz" },
  ],
  motivo: "Dolor lumbar derecho de tres días, tipo cólico",
  secciones: [
    { id: "s1", titulo: "Hígado y vía biliar", estado: "listo", texto: "", imagenesInsertadas: 1 },
    {
      id: "s2",
      titulo: "Riñones y vía urinaria",
      estado: "pendiente",
      texto: "",
      imagenesInsertadas: 1,
    },
    { id: "s3", titulo: "Bazo y páncreas", estado: "vacio", texto: "", imagenesInsertadas: 0 },
  ],
  seccionesTotales: 6,
  piezas: [
    { etiqueta: "long. der", insertada: true },
    { etiqueta: "transv. der", insertada: true },
    { etiqueta: "izquierdo" },
    { etiqueta: "vejiga" },
    { etiqueta: "uréter" },
    { etiqueta: "doppler" },
  ],
  checklist: [
    { item: "Datos del paciente", listo: true },
    { item: "Al menos una imagen", listo: true },
    { item: "Hígado y vía biliar", listo: true },
    { item: "Membrete y firma", listo: true },
    { item: "Riñones y vía urinaria", listo: false },
    { item: "Impresión diagnóstica", listo: false },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const campo =
  "mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary";
const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

const etiquetaEstado: Record<EstadoReporte, string> = {
  borrador: "Borrador",
  finalizado: "Finalizado",
  enviado: "Enviado",
};
const claseEstado: Record<EstadoReporte, string> = {
  borrador: "border border-border bg-muted text-[color:var(--foreground-soft)]",
  finalizado: "bg-accent text-accent-foreground",
  enviado:
    "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
};

/** Zona reservada: la estructura existe, el contenido clínico se define aparte. */
function Zona({ titulo, nota, minAlto }: { titulo: string; nota: string; minAlto: number }) {
  return (
    <div
      className="rounded-[11px] border-[1.5px] border-dashed p-4"
      style={{
        minHeight: minAlto,
        borderColor: "color-mix(in oklab, var(--secondary) 35%, white)",
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary) 7%, transparent) 0 6px, transparent 6px 13px)",
      }}
    >
      <p className={`${kicker} text-secondary`}>{titulo}</p>
      <p className={`mt-1.5 text-[12.5px] leading-relaxed ${softText}`}>{nota}</p>
    </div>
  );
}

/* ═══════════════════════════ EDITOR ═══════════════════════════ */

export function EditorReporte({
  reporte = EN_EDICION,
  onVolver,
}: {
  reporte?: ReporteEnEdicion;
  onVolver?: () => void;
}) {
  const [pieza, setPieza] = useState(0);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onGuardarBorrador = () => {};
  const onGenerarPDF = () => {};
  const onImprimir = () => {};
  const onEnviarPaciente = () => {};
  const onGuardarComoCaso = () => {};
  /* ──────────────────────────────────────────────────────── */

  const hechos = reporte.checklist.filter((c) => c.listo).length;
  const insertadas = reporte.piezas.filter((p) => p.insertada).length;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* barra del reporte */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver a mis reportes"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">
              Ultrasonido {reporte.tipo.toLowerCase()}
            </h1>
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[reporte.estado]}`}
            >
              {etiquetaEstado[reporte.estado]}
            </span>
          </div>
          <p className={`${mono} mt-1 text-[12.5px] text-muted-foreground`}>
            {reporte.folio} · guardado {reporte.guardado}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGuardarBorrador}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={onImprimir}
            aria-label="Imprimir"
            className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Printer aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onGenerarPDF}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Download aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            PDF
          </button>
          <button
            type="button"
            onClick={onEnviarPaciente}
            className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Mail aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Finalizar y enviar
          </button>
          <button
            type="button"
            aria-label="Más acciones"
            className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ══════ documento ══════ */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Datos del estudio</p>
              <span className="ml-auto text-[12px] text-muted-foreground">
                Documento clínico · sí lleva datos del paciente
              </span>
            </div>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {reporte.estudio.map((c) => (
                <label key={c.campo} className="block">
                  <span className="block text-[11.5px] font-semibold">{c.campo}</span>
                  <input
                    type="text"
                    defaultValue={c.valor}
                    className={`${campo} ${c.mono ? "font-mono text-[13.5px]" : ""}`}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-[12.5px] text-muted-foreground">Motivo del estudio</span>
              <input
                type="text"
                defaultValue={reporte.motivo}
                className={`${campo} mt-0 min-w-[220px] flex-1`}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <p className={`${kicker} text-muted-foreground`}>Hallazgos por sección</p>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              plantilla: {reporte.tipo.toLowerCase()} · {reporte.seccionesTotales} secciones
            </span>
            <button
              type="button"
              className={`ml-auto inline-flex h-10 items-center rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Cambiar plantilla
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {reporte.secciones.map((s, i) => (
              <section
                key={s.id}
                className={`overflow-hidden rounded-xl border ${
                  s.estado === "pendiente"
                    ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`flex flex-wrap items-center gap-3 border-b px-5 py-3.5 ${
                    s.estado === "pendiente"
                      ? "border-[color:var(--warning-border)]"
                      : "border-border"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      s.estado === "listo"
                        ? "bg-primary text-[color:var(--sidebar)]"
                        : s.estado === "pendiente"
                          ? "border-2 border-[color:var(--warning)] bg-card"
                          : "border-2 border-[color:var(--track)] bg-card"
                    }`}
                  >
                    {s.estado === "listo" && (
                      <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-bold leading-snug">{s.titulo}</span>
                    <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                      sección {i + 1} de la plantilla
                    </span>
                  </span>
                  {s.estado === "pendiente" && (
                    <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-card px-2.5 text-[11.5px] font-semibold text-[color:var(--warning-foreground)]">
                      Falta completar
                    </span>
                  )}
                  <button
                    type="button"
                    className={`inline-flex h-10 items-center gap-[7px] rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <Images aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Insertar imagen
                  </button>
                </div>
                <div className="p-5">
                  <textarea
                    rows={s.estado === "listo" ? 3 : 2}
                    defaultValue={s.texto}
                    placeholder="Redacte los hallazgos de esta sección."
                    className="w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
                  />
                  <div className="mt-3">
                    <Zona
                      titulo="Guía de la plantilla"
                      nota="Aquí van los campos y sugerencias de esta sección (medidas esperadas, estructura y recordatorios para no omitir nada). El contenido clínico se define aparte."
                      minAlto={78}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
          >
            <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            Ver las otras {reporte.seccionesTotales - reporte.secciones.length} secciones de la
            plantilla
          </button>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
            <textarea
              rows={3}
              placeholder="Cierre con su conclusión: qué encontró, del lado que corresponda, y qué sugiere."
              className="mt-3 w-full resize-y rounded-[10px] border border-border bg-card p-3.5 text-[15px] font-medium leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
            <div className="mt-3.5">
              <Zona
                titulo="Recomendaciones sugeridas"
                nota="Zona reservada para las recomendaciones y el seguimiento que proponga la plantilla."
                minAlto={66}
              />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Membrete y firma</p>
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Zona
                titulo="Membrete del consultorio"
                nota="Logotipo, dirección y teléfono. Se configura una vez y aparece en todos sus reportes."
                minAlto={96}
              />
              <Zona
                titulo="Firma del médico"
                nota="Nombre, cédula profesional y firma digitalizada."
                minAlto={96}
              />
            </div>
          </section>
        </div>

        {/* ══════ estación: visor, checklist y puente académico ══════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} overflow-hidden`}>
            <div
              aria-hidden
              className="relative grid h-[280px] place-items-center"
              style={{ background: "var(--wave-0)" }}
            >
              <div className="absolute inset-0" style={{ background: rayas }} />
              <span
                className={`relative ${mono} px-3 text-center text-[10px] uppercase tracking-[0.14em]`}
                style={{ color: "var(--hero-ink-muted)" }}
              >
                visor DICOM · {reporte.piezas[pieza].etiqueta}
              </span>
              <span
                className={`absolute bottom-3 left-3 ${mono} text-[9.5px] leading-[1.7]`}
                style={{ color: "var(--hero-ink-muted)" }}
              >
                <span className="block">C 3.5 MHz · Prof. 15 cm</span>
                <span className="block">4 nov, 09:12</span>
              </span>
              <span className="absolute bottom-3 right-3 flex gap-1.5">
                {["medir", "zoom"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-1 text-[9.5px] font-semibold"
                    style={{ background: "rgba(255,255,255,.14)", color: "var(--hero-ink)" }}
                  >
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <div className="border-t border-border p-3.5">
              <div className="flex gap-2 overflow-x-auto">
                {reporte.piezas.map((p, i) => (
                  <button
                    key={p.etiqueta}
                    type="button"
                    onClick={() => setPieza(i)}
                    aria-current={i === pieza}
                    className={`relative grid h-14 w-[78px] shrink-0 place-items-center overflow-hidden rounded-[9px] border-2 ${focusRing} ${
                      i === pieza ? "border-primary" : "border-transparent"
                    }`}
                    style={{ background: "var(--wave-0)" }}
                  >
                    <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                    <span
                      className={`relative ${mono} text-center text-[7px] uppercase tracking-[0.08em]`}
                      style={{ color: "var(--hero-ink-muted)" }}
                    >
                      {p.etiqueta}
                    </span>
                    {p.insertada && (
                      <span
                        aria-label="Ya está en el reporte"
                        className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4 10-10" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
                  {insertadas} de {reporte.piezas.length} imágenes ya están en el reporte.
                </p>
                <button
                  type="button"
                  className={`h-11 shrink-0 rounded-[10px] bg-accent px-3.5 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                >
                  Insertar en la sección
                </button>
              </div>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-baseline gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Antes de finalizar</p>
              <span
                className={`${mono} ml-auto text-[12px] font-bold text-[color:var(--warning-foreground)]`}
              >
                {hechos} de {reporte.checklist.length}
              </span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]"
              role="progressbar"
              aria-valuenow={hechos}
              aria-valuemin={0}
              aria-valuemax={reporte.checklist.length}
              aria-label="Avance del reporte"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(hechos / reporte.checklist.length) * 100}%`,
                  background: "var(--warning)",
                }}
              />
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {reporte.checklist.map((c) => (
                <li key={c.item} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      c.listo
                        ? "bg-primary text-[color:var(--sidebar)]"
                        : "border-2 border-[color:var(--warning)] bg-card"
                    }`}
                  >
                    {c.listo && (
                      <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-[13px] ${c.listo ? "font-medium text-muted-foreground" : "font-bold"}`}
                  >
                    {c.item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
              La estructura de la plantilla evita omisiones: mientras falte algo, el reporte sigue en
              borrador.
            </p>
          </section>

          <section className="rounded-xl bg-accent p-5">
            <p className={`${kicker} text-accent-foreground`}>Puente académico</p>
            <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
              Guarde este estudio como caso anonimizado y súmelo a su bitácora. Quitamos nombre,
              expediente y fechas del paciente.
            </p>
            <button
              type="button"
              onClick={onGuardarComoCaso}
              className={`mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border bg-card text-[13.5px] font-bold text-secondary transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
              style={{ borderColor: "color-mix(in oklab, var(--secondary) 35%, white)" }}
            >
              <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Guardar como caso
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════ LISTADO ═══════════════════════════ */

export default function ListadoReportes({ data = MOCK }: { data?: ReportesData }) {
  const { resumen, conteos, items } = data;
  const [estado, setEstado] = useState<"todos" | EstadoReporte>("todos");
  const [tipo, setTipo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNuevoReporte = () => {};
  const onAbrirReporte = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((r) => {
      if (estado !== "todos" && r.estado !== estado) return false;
      if (tipo !== "Todos" && r.tipo !== tipo) return false;
      if (!q) return true;
      return [r.folio, r.paciente, r.tipo].join(" ").toLowerCase().includes(q);
    });
  }, [items, estado, tipo, busqueda]);

  const tarjetas = [
    {
      t: "Borradores",
      n: resumen.borradores,
      m: "Termínelos antes de cerrar el día",
      clase:
        "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    },
    {
      t: "Listos para enviar",
      n: resumen.listos,
      m: "Finalizados sin enviar",
      clase: "border-transparent bg-accent text-accent-foreground",
    },
    {
      t: "Enviados esta semana",
      n: resumen.enviadosSemana,
      m: "Con acuse de correo",
      clase:
        "border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    },
    {
      t: "Reportes del mes",
      n: resumen.delMes,
      m: "Promedio 11 min cada uno",
      clase: "border-border bg-card text-[color:var(--foreground-soft)]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <button
          type="button"
          onClick={onNuevoReporte}
          className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          Nuevo reporte
        </button>
      </div>

      {/* qué me falta */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((c) => (
          <section
            key={c.t}
            className={`rounded-xl border p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${c.clase}`}
          >
            <p className={kicker}>{c.t}</p>
            <p className={`${mono} mt-2.5 text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>
              {c.n}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{c.m}</p>
          </section>
        ))}
      </div>

      {/* filtros */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Estado del reporte"
          className="flex gap-1.5 rounded-full border border-border bg-card p-1"
        >
          {(
            [
              ["todos", "Todos", conteos.todos],
              ["borrador", "Borradores", conteos.borradores],
              ["finalizado", "Finalizados", conteos.finalizados],
              ["enviado", "Enviados", conteos.enviados],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              onClick={() => setEstado(id)}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                estado === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} ${estado === id ? "opacity-70" : "text-muted-foreground"}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <label className="flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5">
          <span className="text-[12.5px] text-muted-foreground">Estudio</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
          >
            <option value="Todos">Todos</option>
            {data.plantillas.map((p) => (
              <option key={p.tipo} value={p.tipo}>
                {p.tipo}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>

        <label className="ml-auto flex h-12 min-w-[280px] items-center gap-2.5 rounded-full border border-border bg-card px-5 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar reportes</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente, folio o estudio…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* tabla */}
      <div className={`${card} mt-4 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted">
                {["Folio", "Paciente", "Estudio", "Fecha", "Estado", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={`px-4 py-3 ${kicker} text-muted-foreground ${i === 5 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => (
                <tr key={r.id} className="border-t border-border transition-colors hover:bg-accent">
                  <td className="px-4 py-3.5">
                    <span className={`${mono} block text-[12.5px] font-bold`}>{r.folio}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {r.imagenes} imágenes
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="block text-[14px] font-bold">{r.paciente}</span>
                    <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                      {r.edadSexo}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 text-[13.5px] ${softText}`}>{r.tipo}</td>
                  <td className={`${mono} px-4 py-3.5 text-[12.5px] text-muted-foreground`}>
                    {r.fecha}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[r.estado]}`}
                    >
                      {etiquetaEstado[r.estado]}
                    </span>
                    <span className="mt-1 block text-[11.5px] text-muted-foreground">{r.nota}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAbrirReporte(r.id)}
                        className={`h-10 rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                      >
                        {r.estado === "borrador" ? "Continuar" : "Abrir"}
                      </button>
                      <button
                        type="button"
                        aria-label="Más acciones"
                        className={`grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          Ver más reportes
        </button>
        <span className={`${mono} text-[12px] text-muted-foreground`}>
          {visibles.length} de {conteos.todos}
        </span>
      </div>
    </div>
  );
}

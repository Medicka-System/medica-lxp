"use client";

/**
 * Studio · Editor de caso — estación de trabajo clínica-didáctica
 *
 * Un solo editor, dos modos:
 *   · modo="subir"  → caso nuevo cargado por staff (en blanco, DICOM procesando).
 *   · modo="curar"  → caso existente (de alumno o staff) que se enriquece antes de publicar.
 *
 * La imagen es protagonista: el visor (Cornerstone3D — placeholder) toma el ancho con su barra de
 * anotación y su tira de series; la autoría vive en el panel derecho.
 *
 * "Verdad del caso" es la pieza que hace funcionar al simulador: hallazgos clave ANCLADOS a las
 * anotaciones de la imagen, puntos de aprendizaje y errores comunes. No es texto libre — la IA
 * compara la respuesta del alumno contra estos puntos.
 *
 * Publicar a Biblioteca y marcar para Simulador son acciones SEPARADAS: un caso puede servir para
 * estudiar, para entrenar, o para las dos cosas.
 *
 * Stubs: onCargarDicom · onAnotar · onGuardarBorrador · onPublicarBiblioteca · onMarcarSimulador ·
 *        onCatalogar · onArchivar
 */

import { useState } from "react";
import {
  Archive,
  BookCopy,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  GraduationCap,
  Hand,
  MonitorPlay,
  MoveUpRight,
  Plus,
  RotateCcw,
  Ruler,
  Save,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TriangleAlert,
  ZoomIn,
} from "lucide-react";
import { mono, kicker, softText, focusRing, focusRingDark } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type ModoEditor = "subir" | "curar";
export type TipoAnotacion = "hallazgo" | "medida" | "region";

export type Anotacion = {
  id: string;
  tipo: TipoAnotacion;
  etiqueta: string;
  /** posición porcentual sobre la imagen */
  x: number;
  y: number;
};

export type Serie = { id: string; nombre: string; meta: string; activa?: boolean };

export type HallazgoClave = { id: string; texto: string; anclaAnotacion?: string };

export type CasoEnEdicion = {
  id: string;
  modo: ModoEditor;
  titulo: string;
  origen: "alumno" | "staff";
  autor: string;
  estado: "banco" | "biblioteca" | "simulador" | "ambas" | "archivado";
  guardado?: string;
  dicom: {
    estado: "listo" | "procesando";
    anonimizado: boolean;
    series: Serie[];
    progreso?: number;
    imagenesListas?: number;
    imagenesTotal?: number;
    serieActual?: string;
  };
  anotaciones: Anotacion[];
  clinica: { vineta: string; hallazgos: string; diagnostico: string };
  catalogo: {
    area: string;
    organo: string;
    patologia: string;
    dominio: string;
    dificultad: string;
    etiquetas: string[];
  };
  verdad: {
    hallazgosClave: HallazgoClave[];
    puntosAprendizaje: string[];
    erroresComunes: string[];
  };
};

const MOCK: CasoEnEdicion = {
  id: "c1",
  modo: "curar",
  titulo: "Hidronefrosis grado III con adelgazamiento cortical",
  origen: "alumno",
  autor: "Dr. Iván Torres",
  estado: "banco",
  guardado: "hace 40 s",
  dicom: {
    estado: "listo",
    anonimizado: true,
    serieActual: "serie 2/4 · imagen 18/64",
    series: [
      { id: "s1", nombre: "Serie 1 · longitudinal", meta: "18 img" },
      { id: "s2", nombre: "Serie 2 · transversal", meta: "64 img", activa: true },
      { id: "s3", nombre: "Serie 3 · Doppler color", meta: "loop 4 s" },
      { id: "s4", nombre: "Serie 4 · vejiga", meta: "22 img" },
    ],
  },
  anotaciones: [
    { id: "a1", tipo: "hallazgo", etiqueta: "Cálices dilatados", x: 30, y: 26 },
    { id: "a2", tipo: "medida", etiqueta: "Cortical 7.2 mm", x: 46, y: 52 },
    { id: "a3", tipo: "hallazgo", etiqueta: "Seno ocupado", x: 22, y: 70 },
  ],
  clinica: {
    vineta:
      "Mujer de 46 años, dolor lumbar derecho de 3 días, creatinina normal. Sin antecedente urológico.",
    hallazgos:
      "Dilatación pielocalicial derecha con cálices redondeados y comunicantes. Cortical adelgazada a 7.2 mm. Jet ureteral derecho ausente en dos exploraciones.",
    diagnostico: "Hidronefrosis grado III derecha por obstrucción ureteral distal",
  },
  catalogo: {
    area: "Renal",
    organo: "Riñón",
    patologia: "Hidronefrosis · obstrucción ureteral",
    dominio: "Interpretación",
    dificultad: "Intermedio",
    etiquetas: ["#hidronefrosis", "#cortical", "#jet ureteral"],
  },
  verdad: {
    hallazgosClave: [
      { id: "h1", texto: "Dilatación pielocalicial con cálices redondeados y comunicantes", anclaAnotacion: "Cálices dilatados" },
      { id: "h2", texto: "Cortical adelgazada por debajo de 10 mm", anclaAnotacion: "Cortical 7.2 mm" },
      { id: "h3", texto: "Seno renal ocupado por líquido", anclaAnotacion: "Seno ocupado" },
    ],
    puntosAprendizaje: [
      "El grado se cierra midiendo la cortical, no solo viendo la dilatación",
      "La ausencia sostenida de jet ureteral apoya obstrucción funcional",
    ],
    erroresComunes: [
      "Subir la ganancia y reportar dilatación que no existe",
      "Confundir un quiste parapiélico con cáliz dilatado",
      "Medir la cortical solo en el polo medio",
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const campoBase =
  "mt-1.5 w-full rounded-[10px] border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground";

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function EditorCaso({ data = MOCK }: { data?: CasoEnEdicion }) {
  const { modo, titulo, origen, autor, guardado, dicom, anotaciones, clinica, catalogo, verdad } = data;
  const [herramienta, setHerramienta] = useState<"puntero" | "flecha" | "medida" | "region" | "etiqueta">(
    "flecha",
  );
  const [clinicaLocal, setClinicaLocal] = useState(clinica);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onCargarDicom = () => {};
  const onAnotar = (_tipo: TipoAnotacion) => {};
  const onGuardarBorrador = () => {};
  const onPublicarBiblioteca = () => {};
  const onMarcarSimulador = () => {};
  const onCatalogar = (_campo: string, _valor: string) => {};
  const onArchivar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const procesando = dicom.estado === "procesando";
  const listoParaSimulador =
    verdad.hallazgosClave.filter((h) => h.anclaAnotacion).length >= 3 &&
    verdad.puntosAprendizaje.length >= 2;

  const HERRAMIENTAS = [
    { id: "puntero", label: "Puntero", icono: Hand },
    { id: "flecha", label: "Flecha con etiqueta", icono: MoveUpRight },
    { id: "medida", label: "Medición", icono: Ruler },
    { id: "region", label: "Región de interés", icono: Crop },
    { id: "etiqueta", label: "Etiqueta de hallazgo", icono: Tag },
  ] as const;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ───── Header contextual del editor ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <button
          type="button"
          aria-label="Volver a Casos"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Casos</span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
          <span className="truncate text-[14.5px] font-bold text-sidebar-foreground">
            {modo === "subir" ? "Caso nuevo" : titulo}
          </span>

          {modo === "curar" ? (
            <>
              <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                Por curar
              </span>
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.12] px-2.5 text-[11.5px] font-semibold text-sidebar-foreground">
                {origen === "alumno" ? (
                  <GraduationCap aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                ) : (
                  <Building2 aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                )}
                {origen === "alumno" ? "De alumno" : "Staff"} · {autor}
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                <Building2 aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                Cargado por staff
              </span>
              <span className={`${mono} whitespace-nowrap text-[11.5px] text-white/55`}>
                borrador sin guardar
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {guardado && modo === "curar" && (
            <span className={`${mono} inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-white/60`}>
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
              guardado {guardado}
            </span>
          )}
          <button
            type="button"
            onClick={onArchivar}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Archive aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Archivar
          </button>
          <button
            type="button"
            onClick={onGuardarBorrador}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={onMarcarSimulador}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRingDark}`}
          >
            <MonitorPlay aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Marcar para Simulador
          </button>
          <button
            type="button"
            onClick={onPublicarBiblioteca}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <BookCopy aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Publicar a Biblioteca
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Visor: la imagen es protagonista ════════ */}
        <div className="flex min-w-0 flex-1 flex-col" style={{ background: "var(--wave-0, #0a2140)" }}>
          {/* barra de anotación */}
          <div className="flex h-[52px] shrink-0 items-center gap-1.5 border-b border-white/10 bg-sidebar px-3.5">
            <span className={`${kicker} mr-1.5 text-white/55`}>Anotar</span>
            {HERRAMIENTAS.map(({ id, label, icono: Icono }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={herramienta === id}
                onClick={() => {
                  setHerramienta(id);
                  if (id !== "puntero") onAnotar(id === "medida" ? "medida" : id === "region" ? "region" : "hallazgo");
                }}
                className={`grid h-10 w-10 place-items-center rounded-[9px] transition-colors ${focusRingDark} ${
                  herramienta === id
                    ? "bg-primary text-[color:var(--sidebar)]"
                    : "bg-white/[0.08] text-white/80 hover:bg-white/[0.16] hover:text-white"
                }`}
              >
                <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            ))}
            <span aria-hidden className="mx-1.5 h-6 w-px bg-white/15" />
            {[
              { label: "Zoom", icono: ZoomIn },
              { label: "Ventana y nivel", icono: Sun },
              { label: "Restablecer vista", icono: RotateCcw },
            ].map(({ label, icono: Icono }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className={`grid h-10 w-10 place-items-center rounded-[9px] bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.16] hover:text-white ${focusRingDark}`}
              >
                <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2.5">
              <span className={`${mono} text-[11.5px] text-white/60`}>
                {procesando ? "esperando el estudio" : dicom.serieActual}
              </span>
              {dicom.anonimizado && (
                <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/[0.16] px-2.5 text-[11px] font-bold text-primary">
                  <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                  Anonimizado
                </span>
              )}
            </span>
          </div>

          {/* lienzo */}
          <div className="relative grid min-h-0 flex-1 place-items-center">
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
              }}
            />
            {procesando ? (
              <div className="relative max-w-[360px] text-center">
                <span
                  aria-hidden
                  className="inline-grid h-[52px] w-[52px] place-items-center rounded-full"
                  style={{ background: "rgba(99,102,241,.2)", color: "var(--info-border)" }}
                >
                  <RotateCcw className="h-6 w-6" strokeWidth={2} />
                </span>
                <p className="mt-3.5 text-[15px] font-bold text-white">Procesando el estudio</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--hero-ink-muted)" }}>
                  Anonimizando cabeceras y generando las series. Puede ir llenando los datos clínicos
                  mientras termina.
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.14]">
                  <div
                    className="h-full rounded-full bg-[color:var(--info)]"
                    style={{ width: `${dicom.progreso ?? 0}%` }}
                  />
                </div>
                <p className={`${mono} mt-2 text-[11.5px]`} style={{ color: "var(--hero-ink-muted)" }}>
                  {dicom.imagenesListas} de {dicom.imagenesTotal} imágenes
                </p>
              </div>
            ) : (
              <>
                <span
                  aria-hidden
                  className={`${mono} relative text-[10px] uppercase tracking-[0.16em]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  riñón derecho · corte longitudinal
                </span>
                {anotaciones.map((a) => (
                  <span
                    key={a.id}
                    className="absolute flex items-center gap-1.5"
                    style={{ top: `${a.y}%`, left: `${a.x}%` }}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: a.tipo === "medida" ? "var(--info)" : "var(--primary)",
                        boxShadow: "0 0 0 3px rgba(255,255,255,.28)",
                      }}
                    />
                    <span
                      className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold text-white"
                      style={{
                        background: "rgba(15,45,82,.9)",
                        borderColor: a.tipo === "medida" ? "var(--info)" : "var(--primary)",
                      }}
                    >
                      {a.etiqueta}
                    </span>
                  </span>
                ))}
                <span
                  aria-hidden
                  className={`${mono} absolute bottom-3.5 left-3.5 flex flex-col gap-0.5 text-[10.5px] text-white/60`}
                >
                  <span>MI 0.8 · TIS 0.4</span>
                  <span>C 128 · W 255</span>
                </span>
                <span className={`${mono} absolute bottom-3.5 right-3.5 text-[10.5px] text-white/60`}>
                  Cornerstone3D
                </span>
              </>
            )}
          </div>

          {/* tira de series */}
          <div className="flex h-[98px] shrink-0 items-center gap-2.5 overflow-x-auto border-t border-white/10 bg-sidebar px-3.5">
            {dicom.series.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-[132px] shrink-0 rounded-[9px] border-[1.5px] p-1.5 text-left transition-colors ${focusRingDark} ${
                  s.activa && !procesando
                    ? "border-primary bg-primary/[0.12]"
                    : "border-white/[0.14] hover:border-white/30"
                }`}
              >
                <span
                  aria-hidden
                  className="relative block w-full overflow-hidden rounded-md"
                  style={{ aspectRatio: "16 / 10", background: "#0a2140" }}
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                    }}
                  />
                </span>
                <span
                  className={`mt-1 block truncate text-[10px] font-semibold ${
                    s.activa && !procesando ? "text-primary" : "text-white/70"
                  }`}
                >
                  {s.nombre}
                </span>
                <span className={`${mono} block text-[9.5px] text-white/50`}>{s.meta}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onCargarDicom}
              className={`grid h-[84px] w-[132px] shrink-0 place-items-center gap-1 rounded-[9px] border-[1.5px] border-dashed border-white/20 text-white/70 transition-colors hover:border-primary hover:text-primary ${focusRingDark}`}
            >
              <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
              <span className="text-[10.5px] font-semibold">Cargar DICOM</span>
            </button>
          </div>
        </div>

        {/* ════════ Panel de autoría ════════ */}
        <aside className="w-[452px] shrink-0 overflow-y-auto border-l border-border bg-card">
          {/* datos clínicos */}
          <section className="border-b border-border px-5 py-5">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Datos clínicos</p>
              {modo === "curar" ? (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Vienen del alumno
                </span>
              ) : (
                <span className="ml-auto inline-flex h-[22px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
                  3 campos por llenar
                </span>
              )}
            </div>

            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Viñeta clínica</span>
              <textarea
                rows={3}
                value={clinicaLocal.vineta}
                onChange={(e) => setClinicaLocal((c) => ({ ...c, vineta: e.target.value }))}
                placeholder="Edad, motivo de consulta y contexto — sin datos que identifiquen al paciente"
                className={`${campoBase} resize-none py-2.5 leading-relaxed`}
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Hallazgos</span>
              <textarea
                rows={4}
                value={clinicaLocal.hallazgos}
                onChange={(e) => setClinicaLocal((c) => ({ ...c, hallazgos: e.target.value }))}
                placeholder="Lo que se ve en el estudio, en orden de lectura"
                className={`${campoBase} resize-none py-2.5 leading-relaxed`}
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Diagnóstico confirmado</span>
              <textarea
                rows={2}
                value={clinicaLocal.diagnostico}
                onChange={(e) => setClinicaLocal((c) => ({ ...c, diagnostico: e.target.value }))}
                placeholder="El diagnóstico con el que se cerró el caso"
                className={`${campoBase} resize-none py-2.5 leading-relaxed`}
              />
            </label>
          </section>

          {/* catalogación */}
          <section className="border-b border-border px-5 py-5">
            <p className={`${kicker} text-muted-foreground`}>Catalogación</p>

            {(
              [
                ["Área clínica", ["Renal", "Vías urinarias", "Obstétrico", "Doppler", "MSK"], catalogo.area],
                ["Órgano", ["Riñón", "Uréter", "Vejiga"], catalogo.organo],
                [
                  "Dominio I-AIM",
                  ["Indicación", "Adquisición", "Interpretación", "Decisión"],
                  catalogo.dominio,
                ],
                ["Dificultad", ["Básico", "Intermedio", "Avanzado"], catalogo.dificultad],
              ] as const
            ).map(([label, opciones, valor]) => (
              <div key={label} className="mt-3">
                <span className="block text-[11.5px] font-semibold">{label}</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {opciones.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => onCatalogar(label, o)}
                      aria-pressed={o === valor}
                      className={`h-[34px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                        o === valor
                          ? "border-transparent bg-accent text-accent-foreground"
                          : `border-border bg-card ${softText} hover:bg-muted`
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Patología</span>
              <input type="text" defaultValue={catalogo.patologia} className={`${campoBase} h-10`} />
            </label>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {catalogo.etiquetas.map((t) => (
                <span
                  key={t}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
                >
                  <Tag aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {t}
                </span>
              ))}
              <button
                type="button"
                className={`inline-flex h-7 items-center rounded-full border border-dashed border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                + etiqueta
              </button>
            </div>
          </section>

          {/* ═══ Verdad del caso: lo que usa el simulador ═══ */}
          <section className="px-5 py-5" style={{ background: "#fbfbfd" }}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
              >
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </span>
              <p className={`${kicker} text-[color:var(--info-foreground)]`}>Verdad del caso</p>
              <span className="ml-auto inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                La usa el simulador
              </span>
            </div>
            <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
              Esto no es texto libre: el simulador compara la respuesta del alumno contra estos
              puntos. Ancle cada hallazgo clave a su anotación en la imagen.
            </p>

            <p className="mt-4 text-[11.5px] font-semibold">Hallazgos clave</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {verdad.hallazgosClave.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2.5"
                >
                  <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium leading-relaxed">{h.texto}</span>
                    {h.anclaAnotacion && (
                      <span className="mt-1.5 inline-flex h-5 items-center gap-1.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        <MoveUpRight aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                        {h.anclaAnotacion}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label="Quitar hallazgo"
                    className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[12.5px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                >
                  <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.2} />
                  Agregar
                </button>
              </li>
            </ul>

            <p className="mt-5 text-[11.5px] font-semibold">Puntos de aprendizaje</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {verdad.puntosAprendizaje.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2.5"
                >
                  <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-secondary" />
                  <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed">{p}</span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[12.5px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                >
                  <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.2} />
                  Agregar
                </button>
              </li>
            </ul>

            <p className="mt-5 text-[11.5px] font-semibold">Errores comunes a evitar</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {verdad.erroresComunes.map((e) => (
                <li
                  key={e}
                  className="flex items-start gap-2.5 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2.5"
                >
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                    strokeWidth={2}
                  />
                  <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed text-[color:var(--warning-foreground)]">
                    {e}
                  </span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--warning-border)] bg-card text-[12.5px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
                >
                  <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.2} />
                  Agregar error común
                </button>
              </li>
            </ul>

            {/* semáforo de listo para simulador */}
            <div className="mt-5 flex items-center gap-2.5 rounded-[11px] border border-border bg-card px-3.5 py-3">
              <span className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
                Listo para simulador cuando haya{" "}
                <span className="font-bold text-foreground">3 hallazgos clave</span> anclados y{" "}
                <span className="font-bold text-foreground">2 puntos de aprendizaje</span>.
              </span>
              <span
                className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                  listoParaSimulador
                    ? "bg-accent text-accent-foreground"
                    : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                }`}
              >
                {listoParaSimulador && <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />}
                {listoParaSimulador ? "Cumple" : "Falta estructura"}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

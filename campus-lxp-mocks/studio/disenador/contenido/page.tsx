"use client";

/**
 * Studio · Contenido — biblioteca de recursos reutilizables
 *
 * Es el ALMACÉN: un recurso se sube una vez y las lecciones lo REFERENCIAN (no lo copian). Por eso
 * el dato protagonista de cada tarjeta es "en cuántas lecciones vive", y reemplazar o eliminar
 * siempre declara el alcance antes de ejecutarse.
 *
 * Distinto del builder de programas (arma la estructura) y del editor de lección (la ensambla).
 * DICOM y casos clínicos NO van aquí: tienen su curaduría en el área "Casos".
 *
 * Videos → Cloudflare Stream (estado "procesando" mientras transcodifica).
 *
 * Stubs: onSubirRecurso · onAbrirRecurso · onReemplazar · onEtiquetar · onEliminar · onFiltrar · onBuscar
 */

import { useMemo, useState } from "react";
import {
  Boxes,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Link2,
  MoreHorizontal,
  Play,
  Presentation,
  SlidersHorizontal,
  Tag,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { mono, kicker, softText, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

/**
 * Tipos aceptados por la biblioteca:
 *  · video    → se transcodifica en Cloudflare Stream
 *  · h5p      → interactivo
 *  · scorm    → paquete .zip, se reproduce en player SCORM y reporta progreso
 *  · xapi     → paquete .zip exportado de Articulate (Rise/Storyline), reporta al LRS
 *  · pdf / word / ppt → documentos ofimáticos: visor embebido, sin obligar a descargar
 *  · imagen   → gráficos y esquemas
 */
export type TipoRecurso =
  | "video"
  | "h5p"
  | "scorm"
  | "xapi"
  | "pdf"
  | "word"
  | "ppt"
  | "imagen";

/** Familia de filtro: los tres formatos de oficina se filtran juntos como "Documentos". */
export type FamiliaFiltro = "todos" | "video" | "h5p" | "scorm" | "xapi" | "documentos" | "imagen";

export const ES_DOCUMENTO: TipoRecurso[] = ["pdf", "word", "ppt"];

export type Recurso = {
  id: string;
  tipo: TipoRecurso;
  /** Peso del archivo, tal como se muestra (ya formateado). */
  peso?: string;
  /** Cómo se reproduce: "Reporta progreso", "Reporta al LRS", "Visor embebido", "Cloudflare Stream". */
  reproduccion?: string;
  nombre: string;
  meta: string;
  fecha: string;
  /** lecciones que lo referencian */
  usos: number;
  programas: number;
  etiquetas: string[];
  /** video en transcodificación en Stream */
  procesando?: boolean;
  progreso?: number;
  miniatura?: string;
};

export type ContenidoData = {
  recursos: Recurso[];
  total: number;
  etiquetas: string[];
};

const MOCK: ContenidoData = {
  total: 167,
  etiquetas: ["renal", "obstétrico", "doppler", "pocus", "plantillas", "física del US"],
  recursos: [
    { id: "r1", tipo: "video", nombre: "Hidronefrosis grado I a IV con marcadores", meta: "18:40 · 1080p", peso: "248 MB", reproduccion: "Cloudflare Stream", fecha: "4 nov 2026", usos: 7, programas: 3, etiquetas: ["renal", "hidronefrosis"] },
    { id: "r2", tipo: "scorm", nombre: "Física del ultrasonido · módulo interactivo", meta: "SCORM 1.2", peso: "42 MB", reproduccion: "Reporta progreso", fecha: "6 nov 2026", usos: 4, programas: 2, etiquetas: ["física del US"] },
    { id: "r3", tipo: "xapi", nombre: "Seguridad del paciente · Rise 360", meta: "xAPI · Articulate Rise", peso: "28 MB", reproduccion: "Reporta al LRS", fecha: "5 nov 2026", usos: 3, programas: 2, etiquetas: ["plantillas"] },
    { id: "r4", tipo: "pdf", nombre: "Protocolo de barrido renal · guía rápida", meta: "PDF · 12 págs", peso: "3.4 MB", reproduccion: "Visor embebido", fecha: "4 nov 2026", usos: 9, programas: 4, etiquetas: ["renal", "protocolo"] },
    { id: "r5", tipo: "h5p", nombre: "Arrastra el grado correcto a cada imagen", meta: "8 ítems · interactivo", peso: "1.2 MB", fecha: "4 nov 2026", usos: 3, programas: 1, etiquetas: ["renal"] },
    { id: "r6", tipo: "ppt", nombre: "Ateneo renal · presentación de cierre", meta: "PPTX · 24 diapositivas", peso: "18 MB", reproduccion: "Visor embebido", fecha: "2 nov 2026", usos: 2, programas: 1, etiquetas: ["renal"] },
    { id: "r7", tipo: "word", nombre: "Formato de informe estructurado", meta: "DOCX · 4 págs", peso: "820 KB", reproduccion: "Visor embebido", fecha: "1 nov 2026", usos: 6, programas: 3, etiquetas: ["plantillas", "renal"] },
    { id: "r8", tipo: "video", nombre: "Barrido renal completo · demostración", meta: "12:05 · 1080p", peso: "164 MB", reproduccion: "Cloudflare Stream", fecha: "2 nov 2026", usos: 5, programas: 2, etiquetas: ["renal"] },
    { id: "r9", tipo: "scorm", nombre: "Doppler: principios y artefactos", meta: "SCORM 2004", peso: "56 MB", reproduccion: "Reporta progreso", fecha: "28 oct 2026", usos: 2, programas: 1, etiquetas: ["doppler"] },
    { id: "r10", tipo: "imagen", nombre: "Esquema I-AIM · cuatro dominios", meta: "PNG · 2400 × 1350", peso: "1.1 MB", fecha: "26 oct 2026", usos: 11, programas: 5, etiquetas: ["plantillas"] },
    { id: "r11", tipo: "xapi", nombre: "Interpretación renal · Storyline", meta: "xAPI · Articulate Storyline", peso: "64 MB", reproduccion: "Reporta al LRS", fecha: "24 oct 2026", usos: 0, programas: 0, etiquetas: ["renal"] },
    { id: "r12", tipo: "pdf", nombre: "Consentimiento informado · plantilla", meta: "PDF · 2 págs", peso: "640 KB", reproduccion: "Visor embebido", fecha: "21 oct 2026", usos: 0, programas: 0, etiquetas: ["plantillas"] },
    { id: "r13", tipo: "video", nombre: "Cólico renal: abordaje en urgencias", meta: "procesando en Stream", fecha: "hace 3 min", usos: 0, programas: 0, etiquetas: ["pocus"], procesando: true, progreso: 64 },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const TIPO: Record<
  TipoRecurso,
  { etiqueta: string; icono: typeof Play; chip: string; fondoOscuro: boolean; ext?: string }
> = {
  video: { etiqueta: "Video", icono: Play, chip: "bg-accent text-accent-foreground", fondoOscuro: true },
  h5p: {
    etiqueta: "H5P",
    icono: SlidersHorizontal,
    chip: "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] border border-[color:var(--info-border)]",
    fondoOscuro: true,
  },
  scorm: {
    etiqueta: "SCORM",
    icono: Layers,
    chip: "bg-sidebar text-sidebar-foreground",
    fondoOscuro: true,
    ext: ".zip",
  },
  xapi: {
    etiqueta: "xAPI",
    icono: Boxes,
    chip: "border border-sidebar bg-card text-sidebar",
    fondoOscuro: true,
    ext: ".zip",
  },
  pdf: { etiqueta: "PDF", icono: FileText, chip: `border border-border bg-muted ${softText}`, fondoOscuro: false, ext: "PDF" },
  word: {
    etiqueta: "Word · DOCX",
    icono: FileText,
    chip: `border border-border bg-muted ${softText}`,
    fondoOscuro: false,
    ext: "DOCX",
  },
  ppt: {
    etiqueta: "PowerPoint · PPTX",
    icono: Presentation,
    chip: `border border-border bg-muted ${softText}`,
    fondoOscuro: false,
    ext: "PPTX",
  },
  imagen: { etiqueta: "Imagen", icono: ImageIcon, chip: `border border-border bg-muted ${softText}`, fondoOscuro: true },
};

/** El dato protagonista: un recurso vive una vez y se referencia. */
export function ChipUso({ usos, programas }: { usos: number; programas?: number }) {
  if (usos === 0) {
    return (
      <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
        Sin usar
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
      <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
      <span className={mono}>{usos}</span>
      {usos === 1 ? "lección" : "lecciones"}
      {programas ? ` · ${programas} prog.` : ""}
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Contenido({ data = MOCK }: { data?: ContenidoData }) {
  const { recursos, total, etiquetas } = data;
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<FamiliaFiltro>("todos");
  const [tags, setTags] = useState<string[]>(["renal"]);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onSubirRecurso = () => {};
  const onAbrirRecurso = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos: Record<FamiliaFiltro, number> = useMemo(
    () => ({
      todos: total,
      video: 62,
      h5p: 24,
      scorm: 11,
      xapi: 8,
      documentos: 41,
      imagen: 21,
    }),
    [total],
  );

  const sinUsar = recursos.filter((r) => r.usos === 0 && !r.procesando).length;

  const visibles = useMemo(
    () =>
      recursos.filter(
        (r) =>
          (tipo === "todos" ||
            (tipo === "documentos" ? ES_DOCUMENTO.includes(r.tipo) : r.tipo === tipo)) &&
          (tags.length === 0 || r.etiquetas.some((t) => tags.includes(t)) || r.procesando) &&
          (!busca.trim() ||
            r.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            r.etiquetas.some((t) => t.includes(busca.trim().toLowerCase()))),
      ),
    [recursos, tipo, tags, busca],
  );

  const alternarTag = (t: string) =>
    setTags((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  /* estado vacío: la biblioteca aún no tiene nada */
  if (recursos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
        <div className="rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-14 text-center">
          <span
            aria-hidden
            className="inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <Upload className="h-[26px] w-[26px]" strokeWidth={2} />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">
            Suba el primer recurso
          </h2>
          <p className={`mx-auto mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed ${softText}`}>
            Arrastre un video, un H5P, un paquete SCORM o xAPI, un PDF, un Word, un PowerPoint o
            una imagen. Se guarda una sola vez y desde ahí lo referencia cualquier lección de
            cualquier programa.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={onSubirRecurso}
              className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
              Subir recurso
            </button>
            <button
              type="button"
              className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Ver qué tipos acepta
            </button>
          </div>
          <p className="mt-5 text-[12px] text-muted-foreground">
            Los casos clínicos con DICOM no se suben aquí: viven en{" "}
            <span className="font-bold text-foreground">Casos</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-8 pb-8 pt-6">
      <div className="flex flex-wrap items-center justify-end gap-3.5">
        <button
          type="button"
          onClick={onSubirRecurso}
          className={`ml-auto inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Subir recurso
        </button>
      </div>

      {/* tipo + búsqueda */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[300px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <span className="sr-only">Buscar recurso</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre o etiqueta…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["todos", "Todos"],
              ["video", "Videos"],
              ["h5p", "H5P"],
              ["scorm", "SCORM"],
              ["xapi", "xAPI"],
              ["documentos", "Documentos"],
              ["imagen", "Imágenes"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipo(id)}
              aria-pressed={tipo === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                tipo === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${tipo === id ? "text-white/70" : "text-muted-foreground"}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>
        {sinUsar > 0 && (
          <span className="ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 text-[12px] font-semibold text-[color:var(--warning-foreground)]">
            <TriangleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {sinUsar} sin usar
          </span>
        )}
      </div>

      {/* etiquetas */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${kicker} text-muted-foreground`}>Etiquetas</span>
        {etiquetas.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => alternarTag(t)}
              aria-pressed={on}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                on
                  ? "border-transparent bg-accent text-accent-foreground"
                  : `border-border bg-card ${softText} hover:bg-muted`
              }`}
            >
              <Tag aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
              {t}
            </button>
          );
        })}
        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {total} · orden: usados primero
        </span>
      </div>

      {/* cuadrícula */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibles.map((r) => {
          const cfg = TIPO[r.tipo];
          const Icono = cfg.icono;
          return (
            <li key={r.id}>
              <article
                className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors ${
                  r.procesando ? "border-[color:var(--info-border)]" : "border-border hover:border-primary"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onAbrirRecurso(r.id)}
                  disabled={r.procesando}
                  className={`relative grid w-full place-items-center ${focusRing}`}
                  style={{
                    aspectRatio: "16 / 9",
                    background: cfg.fondoOscuro ? "var(--sidebar)" : "var(--muted)",
                  }}
                >
                  {r.miniatura ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.miniatura} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      {cfg.fondoOscuro && (
                        <span
                          aria-hidden
                          className="absolute inset-0"
                          style={{
                            background:
                              "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)",
                          }}
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative grid place-items-center gap-1.5 ${
                          cfg.fondoOscuro
                            ? "h-[38px] w-[38px] rounded-full bg-white/[0.16] text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Icono
                          className={cfg.fondoOscuro ? "h-[18px] w-[18px]" : "h-[26px] w-[26px]"}
                          strokeWidth={r.tipo === "video" ? 1 : 1.6}
                          fill={r.tipo === "video" ? "currentColor" : "none"}
                        />
                        {!cfg.fondoOscuro && cfg.ext && (
                          <span className={`${mono} text-[10px] font-bold tracking-[0.1em] ${softText}`}>
                            {cfg.ext}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  {/* los documentos se leen dentro de la plataforma, no se descargan */}
                  {ES_DOCUMENTO.includes(r.tipo) && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-secondary">
                      <Eye aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                      Vista previa
                    </span>
                  )}
                  {cfg.fondoOscuro && cfg.ext && (
                    <span
                      className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
                      style={{ background: "rgba(15,45,82,.82)" }}
                    >
                      {cfg.ext}
                    </span>
                  )}
                  {r.procesando && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                      <span
                        className="block h-full bg-[color:var(--info)]"
                        style={{ width: `${r.progreso ?? 0}%` }}
                      />
                    </span>
                  )}
                </button>

                <div className="px-3.5 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[10.5px] font-bold ${cfg.chip}`}
                    >
                      <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                      {cfg.etiqueta}
                    </span>
                    {r.procesando && (
                      <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                        Procesando
                      </span>
                    )}
                    {/* cómo se reproduce: SCORM reporta progreso, xAPI al LRS, los documentos van en visor */}
                    {!r.procesando && r.reproduccion && (
                      <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">
                        {r.reproduccion}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Más acciones de ${r.nombre}`}
                      className={`ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                    >
                      <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                  <p
                    className="mt-2.5 text-[13.5px] font-bold leading-relaxed"
                    style={{ textWrap: "pretty" }}
                  >
                    {r.nombre}
                  </p>
                  <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                    {r.meta}
                    {r.peso ? ` · ${r.peso}` : ""} · {r.fecha}
                  </p>
                  <div className="mt-3 border-t border-border pt-3">
                    <ChipUso usos={r.usos} programas={r.programas} />
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* el punto de valor, escrito */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <span
          aria-hidden
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
        >
          <Link2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <p className={`min-w-[280px] flex-1 text-[12.5px] leading-relaxed ${softText}`}>
          Las lecciones no guardan copias: apuntan a estos recursos. Por eso cada tarjeta dice en
          cuántas se usa —y por eso reemplazar o eliminar avisa el alcance antes de hacerlo.
        </p>
        <span className="shrink-0 text-[12px] text-muted-foreground">
          Los casos clínicos con DICOM viven en{" "}
          <span className="font-bold text-foreground">Casos</span>, no aquí.
        </span>
      </div>
    </div>
  );
}

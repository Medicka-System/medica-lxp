"use client";

/**
 * Studio · Mis recursos (docente) — cajón personal de material de apoyo
 *
 * Distinto del CONTENIDO oficial del programa (que es del diseñador instruccional):
 *   · Contenido  = material curado, parte del temario, mismo para todos los grupos.
 *   · Mis recursos = material del docente, para SUS clases, sin pasar por el diseñador. Es suyo.
 *
 * Un solo color de atención: ÁMBAR, y solo para la subida en curso (lo único que puede fallar).
 *
 * Stubs: onSubirRecurso · onAbrirRecurso · onEtiquetar · onEliminar · onUsarEnClase · onFiltrar ·
 *        onBuscar · onRenombrar
 */

import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  Eye,
  FileText,
  FolderClosed,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  List,
  Lock,
  MoreHorizontal,
  Presentation,
  Search,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, softText, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoRecurso = "ppt" | "pdf" | "word" | "video" | "imagen" | "enlace";

export type Recurso = {
  id: string;
  tipo: TipoRecurso;
  nombre: string;
  meta: string;
  fecha: string;
  etiquetas: string[];
  reciente?: boolean;
  miniatura?: string;
};

export type Subida = { nombre: string; pct: number; detalle: string };

export type CarpetaRail = { etiqueta: string; conteo: number; activa?: boolean; icono?: "carpeta" | "reloj" | "papelera" };

export type GrupoRail = { titulo: string; items: CarpetaRail[] };

export type ClaseDestino = {
  titulo: string;
  grupo: string;
  alumnos: number;
  plataforma: string;
};

export type RecursosData = {
  recursos: Recurso[];
  rail: GrupoRail[];
  etiquetas: string[];
  conteosTipo: { etiqueta: string; tipo: TipoRecurso | "todos"; conteo: number }[];
  espacio: { archivos: number; usado: string };
  subida?: Subida;
  proximaClase: ClaseDestino;
};

const MOCK: RecursosData = {
  espacio: { archivos: 24, usado: "312 MB" },
  subida: { nombre: "Casos renales · sesión presencial.pptx", pct: 68, detalle: "12.4 de 18 MB" },
  proximaClase: {
    titulo: "Clase del jueves · 19:00",
    grupo: "Grupo B · Nov 2026",
    alumnos: 28,
    plataforma: "Zoom",
  },
  conteosTipo: [
    { etiqueta: "Todos", tipo: "todos", conteo: 24 },
    { etiqueta: "PowerPoint", tipo: "ppt", conteo: 7 },
    { etiqueta: "PDF", tipo: "pdf", conteo: 6 },
    { etiqueta: "Video", tipo: "video", conteo: 4 },
    { etiqueta: "Imágenes", tipo: "imagen", conteo: 4 },
    { etiqueta: "Enlaces", tipo: "enlace", conteo: 3 },
  ],
  rail: [
    {
      titulo: "Mi cajón",
      items: [
        { etiqueta: "Todo mi material", conteo: 24, activa: true, icono: "carpeta" },
        { etiqueta: "Subidos esta semana", conteo: 3, icono: "reloj" },
        { etiqueta: "Papelera", conteo: 2, icono: "papelera" },
      ],
    },
    {
      titulo: "Por grupo",
      items: [
        { etiqueta: "Grupo B · Nov 2026", conteo: 9 },
        { etiqueta: "Grupo A · Sep 2026", conteo: 6 },
        { etiqueta: "Grupo POCUS · Oct 2026", conteo: 4 },
        { etiqueta: "Sin grupo", conteo: 5 },
      ],
    },
    {
      titulo: "Por tema",
      items: [
        { etiqueta: "M04 · Renal", conteo: 8 },
        { etiqueta: "M03 · Hígado", conteo: 4 },
        { etiqueta: "M08 · Doppler", conteo: 3 },
        { etiqueta: "Referencias", conteo: 5 },
      ],
    },
  ],
  etiquetas: ["Grupo B", "M04", "referencia", "clase en vivo", "presencial"],
  recursos: [
    { id: "r1", tipo: "ppt", nombre: "Hidronefrosis · casos difíciles (clase jueves)", meta: "4.2 MB · 18 diapositivas", fecha: "hoy", etiquetas: ["Grupo B", "M04"], reciente: true },
    { id: "r2", tipo: "video", nombre: "Barrido renal paso a paso (grabé en el equipo)", meta: "86 MB · 6:20", fecha: "ayer", etiquetas: ["M04"] },
    { id: "r3", tipo: "pdf", nombre: "Tabla de gradación de hidronefrosis", meta: "380 KB · 2 páginas", fecha: "hace 3 días", etiquetas: ["M04", "referencia"] },
    { id: "r4", tipo: "imagen", nombre: "Comparativa cortical normal vs adelgazada", meta: "1.1 MB · 2048×1152", fecha: "hace 4 días", etiquetas: ["M04"] },
    { id: "r5", tipo: "ppt", nombre: "Doppler renal: cuándo sí aporta", meta: "6.8 MB · 24 diapositivas", fecha: "hace 1 semana", etiquetas: ["Grupo A", "M08"] },
    { id: "r6", tipo: "enlace", nombre: "Guía AIUM de exploración renal", meta: "aium.org · referencia externa", fecha: "hace 1 semana", etiquetas: ["referencia"] },
    { id: "r7", tipo: "word", nombre: "Guion de la sesión presencial POCUS", meta: "48 KB · 3 páginas", fecha: "hace 2 semanas", etiquetas: ["Grupo POCUS"] },
    { id: "r8", tipo: "pdf", nombre: "Checklist de informe estructurado", meta: "210 KB · 1 página", fecha: "hace 3 semanas", etiquetas: ["M03", "referencia"] },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


/** cada formato se reconoce por su ícono antes que por el nombre */
const TIPO: Record<
  TipoRecurso,
  { etiqueta: string; icono: typeof Presentation; fondo: string; tinta: string; oscuro?: boolean }
> = {
  ppt: { etiqueta: "PowerPoint", icono: Presentation, fondo: "#fff4ed", tinta: "#9a3412" },
  pdf: { etiqueta: "PDF", icono: FileText, fondo: "#fef2f2", tinta: "#9f1239" },
  word: { etiqueta: "Word", icono: FileText, fondo: "#eff6ff", tinta: "#1d4ed8" },
  video: { etiqueta: "Video", icono: Video, fondo: "var(--sidebar)", tinta: "var(--hero-ink-muted)", oscuro: true },
  imagen: { etiqueta: "Imagen", icono: ImageIcon, fondo: "var(--sidebar)", tinta: "var(--hero-ink-muted)", oscuro: true },
  enlace: { etiqueta: "Enlace", icono: Link2, fondo: "#F8F9FA", tinta: "#374151" },
};

const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)";

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function MisRecursos({ data = MOCK }: { data?: RecursosData }) {
  const { recursos, rail, etiquetas, conteosTipo, espacio, subida, proximaClase } = data;
  const [tipo, setTipo] = useState<TipoRecurso | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [galeria, setGaleria] = useState(true);
  const [usando, setUsando] = useState<Recurso | null>(null);
  const [destino, setDestino] = useState<"clase" | "grupo" | "enlace">("clase");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onSubirRecurso = () => {};
  const onAbrirRecurso = (_id: string) => {};
  const onEtiquetar = (_id: string, _t: string) => {};
  const onRenombrar = (_id: string) => {};
  const onEliminar = (_id: string) => {};
  const onUsarEnClase = (_id: string, _destino: string) => setUsando(null);
  const onFiltrar = (_f: string) => {};
  const onBuscar = (q: string) => setBusca(q);
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return recursos.filter(
      (r) =>
        (tipo === "todos" || r.tipo === tipo) &&
        (!q || r.nombre.toLowerCase().includes(q) || r.etiquetas.some((e) => e.toLowerCase().includes(q))),
    );
  }, [recursos, tipo, busca]);

  /* ─────────── Cajón vacío ─────────── */
  if (recursos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-7 pt-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mis recursos</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            Su material de apoyo. Es suyo: no pasa por el diseñador ni entra al programa oficial.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-12 text-center">
          <span
            aria-hidden
            className="inline-grid h-[58px] w-[58px] place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <FolderClosed className="h-[27px] w-[27px]" strokeWidth={1.6} />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">Su cajón está vacío</h2>
          <p className={`mx-auto mt-2.5 max-w-[56ch] text-[13.5px] leading-relaxed ${softText}`}>
            Suba el material con el que ya da clase —sus diapositivas, un video que grabó en el equipo,
            una guía en PDF— y téngalo a mano para adjuntarlo a una sesión o compartirlo con sus grupos.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={onSubirRecurso}
              className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
              Subir mi primer recurso
            </button>
            <button
              type="button"
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Link2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Guardar un enlace
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(Object.keys(TIPO) as TipoRecurso[]).map((k) => {
              const cfg = TIPO[k];
              const Icono = cfg.icono;
              return (
                <span
                  key={k}
                  className={`inline-flex h-[30px] items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}
                >
                  <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {cfg.etiqueta}
                </span>
              );
            })}
          </div>
          <p className="mt-5 text-[12px] text-muted-foreground">
            Hasta 500 MB por archivo. Su material es privado: solo usted y los grupos con los que lo
            comparta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-7 pt-5">
      {/* ══════════ Rail: organiza como piensa el docente ══════════ */}
      <aside className="w-[236px] shrink-0 self-start rounded-[14px] border border-border bg-card px-3.5 pb-3.5 pt-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        {rail.map((g) => (
          <div key={g.titulo} className="border-b border-border py-3.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {g.titulo}
            </p>
            {g.items.map((it) => (
              <button
                key={it.etiqueta}
                type="button"
                onClick={() => onFiltrar(it.etiqueta)}
                aria-pressed={!!it.activa}
                className={`flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors ${focusRing} ${
                  it.activa ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                {it.icono === "carpeta" && (
                  <FolderClosed
                    aria-hidden
                    className={`h-3.5 w-3.5 shrink-0 ${it.activa ? "text-accent-foreground" : "text-muted-foreground"}`}
                    strokeWidth={1.75}
                  />
                )}
                {it.icono === "reloj" && (
                  <Clock aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                )}
                {it.icono === "papelera" && (
                  <Trash2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                )}
                <span
                  className={`min-w-0 flex-1 truncate text-[12.5px] ${
                    it.activa ? "font-bold text-accent-foreground" : `font-medium ${softText}`
                  }`}
                >
                  {it.etiqueta}
                </span>
                <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>
                  {it.conteo}
                </span>
              </button>
            ))}
          </div>
        ))}

        <div className="pt-3.5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Etiquetas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onFiltrar(t)}
                className={`h-7 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className={`h-7 rounded-full border border-dashed border-border bg-card px-2.5 text-[11px] font-semibold text-secondary ${focusRing}`}
            >
              + etiqueta
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════ Biblioteca ══════════ */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mis recursos</h1>
            <p className={`mt-1 text-[12.5px] ${softText}`}>
              Su material de apoyo. Es suyo: no pasa por el diseñador ni entra al programa oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={onSubirRecurso}
            className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
            Subir recurso
          </button>
        </div>

        {/* buscar · filtrar por tipo · vista */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <label className="flex h-10 w-[280px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar en mi material</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => onBuscar(e.target.value)}
              placeholder="Buscar en mi material…"
              className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {conteosTipo.map((c) => (
              <button
                key={c.etiqueta}
                type="button"
                onClick={() => setTipo(c.tipo)}
                aria-pressed={tipo === c.tipo}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                  tipo === c.tipo
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c.etiqueta}
                <span
                  className={`${mono} font-bold ${tipo === c.tipo ? "text-white/70" : "text-muted-foreground"}`}
                >
                  {c.conteo}
                </span>
              </button>
            ))}
          </div>

          <span className="ml-auto flex gap-0.5 rounded-[9px] border border-border bg-card p-[3px]">
            {(
              [
                [true, "Ver en galería", LayoutGrid],
                [false, "Ver en lista", List],
              ] as const
            ).map(([esGaleria, label, Icono]) => (
              <button
                key={label}
                type="button"
                onClick={() => setGaleria(esGaleria)}
                aria-pressed={galeria === esGaleria}
                aria-label={label}
                className={`grid h-8 w-8 place-items-center rounded-[7px] transition-colors ${focusRing} ${
                  galeria === esGaleria
                    ? "bg-sidebar text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            ))}
          </span>
        </div>

        {/* subida en curso: el único ámbar de la pantalla */}
        {subida && (
          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-card text-[color:var(--warning-foreground)]"
            >
              <Upload className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-[color:var(--warning-foreground)]">
                Subiendo “{subida.nombre}”
              </p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--warning-border)]"
                  role="progressbar"
                  aria-valuenow={subida.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Avance de la subida"
                >
                  <div
                    className="h-full rounded-full bg-[color:var(--warning)]"
                    style={{ width: `${subida.pct}%` }}
                  />
                </div>
                <span className={`${mono} shrink-0 text-[11px] font-bold text-[color:var(--warning-foreground)]`}>
                  {subida.pct}% · {subida.detalle}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2.5">
          <span className={`text-[12.5px] ${softText}`}>
            <span className="font-bold text-foreground">{espacio.archivos} recursos</span> ·{" "}
            {espacio.usado} de su espacio
          </span>
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            orden: los más recientes
          </span>
        </div>

        {/* galería */}
        <ul className="mt-3 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((r) => {
            const cfg = TIPO[r.tipo];
            const Icono = cfg.icono;
            return (
              <li key={r.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary">
                  <button
                    type="button"
                    onClick={() => onAbrirRecurso(r.id)}
                    className={`relative grid w-full place-items-center ${focusRing}`}
                    style={{ aspectRatio: "16 / 10", background: cfg.fondo }}
                  >
                    {r.miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.miniatura} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        {cfg.oscuro && (
                          <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                        )}
                        <Icono
                          aria-hidden
                          className="relative h-[30px] w-[30px]"
                          strokeWidth={1.6}
                          style={{ color: cfg.tinta }}
                        />
                      </>
                    )}
                    <span
                      className="absolute left-2 top-2 inline-flex h-[21px] items-center rounded-full border border-border bg-card px-2 text-[10px] font-bold"
                      style={{ color: cfg.oscuro ? "var(--secondary)" : cfg.tinta }}
                    >
                      {cfg.etiqueta}
                    </span>
                    {r.reciente && (
                      <span className="absolute right-2 top-2 inline-flex h-[21px] items-center rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">
                        Nuevo
                      </span>
                    )}
                  </button>

                  <div className="flex flex-1 flex-col px-3.5 py-3">
                    <p className="text-[13px] font-bold leading-relaxed" style={{ textWrap: "pretty" }}>
                      {r.nombre}
                    </p>
                    <p className={`${mono} mt-1.5 text-[10.5px] text-muted-foreground`}>
                      {r.meta} · {r.fecha}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {r.etiquetas.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onEtiquetar(r.id, t)}
                          className={`inline-flex h-5 items-center whitespace-nowrap rounded-full border border-border bg-muted px-[7px] text-[10px] font-semibold ${softText} ${focusRing}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* usar en clase es la acción primaria, no un menú escondido */}
                    <div className="mt-auto flex items-center gap-1.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setUsando(r)}
                        className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] bg-accent text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                      >
                        <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Usar en clase
                      </button>
                      <button
                        type="button"
                        onClick={() => onAbrirRecurso(r.id)}
                        aria-label={`Previsualizar ${r.nombre}`}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                      >
                        <Eye aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRenombrar(r.id)}
                        aria-label={`Más acciones de ${r.nombre}`}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {visibles.length === 0 && (
          <div className="mt-4 rounded-xl border border-border bg-card px-6 py-10 text-center">
            <p className="text-[14px] font-bold">Nada con ese filtro</p>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              Pruebe con “Todos” o suba el material que le falta.
            </p>
          </div>
        )}
      </div>

      {/* ══════════ Usar en clase / compartir ══════════ */}
      {usando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Usar ${usando.nombre}`}
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center gap-3 px-6 pb-4 pt-5">
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px]"
                style={{ background: TIPO[usando.tipo].fondo, color: TIPO[usando.tipo].tinta }}
              >
                {(() => {
                  const I = TIPO[usando.tipo].icono;
                  return <I className="h-5 w-5" strokeWidth={1.6} />;
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-secondary">
                  Usar este recurso
                </p>
                <p className="mt-1 text-[16px] font-bold leading-snug">{usando.nombre}</p>
                <p className={`${mono} mt-0.5 text-[11.5px] text-muted-foreground`}>
                  {TIPO[usando.tipo].etiqueta} · {usando.meta}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUsando(null)}
                aria-label="Cerrar"
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
              >
                <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>

            {/* tres intenciones reales, no una sola */}
            <div className="flex flex-col gap-2.5 px-6">
              {(
                [
                  ["clase", Video, "Adjuntarlo a una clase en vivo", `${proximaClase.grupo} · ${proximaClase.titulo.replace("Clase del ", "")}. Los alumnos lo ven al entrar a la sesión.`],
                  ["grupo", Users, "Compartirlo con un grupo", "Queda en el material de apoyo del grupo, sin tocar el temario oficial."],
                  ["enlace", Link2, "Solo copiar el enlace", "Para pegarlo en una consulta o mandarlo por fuera. Nadie más lo ve."],
                ] as const
              ).map(([id, Icono, titulo, sub]) => {
                const on = destino === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDestino(id)}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${focusRing} ${
                      on ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] ${
                        on ? "bg-primary text-[color:var(--sidebar)]" : `bg-muted ${softText}`
                      }`}
                    >
                      <Icono className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold leading-snug">{titulo}</span>
                      <span className={`mt-1 block text-[12px] leading-relaxed ${softText}`}>{sub}</span>
                    </span>
                    {on && (
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* la sesión concreta ya resuelta: no lo hacemos buscar */}
            {destino === "clase" && (
              <div className="mx-6 mt-4 rounded-xl border border-border bg-muted p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Se adjuntará a
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-sidebar text-sidebar-foreground"
                  >
                    <Video className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{proximaClase.titulo}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {proximaClase.grupo} · {proximaClase.alumnos} alumnos · {proximaClase.plataforma}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`h-[34px] shrink-0 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary ${focusRing}`}
                  >
                    Cambiar clase
                  </button>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-border pt-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--secondary)]"
                  />
                  <span className={`text-[12.5px] leading-relaxed ${softText}`}>
                    Dejarlo descargable después de la clase
                  </span>
                </label>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
              <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                <Lock aria-hidden className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                Su material sigue siendo suyo: no entra al programa ni lo ve otro docente.
              </span>
              <button
                type="button"
                onClick={() => setUsando(null)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onUsarEnClase(usando.id, destino)}
                className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                {destino === "clase"
                  ? "Adjuntar a la clase"
                  : destino === "grupo"
                    ? "Compartir con el grupo"
                    : "Copiar el enlace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Mi bitácora · expediente de práctica — Campus Virtual · Médica Capacitación (LXP)
 *
 * Registro PRIVADO de los casos reales del alumno. Materia prima del sistema: de aquí se curan
 * los casos que pasan al Ateneo y a la Biblioteca. También es donde se ve el avance de horas.
 *
 * Jerarquía: el "cómo voy" primero (horas acreditadas + desglose I-AIM y por módulo), luego los
 * casos con su estado de validación. La subida es una HOJA CORTA (SheetSubirCaso), no una sección:
 * hereda módulo, órgano, dominio, fecha y horas; el alumno solo aporta imágenes y hallazgos.
 *
 * Un solo color de atención por estado: ámbar = en revisión, teal = acreditado,
 * destructive = requiere cambios (único uso de rojo).
 *
 * Stubs: onSubirCaso · onAbrirCaso · onFiltrar
 */

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  NotebookText,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoCaso = "pendiente" | "aprobado" | "rechazado";
export type DominioIAIM = "Indicación" | "Adquisición" | "Interpretación" | "Decisión";

export type CasoBitacora = {
  id: string;
  folio: string;
  hallazgoCorto: string;
  modulo: string;
  organo: string;
  dominio: DominioIAIM;
  fecha: string;
  estado: EstadoCaso;
  portada: string;
  piezas: number;
  cineLoop?: boolean;
  horas: number;
};

export type BitacoraData = {
  horas: { acreditadas: number; meta: number; proyeccion: string };
  casos: { total: number; aprobados: number; pendientes: number; rechazados: number };
  porDominio: { dominio: DominioIAIM; casos: number; pct: number; enRepaso?: boolean }[];
  porModulo: { modulo: string; organo: string; casos: number }[];
  modulos: string[];
  items: CasoBitacora[];
};

const MOCK: BitacoraData = {
  horas: { acreditadas: 248, meta: 1000, proyeccion: "junio de 2027" },
  casos: { total: 42, aprobados: 34, pendientes: 6, rechazados: 2 },
  porDominio: [
    { dominio: "Indicación", casos: 12, pct: 82 },
    { dominio: "Adquisición", casos: 9, pct: 54, enRepaso: true },
    { dominio: "Interpretación", casos: 14, pct: 71 },
    { dominio: "Decisión", casos: 7, pct: 63 },
  ],
  porModulo: [
    { modulo: "M4 · Renal", organo: "Riñón y vía urinaria", casos: 14 },
    { modulo: "M3 · Hígado y vía biliar", organo: "Vesícula e hígado", casos: 11 },
    { modulo: "M2 · Abdomen", organo: "Intestino y apéndice", casos: 9 },
    { modulo: "M5 · Obstétrico", organo: "Útero y anexos", casos: 6 },
    { modulo: "M1 · Fundamentos", organo: "Modo B y ajustes", casos: 2 },
  ],
  modulos: [
    "M1 · Fundamentos",
    "M2 · Abdomen",
    "M3 · Hígado y vía biliar",
    "M4 · Interpretación renal",
    "M5 · Obstétrico",
  ],
  items: [
    {
      id: "b042",
      folio: "042",
      hallazgoCorto: "Hidronefrosis derecha con jet ureteral ausente",
      modulo: "M4 · Renal",
      organo: "Riñón",
      dominio: "Interpretación",
      fecha: "4 nov",
      estado: "pendiente",
      portada: "riñón derecho · longitudinal",
      piezas: 6,
      cineLoop: true,
      horas: 4,
    },
    {
      id: "b041",
      folio: "041",
      hallazgoCorto: "Vesícula con pared de 5 mm y lito impactado",
      modulo: "M3 · Hígado y vía biliar",
      organo: "Vesícula",
      dominio: "Interpretación",
      fecha: "2 nov",
      estado: "aprobado",
      portada: "vesícula · transversal",
      piezas: 4,
      horas: 4,
    },
    {
      id: "b040",
      folio: "040",
      hallazgoCorto: "Apéndice no compresible de 8 mm",
      modulo: "M2 · Abdomen",
      organo: "Apéndice",
      dominio: "Indicación",
      fecha: "28 oct",
      estado: "aprobado",
      portada: "fosa iliaca derecha",
      piezas: 5,
      cineLoop: true,
      horas: 4,
    },
    {
      id: "b039",
      folio: "039",
      hallazgoCorto: "Quiste simple cortical en riñón izquierdo",
      modulo: "M4 · Renal",
      organo: "Riñón",
      dominio: "Interpretación",
      fecha: "25 oct",
      estado: "rechazado",
      portada: "riñón izquierdo · transversal",
      piezas: 3,
      horas: 4,
    },
    {
      id: "b038",
      folio: "038",
      hallazgoCorto: "Biometría fetal de 22 SDG completa",
      modulo: "M5 · Obstétrico",
      organo: "Útero",
      dominio: "Adquisición",
      fecha: "21 oct",
      estado: "aprobado",
      portada: "fémur · biometría",
      piezas: 8,
      cineLoop: true,
      horas: 6,
    },
    {
      id: "b037",
      folio: "037",
      hallazgoCorto: "Esteatosis hepática grado II",
      modulo: "M3 · Hígado y vía biliar",
      organo: "Hígado",
      dominio: "Interpretación",
      fecha: "18 oct",
      estado: "aprobado",
      portada: "lóbulo hepático derecho",
      piezas: 4,
      horas: 4,
    },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

const etiquetaEstado: Record<EstadoCaso, string> = {
  pendiente: "En revisión",
  aprobado: "Acreditado",
  rechazado: "Requiere cambios",
};
const claseEstado: Record<EstadoCaso, string> = {
  pendiente:
    "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  aprobado: "bg-accent text-accent-foreground",
  rechazado:
    "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
};

function Portada({
  etiqueta,
  alto,
  loop,
  piezas,
}: {
  etiqueta: string;
  alto: number;
  loop?: boolean;
  piezas?: number;
}) {
  return (
    <div
      aria-hidden
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ height: alto, background: "var(--wave-0)" }}
    >
      <div className="absolute inset-0" style={{ background: rayas }} />
      <span
        className={`relative ${mono} px-3 text-center text-[9.5px] uppercase tracking-[0.14em]`}
        style={{ color: "var(--hero-ink-muted)" }}
      >
        {etiqueta}
      </span>
      {loop && (
        <span
          className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
        >
          loop
        </span>
      )}
      {piezas !== undefined && (
        <span
          className={`absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
        >
          {piezas} piezas
        </span>
      )}
    </div>
  );
}

/* ─────────────────── Hoja corta de subida ─────────────────── */

export function SheetSubirCaso({
  modulos,
  contexto,
  onCerrar,
  onSubirCaso,
}: {
  modulos: string[];
  /** Cuando se abre DESDE un módulo, el contexto llega heredado y no se pide nada de catálogo. */
  contexto?: { modulo: string; leccion: string; organo: string; dominio: DominioIAIM; horas: number };
  onCerrar: () => void;
  onSubirCaso: (datos: { modulo: string; hallazgos: string; presuntivo: string }) => void;
}) {
  const [modulo, setModulo] = useState(contexto?.modulo ?? modulos[3]);
  const [hallazgos, setHallazgos] = useState("");
  const [presuntivo, setPresuntivo] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subir caso"
      className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-10"
      style={{ background: "rgba(15,45,82,.42)" }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-[18px] font-extrabold tracking-[-0.015em]">Subir caso</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {contexto
                ? "Contexto heredado del módulo donde está"
                : "Elija el módulo y suba lo mínimo"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            <X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6 sm:max-h-[560px]">
          {contexto ? (
            <div className="flex items-start gap-3 rounded-[12px] bg-accent p-4">
              <span
                aria-hidden
                className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold leading-snug">
                  {contexto.modulo} — {contexto.leccion}
                </p>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  {contexto.organo} · I-AIM {contexto.dominio} · {contexto.horas} h al acreditarse.
                  Lo tomamos del módulo; no tiene que capturarlo.
                </p>
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Módulo del caso</span>
              <span className="mt-[7px] flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 focus-within:border-secondary">
                <select
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                  className="w-full appearance-none bg-transparent text-[14px] font-medium text-foreground outline-none"
                >
                  {modulos.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              </span>
              <span className="mt-[7px] block text-[12px] leading-relaxed text-muted-foreground">
                Al elegirlo heredamos órgano, dominio I-AIM y horas. Si sube desde un módulo, ya
                viene puesto.
              </span>
            </label>
          )}

          <div className="mt-5">
            <span className="block text-[11.5px] font-semibold">Imágenes o cine-loop</span>
            <div className="mt-3.5 rounded-[12px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-6 text-center">
              <span
                aria-hidden
                className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-full bg-card text-secondary"
              >
                <Upload className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-[14px] font-bold">Arrastre sus imágenes o el cine-loop</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                DICOM, JPG o MP4 · sin datos del paciente
              </p>
              <button
                type="button"
                className={`mt-3.5 h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                Elegir archivos
              </button>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="block text-[11.5px] font-semibold">Hallazgos</span>
            <textarea
              rows={4}
              value={hallazgos}
              onChange={(e) => setHallazgos(e.target.value)}
              placeholder="Describa lo que vio: medidas, planos y lo que le hizo dudar."
              className="mt-[7px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
          </label>

          <label className="mt-4 block">
            <span className="block text-[11.5px] font-semibold">
              Diagnóstico presuntivo{" "}
              <span className="font-medium text-muted-foreground">· opcional</span>
            </span>
            <input
              type="text"
              value={presuntivo}
              onChange={(e) => setPresuntivo(e.target.value)}
              placeholder="Su impresión, aunque no esté seguro"
              className="mt-[7px] h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted-foreground">
            Se acredita cuando su docente lo valide.
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className={`h-11 shrink-0 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubirCaso({ modulo, hallazgos, presuntivo })}
            className={`h-12 shrink-0 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Subir caso
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function MiBitacora({ data = MOCK }: { data?: BitacoraData }) {
  const { horas, casos, porDominio, porModulo, modulos, items } = data;

  const [estado, setEstado] = useState<"todos" | EstadoCaso>("todos");
  const [modulo, setModulo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [sheet, setSheet] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirCaso = (_id: string) => {};
  const onSubirCaso = (_datos: { modulo: string; hallazgos: string; presuntivo: string }) =>
    setSheet(false);
  const onFiltrar = (e: "todos" | EstadoCaso) => setEstado(e);
  /* ──────────────────────────────────────────────────────── */

  const pct = Math.round((horas.acreditadas / horas.meta) * 1000) / 10;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((c) => {
      if (estado !== "todos" && c.estado !== estado) return false;
      if (modulo !== "Todos" && !c.modulo.startsWith(modulo.slice(0, 2))) return false;
      if (!q) return true;
      return [c.hallazgoCorto, c.modulo, c.organo, c.dominio].join(" ").toLowerCase().includes(q);
    });
  }, [items, estado, modulo, busqueda]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera ───── */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          Subir caso
        </button>
      </div>

      {/* ───── Avance: el "cómo voy" manda ───── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">
        <section
          className="relative overflow-hidden rounded-2xl p-7"
          style={{ background: "var(--secondary)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 150% at 88% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)",
            }}
          />
          <svg
            aria-hidden
            viewBox="0 0 600 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full"
          >
            <path d="M0 62c96-34 168 26 264 10s168-52 336-16v64H0z" fill="rgba(255,255,255,.08)" />
            <path d="M0 84c120-28 192 18 300 6s180-38 300-12v42H0z" fill="rgba(255,255,255,.10)" />
          </svg>
          <div className="relative">
            <p className={`${kicker}`} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
              Avance del diplomado
            </p>
            <div className="mt-3.5 flex items-end gap-2.5">
              <span
                className={`${mono} text-[46px] font-extrabold leading-none tracking-[-0.03em]`}
                style={{ color: "var(--hero-ink)" }}
              >
                {horas.acreditadas}
              </span>
              <span
                className={`${mono} pb-1.5 text-[15px] font-semibold`}
                style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
              >
                / {horas.meta} h acreditadas
              </span>
            </div>
            <div
              className="mt-5 h-2.5 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,.22)" }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Horas acreditadas del diplomado"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: "var(--hero-ink)" }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-[13.5px]" style={{ color: "var(--hero-ink-soft, #eafaf9)" }}>
                Le faltan{" "}
                <span className={`${mono} font-bold`} style={{ color: "var(--hero-ink)" }}>
                  {horas.meta - horas.acreditadas} h
                </span>{" "}
                · a su ritmo, {horas.proyeccion}
              </span>
              <span
                className={`${mono} ml-auto text-[12.5px]`}
                style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
              >
                {casos.total} casos subidos · {casos.aprobados} acreditados
              </span>
            </div>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Casos por dominio I-AIM</p>
          <ul className="mt-4 flex flex-col gap-3.5">
            {porDominio.map((d) => (
              <li key={d.dominio}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold">{d.dominio}</span>
                  <span
                    className={`${mono} ml-auto text-[12px] font-bold ${
                      d.enRepaso ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {d.casos} casos
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.pct}%`,
                      background: d.enRepaso ? "var(--warning)" : "var(--primary)",
                    }}
                  />
                </div>
                {d.enRepaso && (
                  <p className="mt-1 text-[11.5px] text-[color:var(--warning-foreground)]">
                    Su docente sugiere más práctica aquí
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Por módulo y órgano</p>
          <ul className="mt-3.5 flex flex-col">
            {porModulo.map((m) => (
              <li key={m.modulo} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug">{m.modulo}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    {m.organo}
                  </span>
                </span>
                <span className={`${mono} text-[13px] font-bold text-secondary`}>{m.casos}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ───── Filtros por estado de validación ───── */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Estado de validación"
          className="flex gap-1.5 rounded-full border border-border bg-card p-1"
        >
          {(
            [
              ["todos", "Todos", casos.total],
              ["pendiente", "En revisión", casos.pendientes],
              ["aprobado", "Acreditados", casos.aprobados],
              ["rechazado", "Requieren cambios", casos.rechazados],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              onClick={() => onFiltrar(id)}
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
          <span className="text-[12.5px] text-muted-foreground">Módulo</span>
          <select
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
          >
            <option value="Todos">Todos</option>
            {modulos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>

        <label className="ml-auto flex h-12 min-w-[260px] items-center gap-2.5 rounded-full border border-border bg-card px-5 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar en mis hallazgos</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en mis hallazgos…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* ───── Casos ───── */}
      {visibles.length === 0 ? (
        <div className={`${card} mt-5 px-10 py-16 text-center`}>
          <span
            aria-hidden
            className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <NotebookText className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 text-[22px] font-bold leading-snug">
            {items.length === 0
              ? "Su bitácora empieza con el primer caso"
              : "Ningún caso con ese estado"}
          </h2>
          <p className={`mx-auto mt-2.5 max-w-[54ch] text-[14.5px] leading-relaxed ${softText}`}>
            Suba las imágenes de un estudio que ya hizo y escriba sus hallazgos. Su docente lo revisa
            y, al acreditarlo, suma horas al diplomado.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
              Subir mi primer caso
            </button>
            <button
              type="button"
              className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Ver un caso de ejemplo
            </button>
          </div>
          <p className="mx-auto mt-6 max-w-[48ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Nunca suba nombres, folios ni fechas de nacimiento: la bitácora es privada, pero los
            casos van anonimizados.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c) => (
              <li
                key={c.id}
                className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
                  c.estado === "rechazado"
                    ? "border-[color:var(--destructive-border)]"
                    : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onAbrirCaso(c.id)}
                  className={`block w-full text-left ${focusRing}`}
                >
                  <Portada
                    etiqueta={c.portada}
                    alto={156}
                    loop={c.cineLoop}
                    piezas={c.piezas}
                  />
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[c.estado]}`}
                      >
                        {etiquetaEstado[c.estado]}
                      </span>
                      <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
                        {c.fecha}
                      </span>
                    </div>
                    <h3
                      className="mt-3 text-[15px] font-bold leading-snug"
                      style={{ textWrap: "pretty" }}
                    >
                      {c.hallazgoCorto}
                    </h3>
                    <p className={`mt-2 text-[12.5px] leading-snug ${softText}`}>
                      {c.modulo} · {c.organo}
                    </p>
                    <p className={`${mono} mt-1.5 text-[11.5px] text-muted-foreground`}>
                      I-AIM · {c.dominio}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Ver más casos
            </button>
            <span className={`${mono} text-[12px] text-muted-foreground`}>
              {visibles.length} de {casos.total}
            </span>
          </div>
        </>
      )}

      {/* móvil: subir siempre a mano */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className={`fixed bottom-24 right-4 z-20 inline-flex h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] shadow-lg lg:hidden ${focusRing}`}
      >
        <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
        Subir caso
      </button>

      {sheet && (
        <SheetSubirCaso
          modulos={modulos}
          onCerrar={() => setSheet(false)}
          onSubirCaso={onSubirCaso}
        />
      )}
    </div>
  );
}

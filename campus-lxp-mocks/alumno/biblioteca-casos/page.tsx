"use client";

/**
 * Biblioteca de casos · acervo curado — Campus Virtual · Médica Capacitación (LXP)
 *
 * Archivo de estudio, no feed: casos ya resueltos y validados por los docentes, catalogados para
 * consultar. A diferencia del Ateneo (comunidad viva), aquí el diagnóstico SÍ se ve.
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx). El detalle está en biblioteca/[id].
 * El filtrado es protagonista: facetas con conteos + chips activos removibles + búsqueda.
 *
 * Stubs: onAbrirCaso · onFiltrar · onBuscar · onGuardar · onPracticar
 */

import { useMemo, useState } from "react";
import { Bookmark, ChevronDown, Images, Library, Search, SlidersHorizontal, X } from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type DominioIAIM = "Indicación" | "Adquisición" | "Interpretación" | "Decisión";
export type Dificultad = "Básico" | "Intermedio" | "Avanzado";

export type CasoBiblioteca = {
  id: string;
  folio: string;
  titulo: string;
  area: string;
  organo: string;
  patologia: string;
  dominio: DominioIAIM;
  dificultad: Dificultad;
  portada: string;
  piezas: number;
  cineLoop?: boolean;
  etiquetas: string[];
  estudios: number;
  guardado?: boolean;
};

export type Faceta = { id: string; etiqueta: string; opciones: { valor: string; conteo: number }[] };

export type BibliotecaData = {
  total: number;
  guardados: number;
  facetas: Faceta[];
  patologias: string[];
  casos: CasoBiblioteca[];
};

const MOCK: BibliotecaData = {
  total: 164,
  guardados: 12,
  facetas: [
    {
      id: "area",
      etiqueta: "Área clínica",
      opciones: [
        { valor: "Renal", conteo: 34 },
        { valor: "Abdomen", conteo: 26 },
        { valor: "Obstétrico", conteo: 28 },
        { valor: "Hígado y vía biliar", conteo: 22 },
        { valor: "Doppler", conteo: 19 },
        { valor: "MSK", conteo: 14 },
        { valor: "Tórax · POCUS", conteo: 12 },
        { valor: "Cuello", conteo: 9 },
      ],
    },
    {
      id: "organo",
      etiqueta: "Órgano",
      opciones: [
        { valor: "Riñón", conteo: 21 },
        { valor: "Vía urinaria", conteo: 13 },
        { valor: "Vejiga", conteo: 8 },
        { valor: "Suprarrenal", conteo: 3 },
      ],
    },
    {
      id: "dominio",
      etiqueta: "Dominio I-AIM",
      opciones: [
        { valor: "Indicación", conteo: 41 },
        { valor: "Adquisición", conteo: 58 },
        { valor: "Interpretación", conteo: 72 },
        { valor: "Decisión", conteo: 33 },
      ],
    },
    {
      id: "dificultad",
      etiqueta: "Dificultad",
      opciones: [
        { valor: "Básico", conteo: 61 },
        { valor: "Intermedio", conteo: 79 },
        { valor: "Avanzado", conteo: 24 },
      ],
    },
  ],
  patologias: ["#litiasis", "#obstrucción", "#quiste", "#doppler", "#trauma"],
  casos: [
    {
      id: "c0412",
      folio: "0412",
      titulo: "Hidronefrosis grado III por litiasis ureteral",
      area: "Renal",
      organo: "Riñón",
      patologia: "Litiasis obstructiva",
      dominio: "Interpretación",
      dificultad: "Intermedio",
      portada: "riñón derecho · longitudinal",
      piezas: 6,
      cineLoop: true,
      etiquetas: ["#litiasis", "#jet-ureteral"],
      estudios: 412,
      guardado: true,
    },
    {
      id: "c0388",
      folio: "0388",
      titulo: "Colecistitis aguda litiásica",
      area: "Hígado y vía biliar",
      organo: "Vesícula",
      patologia: "Colecistitis",
      dominio: "Interpretación",
      dificultad: "Básico",
      portada: "vesícula · transversal",
      piezas: 4,
      etiquetas: ["#pared-engrosada", "#murphy"],
      estudios: 388,
    },
    {
      id: "c0356",
      folio: "0356",
      titulo: "Embarazo de 12 SDG: biometría y viabilidad",
      area: "Obstétrico",
      organo: "Útero",
      patologia: "Embarazo temprano",
      dominio: "Adquisición",
      dificultad: "Básico",
      portada: "saco gestacional · sagital",
      piezas: 7,
      cineLoop: true,
      etiquetas: ["#lcc", "#fcf"],
      estudios: 356,
    },
    {
      id: "c0291",
      folio: "0291",
      titulo: "Trombosis venosa profunda femoral",
      area: "Doppler",
      organo: "Vena femoral",
      patologia: "Trombosis",
      dominio: "Adquisición",
      dificultad: "Avanzado",
      portada: "vena femoral común · doppler color",
      piezas: 5,
      cineLoop: true,
      etiquetas: ["#compresibilidad", "#espectral"],
      estudios: 291,
    },
    {
      id: "c0244",
      folio: "0244",
      titulo: "Nódulo tiroideo TI-RADS 4",
      area: "Cuello",
      organo: "Tiroides",
      patologia: "Nódulo",
      dominio: "Decisión",
      dificultad: "Intermedio",
      portada: "lóbulo tiroideo derecho",
      piezas: 3,
      etiquetas: ["#ti-rads", "#microcalcificaciones"],
      estudios: 244,
      guardado: true,
    },
    {
      id: "c0232",
      folio: "0232",
      titulo: "Derrame pleural con atelectasia pasiva",
      area: "Tórax · POCUS",
      organo: "Pleura",
      patologia: "Derrame",
      dominio: "Interpretación",
      dificultad: "Básico",
      portada: "seno costofrénico izquierdo",
      piezas: 4,
      cineLoop: true,
      etiquetas: ["#signo-cortina", "#pocus"],
      estudios: 232,
    },
    {
      id: "c0187",
      folio: "0187",
      titulo: "Rotura parcial del supraespinoso",
      area: "MSK",
      organo: "Hombro",
      patologia: "Rotura tendinosa",
      dominio: "Interpretación",
      dificultad: "Avanzado",
      portada: "hombro · eje longitudinal",
      piezas: 6,
      etiquetas: ["#manguito", "#anisotropía"],
      estudios: 187,
    },
    {
      id: "c0174",
      folio: "0174",
      titulo: "Apendicitis aguda no complicada",
      area: "Abdomen",
      organo: "Apéndice",
      patologia: "Apendicitis",
      dominio: "Indicación",
      dificultad: "Intermedio",
      portada: "fosa iliaca derecha",
      piezas: 5,
      cineLoop: true,
      etiquetas: ["#compresión-graduada"],
      estudios: 174,
    },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const nivelClase: Record<Dificultad, string> = {
  Básico: "bg-accent text-accent-foreground",
  Intermedio: "border border-border bg-muted text-[color:var(--foreground-soft)]",
  Avanzado:
    "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
};

/** Placeholder del visor: el real es Cornerstone3D. */
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
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
        }}
      />
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
          className={`absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
        >
          <Images className="h-[11px] w-[11px]" strokeWidth={2} />
          {piezas} piezas
        </span>
      )}
    </div>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Biblioteca({ data = MOCK }: { data?: BibliotecaData }) {
  const { total, guardados, facetas, patologias, casos } = data;

  const [busqueda, setBusqueda] = useState("");
  const [activos, setActivos] = useState<Record<string, string[]>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [soloGuardados, setSoloGuardados] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(
    casos.filter((c) => c.guardado).map((c) => c.id),
  );

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirCaso = (_id: string) => {};
  const onPracticar = (_id: string) => {};
  const onBuscar = (t: string) => setBusqueda(t);
  const onFiltrar = (faceta: string, valor: string) =>
    setActivos((a) => {
      const lista = a[faceta] ?? [];
      return {
        ...a,
        [faceta]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor],
      };
    });
  const onGuardar = (id: string) =>
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  /* ──────────────────────────────────────────────────────── */

  const chipsActivos = useMemo(
    () => [
      ...Object.entries(activos).flatMap(([f, vs]) => vs.map((v) => ({ faceta: f, valor: v }))),
      ...tags.map((t) => ({ faceta: "tag", valor: t })),
    ],
    [activos, tags],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casos.filter((c) => {
      if (soloGuardados && !marcados.includes(c.id)) return false;
      if (activos.area?.length && !activos.area.includes(c.area)) return false;
      if (activos.dominio?.length && !activos.dominio.includes(c.dominio)) return false;
      if (activos.dificultad?.length && !activos.dificultad.includes(c.dificultad)) return false;
      if (!q) return true;
      return [c.titulo, c.area, c.organo, c.patologia, ...c.etiquetas]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [casos, busqueda, activos, soloGuardados, marcados]);

  const quitar = (faceta: string, valor: string) =>
    faceta === "tag"
      ? setTags((t) => t.filter((x) => x !== valor))
      : onFiltrar(faceta, valor);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera ───── */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <button
          type="button"
          onClick={() => setSoloGuardados((v) => !v)}
          aria-pressed={soloGuardados}
          className={`ml-auto inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${focusRing} ${
            soloGuardados
              ? "border-transparent bg-accent text-accent-foreground"
              : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Mis guardados <span className={`${mono} text-muted-foreground`}>{guardados}</span>
        </button>
      </div>

      {/* ───── Búsqueda + orden ───── */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex h-[52px] min-w-[280px] flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar en el acervo</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Busque por diagnóstico, hallazgo, órgano o etiqueta…"
            className="w-full bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className={`${mono} shrink-0 text-[11.5px] text-muted-foreground`}>
            {total} casos
          </span>
        </label>
        <label className="flex h-[52px] items-center gap-2 rounded-full border border-border bg-card px-5">
          <span className="text-[12.5px] text-muted-foreground">Ordenar</span>
          <select
            defaultValue="estudiados"
            className="appearance-none bg-transparent pr-1 text-[13.5px] font-semibold text-foreground outline-none"
          >
            <option value="estudiados">Más estudiados</option>
            <option value="recientes">Más recientes</option>
            <option value="dificultad">Dificultad</option>
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ══════════ RAIL DE FACETAS ══════════ */}
        <aside
          aria-label="Filtros del acervo"
          className={`${card} w-full shrink-0 self-start p-5 lg:sticky lg:top-6 lg:w-[248px]`}
        >
          <div className="flex items-baseline gap-2">
            <p className="text-[13.5px] font-bold">Filtros</p>
            <button
              type="button"
              onClick={() => {
                setActivos({});
                setTags([]);
              }}
              className={`ml-auto text-[12px] font-semibold text-secondary ${focusRing}`}
            >
              Limpiar
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-[22px]">
            {facetas.map((f) => (
              <fieldset key={f.id} className="border-0 p-0">
                <legend className={`${kicker} p-0 text-muted-foreground`}>{f.etiqueta}</legend>
                <div className="mt-2.5 flex flex-col gap-0.5">
                  {f.opciones.map((o) => {
                    const on = (activos[f.id] ?? []).includes(o.valor);
                    return (
                      <label
                        key={o.valor}
                        className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-[9px] px-2 transition-colors ${
                          on ? "bg-accent" : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onFiltrar(f.id, o.valor)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border-[1.75px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-secondary ${
                            on ? "border-secondary bg-secondary text-white" : "border-[color:var(--track)] bg-card"
                          }`}
                        >
                          {on && (
                            <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4 10-10" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`flex-1 text-[13px] ${
                            on ? "font-semibold text-accent-foreground" : `font-medium ${softText}`
                          }`}
                        >
                          {o.valor}
                        </span>
                        <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                          {o.conteo}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <fieldset className="border-0 p-0">
              <legend className={`${kicker} p-0 text-muted-foreground`}>Patología frecuente</legend>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {patologias.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]))
                      }
                      aria-pressed={on}
                      className={`h-8 rounded-full border px-2.5 text-[12px] font-semibold transition-colors ${focusRing} ${
                        on
                          ? "border-transparent bg-accent text-accent-foreground"
                          : `border-border bg-card ${softText} hover:bg-muted`
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex h-11 cursor-pointer items-center gap-2.5 border-t border-border px-2">
              <input
                type="checkbox"
                checked={soloGuardados}
                onChange={(e) => setSoloGuardados(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-secondary ${
                  soloGuardados ? "bg-primary" : "bg-[color:var(--track)]"
                }`}
              >
                <span
                  className={`h-[18px] w-[18px] rounded-full bg-card shadow-sm transition-transform ${
                    soloGuardados ? "translate-x-4" : ""
                  }`}
                />
              </span>
              <span className={`text-[13px] font-medium ${softText}`}>Solo mis guardados</span>
            </label>
          </div>
        </aside>

        {/* ══════════ GALERÍA ══════════ */}
        <div className="min-w-0 flex-1">
          {chipsActivos.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-muted-foreground">
                {visibles.length} casos con
              </span>
              {chipsActivos.map(({ faceta, valor }) => (
                <button
                  key={`${faceta}-${valor}`}
                  type="button"
                  onClick={() => quitar(faceta, valor)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-accent pl-3 pr-2 text-[12.5px] font-semibold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                >
                  {valor}
                  <X aria-hidden className="h-[13px] w-[13px]" strokeWidth={2.2} />
                  <span className="sr-only">Quitar filtro</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] text-[color:var(--foreground-soft)]">
                <span className="font-bold text-foreground">{total} casos</span> en el acervo · sin
                filtros aplicados
              </span>
              <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
                se muestran los más estudiados
              </span>
            </div>
          )}

          {visibles.length === 0 ? (
            /* estado vacío: dice qué filtro quitar */
            <div className={`${card} mt-4 px-10 py-16 text-center`}>
              <span
                aria-hidden
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground"
              >
                <Library className="h-[30px] w-[30px]" strokeWidth={1.6} />
              </span>
              <h2 className="mt-5 text-[20px] font-bold leading-snug">
                Ningún caso combina esos filtros todavía
              </h2>
              <p className={`mx-auto mt-2.5 max-w-[52ch] text-[14.5px] leading-relaxed ${softText}`}>
                El acervo crece cada semana con los casos que los docentes validan en el Ateneo.
                Quite un filtro para volver a ver el resto.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActivos({})}
                  className={`h-12 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Quitar los filtros
                </button>
                <button
                  type="button"
                  className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Avisarme cuando haya casos así
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibles.map((c) => {
                  const on = marcados.includes(c.id);
                  return (
                    <li
                      key={c.id}
                      className={`${card} relative overflow-hidden transition-colors hover:border-primary`}
                    >
                      <button
                        type="button"
                        onClick={() => onAbrirCaso(c.id)}
                        className={`block w-full text-left ${focusRing}`}
                      >
                        <Portada etiqueta={c.portada} alto={168} loop={c.cineLoop} piezas={c.piezas} />
                        <div className="p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                              {c.area}
                            </span>
                            <span
                              className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${nivelClase[c.dificultad]}`}
                            >
                              {c.dificultad}
                            </span>
                          </div>
                          <h3
                            className="mt-3 text-[15.5px] font-bold leading-snug"
                            style={{ textWrap: "pretty" }}
                          >
                            {c.titulo}
                          </h3>
                          <p className={`${mono} mt-2 text-[11.5px] text-muted-foreground`}>
                            I-AIM · {c.dominio}
                          </p>
                          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
                            <span className="text-[11.5px] text-muted-foreground">
                              {c.etiquetas.join(" · ")}
                            </span>
                            <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
                              {c.estudios} estudios
                            </span>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onGuardar(c.id)}
                        aria-label="Guardar para estudio"
                        aria-pressed={on}
                        className={`absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full transition-colors ${focusRing} ${
                          on
                            ? "bg-primary text-[color:var(--sidebar)]"
                            : "bg-card/90 text-[color:var(--foreground-soft)] hover:bg-primary hover:text-[color:var(--sidebar)]"
                        }`}
                      >
                        <Bookmark
                          aria-hidden
                          className="h-4 w-4"
                          strokeWidth={1.75}
                          fill={on ? "currentColor" : "none"}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Ver más casos
                </button>
                <span className={`${mono} text-[12px] text-muted-foreground`}>
                  {visibles.length} de {total}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* móvil: acceso al panel de filtros (el rail se colapsa) */}
      <button
        type="button"
        className={`fixed bottom-24 left-1/2 z-20 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-sidebar px-5 text-[13px] font-bold text-sidebar-foreground shadow-lg lg:hidden ${focusRing}`}
      >
        <SlidersHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Filtros · {chipsActivos.length}
      </button>
    </div>
  );
}

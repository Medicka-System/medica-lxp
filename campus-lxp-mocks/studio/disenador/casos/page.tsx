"use client";

/**
 * Studio · Casos — curaduría del banco de casos
 *
 * Puente entre "caso del alumno" y "activo curado". Dos vías de entrada:
 *   1. El alumno lo sube en su bitácora y un DOCENTE lo valida → entra al banco.
 *   2. El staff (docente o diseñador) lo sube DIRECTO con "Subir caso" → entra como
 *      "cargado por staff", sin validación, y sigue la misma curaduría.
 *
 * Curar = catalogar + estructurar la verdad del caso. Sólo después se publica a la BIBLIOTECA
 * (acervo de estudio) y/o se marca como CASO BASE DE SIMULADOR (entrenamiento IA).
 *
 * Un color por significado: ámbar = falta curar · teal = en Biblioteca · violeta = en Simuladores
 * · gris = archivado. Sin rojo: nada de esto es un error.
 *
 * Stubs: onAbrirCaso · onCatalogar · onPublicarBiblioteca · onMarcarSimulador · onArchivar ·
 *        onFiltrar · onSubirCasoStaff
 */

import { useMemo, useState } from "react";
import {
  BookCopy,
  Check,
  GraduationCap,
  Archive,
  Building2,
  MonitorPlay,
  MoreHorizontal,
  Search,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { mono, kicker, softText, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoCuraduria = "banco" | "biblioteca" | "simulador" | "ambas" | "archivado";
export type OrigenCaso = "alumno" | "staff";
export type DominioIAIM = "Indicación" | "Adquisición" | "Interpretación" | "Decisión";
export type Dificultad = "Básico" | "Intermedio" | "Avanzado";

export type CasoBanco = {
  id: string;
  titulo: string;
  estado: EstadoCuraduria;
  origen: OrigenCaso;
  autor: string;
  area: string;
  organo: string;
  patologia: string;
  dominio: DominioIAIM;
  dificultad: Dificultad;
  piezas: number;
  loops: number;
  cuando: string;
  moduloOrigen?: string;
  miniatura?: string;
};

export type Faceta = { titulo: string; opciones: { etiqueta: string; conteo: number }[] };

export type CasosData = {
  casos: CasoBanco[];
  totales: { banco: number; porCurar: number; biblioteca: number; simuladores: number; archivados: number };
  porCurarDeAlumno: number;
  porCurarDeStaff: number;
  facetas: Faceta[];
};

const MOCK: CasosData = {
  totales: { banco: 214, porCurar: 12, biblioteca: 96, simuladores: 34, archivados: 18 },
  porCurarDeAlumno: 9,
  porCurarDeStaff: 3,
  facetas: [
    { titulo: "Origen", opciones: [{ etiqueta: "De alumno", conteo: 168 }, { etiqueta: "Cargado por staff", conteo: 46 }] },
    {
      titulo: "Área clínica",
      opciones: [
        { etiqueta: "Renal", conteo: 62 },
        { etiqueta: "Vías urinarias", conteo: 38 },
        { etiqueta: "Hígado y vía biliar", conteo: 34 },
        { etiqueta: "Obstétrico", conteo: 41 },
        { etiqueta: "Doppler", conteo: 24 },
        { etiqueta: "MSK", conteo: 15 },
      ],
    },
    {
      titulo: "Órgano",
      opciones: [
        { etiqueta: "Riñón", conteo: 48 },
        { etiqueta: "Uréter", conteo: 19 },
        { etiqueta: "Vejiga", conteo: 22 },
        { etiqueta: "Vesícula", conteo: 26 },
        { etiqueta: "Útero", conteo: 33 },
      ],
    },
    {
      titulo: "Dominio I-AIM",
      opciones: [
        { etiqueta: "Indicación", conteo: 44 },
        { etiqueta: "Adquisición", conteo: 58 },
        { etiqueta: "Interpretación", conteo: 79 },
        { etiqueta: "Decisión", conteo: 33 },
      ],
    },
    {
      titulo: "Dificultad",
      opciones: [
        { etiqueta: "Básico", conteo: 71 },
        { etiqueta: "Intermedio", conteo: 88 },
        { etiqueta: "Avanzado", conteo: 55 },
      ],
    },
  ],
  casos: [
    { id: "c1", titulo: "Hidronefrosis grado III con adelgazamiento cortical", estado: "banco", origen: "alumno", autor: "Dr. Iván Torres", area: "Renal", organo: "Riñón", patologia: "Hidronefrosis", dominio: "Interpretación", dificultad: "Intermedio", piezas: 4, loops: 1, cuando: "validado hace 2 días", moduloOrigen: "Módulo 04 · Interpretación renal" },
    { id: "c2", titulo: "Litiasis ureteral distal con jet ausente", estado: "banco", origen: "staff", autor: "Dra. Karla Lugo", area: "Vías urinarias", organo: "Uréter", patologia: "Litiasis", dominio: "Decisión", dificultad: "Avanzado", piezas: 6, loops: 2, cuando: "cargado hace 5 h" },
    { id: "c3", titulo: "Quiste parapiélico simulando dilatación", estado: "banco", origen: "alumno", autor: "Dra. Karla Méndez", area: "Renal", organo: "Riñón", patologia: "Quiste", dominio: "Interpretación", dificultad: "Avanzado", piezas: 3, loops: 0, cuando: "validado hace 3 días" },
    { id: "c4", titulo: "Colecistitis aguda litiásica con pared engrosada", estado: "biblioteca", origen: "alumno", autor: "Dr. Luis Arreola", area: "Hígado y vía biliar", organo: "Vesícula", patologia: "Colecistitis", dominio: "Indicación", dificultad: "Básico", piezas: 5, loops: 1, cuando: "curado el 2 nov" },
    { id: "c5", titulo: "Riñón poliquístico: conteo y medición", estado: "ambas", origen: "staff", autor: "Dr. Alejandro Sandoval", area: "Renal", organo: "Riñón", patologia: "Poliquistosis", dominio: "Adquisición", dificultad: "Intermedio", piezas: 8, loops: 2, cuando: "curado el 28 oct" },
    { id: "c6", titulo: "Trombosis de vena renal en Doppler color", estado: "simulador", origen: "alumno", autor: "Dra. Renata Salas", area: "Doppler", organo: "Vena renal", patologia: "Trombosis", dominio: "Interpretación", dificultad: "Avanzado", piezas: 4, loops: 2, cuando: "curado el 26 oct" },
    { id: "c7", titulo: "Embarazo de 12 semanas: biometría correcta", estado: "biblioteca", origen: "staff", autor: "Dra. Mariana Peña", area: "Obstétrico", organo: "Útero", patologia: "Embarazo normal", dominio: "Adquisición", dificultad: "Básico", piezas: 6, loops: 0, cuando: "curado el 21 oct" },
    { id: "c8", titulo: "Vejiga con globo vesical y residuo alto", estado: "banco", origen: "alumno", autor: "Dr. Hugo Cuevas", area: "Vías urinarias", organo: "Vejiga", patologia: "Retención", dominio: "Decisión", dificultad: "Básico", piezas: 3, loops: 1, cuando: "validado hace 6 días" },
    { id: "c9", titulo: "Riñón derecho sin ventana adecuada", estado: "archivado", origen: "alumno", autor: "Dr. Iván Torres", area: "Renal", organo: "Riñón", patologia: "Estudio limitado", dominio: "Adquisición", dificultad: "Básico", piezas: 2, loops: 0, cuando: "archivado el 12 oct" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ESTADO: Record<
  EstadoCuraduria,
  { texto: string; clase: string; icono?: typeof BookCopy; borde?: string }
> = {
  banco: {
    texto: "Por curar",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    borde: "border-[color:var(--warning-border)]",
  },
  biblioteca: { texto: "En Biblioteca", clase: "bg-accent text-accent-foreground", icono: BookCopy },
  simulador: {
    texto: "En Simuladores",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: MonitorPlay,
  },
  ambas: { texto: "Biblioteca + Simulador", clase: "bg-accent text-accent-foreground", icono: Check },
  archivado: { texto: "Archivado", clase: "border border-border bg-muted text-muted-foreground", icono: Archive },
};

export function ChipEstadoCuraduria({ estado }: { estado: EstadoCuraduria }) {
  const e = ESTADO[estado];
  const Icono = e.icono;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${e.clase}`}
    >
      {Icono && <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />}
      {e.texto}
    </span>
  );
}

/** El origen se distingue sin ambigüedad: gris para el alumno, navy para el staff. */
export function Origen({ origen, autor }: { origen: OrigenCaso; autor: string }) {
  const Icono = origen === "alumno" ? GraduationCap : Building2;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] ${
        origen === "alumno" ? "font-medium text-muted-foreground" : "font-semibold text-sidebar"
      }`}
    >
      <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
      {origen === "alumno" ? "De alumno" : "Staff"} · {autor}
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Casos({ data = MOCK }: { data?: CasosData }) {
  const { casos, totales, facetas, porCurarDeAlumno, porCurarDeStaff } = data;
  const [bandeja, setBandeja] = useState<"por-curar" | "todo" | "biblioteca" | "simuladores" | "archivados">(
    "por-curar",
  );
  const [busca, setBusca] = useState("");
  const [activos, setActivos] = useState<Record<string, string[]>>({});

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirCaso = (_id: string) => {};
  const onSubirCasoStaff = () => {};
  const onCurarElMasAntiguo = () => {};
  /* ──────────────────────────────────────────────────────── */

  const alternar = (faceta: string, valor: string) =>
    setActivos((a) => {
      const actual = a[faceta] ?? [];
      return {
        ...a,
        [faceta]: actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor],
      };
    });

  const visibles = useMemo(() => {
    const porBandeja = casos.filter((c) => {
      if (bandeja === "por-curar") return c.estado === "banco";
      if (bandeja === "biblioteca") return c.estado === "biblioteca" || c.estado === "ambas";
      if (bandeja === "simuladores") return c.estado === "simulador" || c.estado === "ambas";
      if (bandeja === "archivados") return c.estado === "archivado";
      return true;
    });
    if (!busca.trim()) return porBandeja;
    const q = busca.trim().toLowerCase();
    return porBandeja.filter(
      (c) => c.titulo.toLowerCase().includes(q) || c.autor.toLowerCase().includes(q),
    );
  }, [casos, bandeja, busca]);

  /* estado vacío: el banco aún no recibe casos */
  if (casos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
        <div className="rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-14 text-center">
          <span
            aria-hidden
            className="inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <MonitorPlay className="h-[26px] w-[26px]" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">
            El banco está vacío
          </h2>
          <p className={`mx-auto mt-2.5 max-w-[58ch] text-[13.5px] leading-relaxed ${softText}`}>
            Los casos llegan por dos caminos: cuando un docente valida el caso de un alumno en su
            bitácora, o cuando usted sube uno propio. Después se curan: catalogar, estructurar la
            verdad del caso y publicarlos.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={onSubirCasoStaff}
              className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
              Subir caso
            </button>
            <button
              type="button"
              className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Ver cómo validan los docentes
            </button>
          </div>
          <p className="mt-5 text-[12px] text-muted-foreground">
            Todo estudio se anonimiza al cargarse: nunca se guardan datos que identifiquen al
            paciente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      {/* bandejas + subir */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ["por-curar", "Por curar", totales.porCurar],
              ["todo", "Todo el banco", totales.banco],
              ["biblioteca", "En Biblioteca", totales.biblioteca],
              ["simuladores", "En Simuladores", totales.simuladores],
              ["archivados", "Archivados", totales.archivados],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBandeja(id)}
              aria-pressed={bandeja === id}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
                bandeja === id
                  ? "bg-sidebar text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${bandeja === id ? "text-white/70" : "text-muted-foreground"}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar caso</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por diagnóstico o autor…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="button"
          onClick={onSubirCasoStaff}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Subir caso
        </button>
      </div>

      {/* el trabajo pendiente es el dato */}
      {totales.porCurar > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-5 py-3.5">
          <span
            aria-hidden
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
          >
            <TriangleAlert className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <p className="min-w-[280px] flex-1 text-[13px] leading-relaxed text-[color:var(--warning-foreground)]">
            <span className="font-bold">{totales.porCurar} casos esperan curaduría</span> —{" "}
            {porCurarDeAlumno} los validó un docente desde la bitácora del alumno y {porCurarDeStaff}{" "}
            los cargó el staff. Curar es catalogar y estructurar la verdad del caso; hasta entonces no
            llegan a la Biblioteca ni al simulador.
          </p>
          <button
            type="button"
            onClick={onCurarElMasAntiguo}
            className={`h-10 shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
          >
            Curar el más antiguo
          </button>
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* facetas */}
        <aside className="rounded-xl border border-border bg-card px-4 pb-4 pt-1 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
          {facetas.map((f) => (
            <div key={f.titulo} className="border-b border-border py-3.5">
              <p className={`${kicker} mb-2 text-muted-foreground`}>{f.titulo}</p>
              {f.opciones.map((o) => {
                const on = (activos[f.titulo] ?? []).includes(o.etiqueta);
                return (
                  <label
                    key={o.etiqueta}
                    className={`flex h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-1.5 transition-colors ${
                      on ? "bg-accent" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => alternar(f.titulo, o.etiqueta)}
                      className="h-4 w-4 shrink-0 accent-[color:var(--secondary)]"
                    />
                    <span
                      className={`flex-1 text-[12.5px] ${
                        on ? "font-semibold text-accent-foreground" : `font-medium ${softText}`
                      }`}
                    >
                      {o.etiqueta}
                    </span>
                    <span className={`${mono} text-[11px] text-muted-foreground`}>{o.conteo}</span>
                  </label>
                );
              })}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setActivos({})}
            className={`mt-3.5 h-10 w-full rounded-[9px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Limpiar filtros
          </button>
        </aside>

        {/* galería: la imagen del caso es la protagonista */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`text-[13px] ${softText}`}>
              <span className="font-bold text-foreground">{totales.banco} casos</span> en el banco ·{" "}
              {totales.porCurar} por curar
            </span>
            <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
              orden: los que llevan más esperando
            </span>
          </div>

          <ul className="mt-3.5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c) => (
              <li key={c.id}>
                <article
                  className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${
                    c.estado === "banco" ? "border-[color:var(--warning-border)]" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onAbrirCaso(c.id)}
                    className={`relative grid w-full place-items-center ${focusRing}`}
                    style={{ aspectRatio: "4 / 3", background: "var(--sidebar)" }}
                  >
                    {c.miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.miniatura} alt="" className="h-full w-full object-cover" />
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
                          className={`${mono} relative px-3 text-center text-[9px] uppercase tracking-[0.14em]`}
                          style={{ color: "var(--hero-ink-muted)" }}
                        >
                          {c.area} · {c.organo}
                        </span>
                      </>
                    )}
                    <span className="absolute left-2 top-2">
                      <ChipEstadoCuraduria estado={c.estado} />
                    </span>
                    <span
                      className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
                      style={{ background: "rgba(15,45,82,.82)" }}
                    >
                      {c.piezas} piezas{c.loops ? ` · ${c.loops} loop${c.loops > 1 ? "s" : ""}` : ""}
                    </span>
                  </button>

                  <div className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <Origen origen={c.origen} autor={c.autor} />
                      <button
                        type="button"
                        aria-label={`Más acciones de ${c.titulo}`}
                        className={`ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                    <p
                      className="mt-2.5 text-[13.5px] font-bold leading-relaxed"
                      style={{ textWrap: "pretty" }}
                    >
                      {c.titulo}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {[`${c.area} · ${c.organo}`, c.dominio, c.dificultad].map((t, i) => (
                        <span
                          key={t}
                          className={`inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold ${softText} ${
                            i === 1 ? mono : ""
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className={`${mono} mt-2.5 border-t border-border pt-2.5 text-[11px] text-muted-foreground`}>
                      {c.cuando}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {visibles.length === 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
              <p className="text-[15px] font-bold">Ningún caso con estos filtros</p>
              <p className={`mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
                Quite una faceta o cambie de bandeja. Si busca algo que nadie ha subido, puede
                cargarlo usted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

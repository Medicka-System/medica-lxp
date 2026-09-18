"use client";

/**
 * Explorar · Catálogo — Campus Virtual · Médica Capacitación (LXP)
 * Descubrir programas NUEVOS. Lo ya inscrito vive en "Mis cursos" (aquí solo se marca y se
 * ofrece el salto). La inscripción la confirma la coordinación (ERP): el CTA solicita informes,
 * no cobra.
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx).
 *
 * Jerarquía: 1) buscador del catálogo + filtros por órgano/modalidad
 * 2) programa destacado 3) rejilla de cursos 4) rutas sugeridas (programas que se encadenan).
 *
 * Tokens de globals.css (sin hex aquí). Stubs: onSolicitarInfo · onVerDetalle · onIrAlCurso
 */

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Monitor,
  Search,
  Users,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Modalidad = "en-linea" | "hibrido" | "presencial";

export type CursoCatalogo = {
  id: string;
  titulo: string;
  organo: string;
  modalidad: Modalidad;
  horas: number;
  docente: string;
  resumen: string;
  inicia: string;
  cupo?: string;
  inscrito?: boolean;
  nuevo?: boolean;
};

export type Ruta = {
  id: string;
  titulo: string;
  resumen: string;
  cursos: number;
  horas: number;
};

export type CatalogoData = {
  destacado: CursoCatalogo & { linea: string; incluye: string[] };
  cursos: CursoCatalogo[];
  rutas: Ruta[];
};

const MOCK: CatalogoData = {
  destacado: {
    id: "d1",
    titulo: "Ultrasonografía Médica",
    linea: "Diplomado modular · 8 módulos",
    organo: "Programa completo",
    modalidad: "hibrido",
    horas: 1000,
    docente: "Dr. Alejandro Sandoval y 6 docentes más",
    resumen:
      "La formación troncal del campus: de la física del equipo a los casos integradores, con práctica supervisada y casos reales validados por su docente.",
    inicia: "Nueva generación el 12 de enero",
    cupo: "Quedan 8 lugares",
    incluye: ["8 módulos", "Práctica presencial", "Bitácora de casos", "Constancia 1000 h"],
    inscrito: true,
  },
  cursos: [
    {
      id: "c1",
      titulo: "Ultrasonido en urgencias (POCUS)",
      organo: "Urgencias",
      modalidad: "hibrido",
      horas: 120,
      docente: "Dra. Karla Lugo",
      resumen: "E-FAST, pulmón y valoración de volemia para decidir en minutos.",
      inicia: "Inicia el 21 de noviembre",
      inscrito: true,
    },
    {
      id: "c2",
      titulo: "Ultrasonido obstétrico básico",
      organo: "Obstétrico",
      modalidad: "en-linea",
      horas: 80,
      docente: "Dra. Mariana Peña",
      resumen: "Primer trimestre, biometría fetal y bienestar, con guías de barrido paso a paso.",
      inicia: "Abre el 2 de diciembre",
      inscrito: true,
    },
    {
      id: "c3",
      titulo: "Doppler vascular periférico",
      organo: "Vascular",
      modalidad: "hibrido",
      horas: 140,
      docente: "Dr. Hugo Cuevas",
      resumen: "Trombosis, insuficiencia venosa y mapeo arterial con protocolos de reporte.",
      inicia: "Nueva generación el 15 de enero",
      cupo: "Quedan 12 lugares",
      nuevo: true,
    },
    {
      id: "c4",
      titulo: "Tiroides y cuello",
      organo: "Tiroides",
      modalidad: "en-linea",
      horas: 90,
      docente: "Dra. Renata Villalobos",
      resumen: "Clasificación de nódulos, TI-RADS y correlación con citología.",
      inicia: "Inscripción abierta todo el año",
    },
    {
      id: "c5",
      titulo: "Ultrasonido musculoesquelético avanzado",
      organo: "Musculoesquelético",
      modalidad: "presencial",
      horas: 160,
      docente: "Dr. Iván Serrano",
      resumen: "Hombro, rodilla y mano con intervención guiada en modelo anatómico.",
      inicia: "Sede CDMX · 7 de febrero",
      cupo: "Quedan 5 lugares",
      nuevo: true,
    },
    {
      id: "c6",
      titulo: "Hígado y vía biliar en profundidad",
      organo: "Hepático",
      modalidad: "en-linea",
      horas: 110,
      docente: "Dr. Alejandro Sandoval",
      resumen: "Esteatosis, colestasis y lesiones focales con cine-loops comentados.",
      inicia: "Inscripción abierta todo el año",
    },
  ],
  rutas: [
    {
      id: "r1",
      titulo: "Ruta abdomen completo",
      resumen: "Hepático, renal y vía biliar encadenados, con casos integradores al final.",
      cursos: 3,
      horas: 340,
    },
    {
      id: "r2",
      titulo: "Ruta de urgencias",
      resumen: "POCUS, pulmón y vascular para guardia: decisiones rápidas con evidencia.",
      cursos: 3,
      horas: 300,
    },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const MODALIDAD: Record<Modalidad, { etiqueta: string; icono: typeof Monitor }> = {
  "en-linea": { etiqueta: "En línea", icono: Monitor },
  hibrido: { etiqueta: "Híbrido", icono: Users },
  presencial: { etiqueta: "Presencial", icono: MapPin },
};

function Portada({
  etiqueta,
  alto = 150,
}: {
  etiqueta: string;
  alto?: number | string;
}) {
  return (
    <div
      aria-hidden
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ height: alto, background: "var(--sidebar)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
        }}
      />
      <span
        className={`relative ${mono} px-3 text-center text-[10px] uppercase tracking-[0.14em]`}
        style={{ color: "var(--hero-ink-muted)" }}
      >
        {etiqueta}
      </span>
    </div>
  );
}

function MetaModalidad({ m, sobreNavy = false }: { m: Modalidad; sobreNavy?: boolean }) {
  const { etiqueta, icono: Icono } = MODALIDAD[m];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
      style={{ color: sobreNavy ? "var(--hero-ink-soft)" : "var(--muted-foreground)" }}
    >
      <Icono aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
      {etiqueta}
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Catalogo({ data = MOCK }: { data?: CatalogoData }) {
  const { destacado, cursos, rutas } = data;
  const [consulta, setConsulta] = useState("");
  const [organo, setOrgano] = useState<string>("Todos");
  const [modalidad, setModalidad] = useState<"Todas" | Modalidad>("Todas");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onSolicitarInfo = (_id: string) => {};
  const onVerDetalle = (_id: string) => {};
  const onIrAlCurso = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const organos = useMemo(
    () => ["Todos", ...Array.from(new Set(cursos.map((c) => c.organo)))],
    [cursos],
  );

  const visibles = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return cursos.filter(
      (c) =>
        (organo === "Todos" || c.organo === organo) &&
        (modalidad === "Todas" || c.modalidad === modalidad) &&
        (!q ||
          `${c.titulo} ${c.organo} ${c.docente} ${c.resumen}`.toLowerCase().includes(q)),
    );
  }, [cursos, consulta, organo, modalidad]);

  const limpiar = () => {
    setConsulta("");
    setOrgano("Todos");
    setModalidad("Todas");
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera + buscador del catálogo ───── */}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-12 min-w-[260px] flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 transition-colors focus-within:border-secondary lg:max-w-[420px]">
            <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar en el catálogo</span>
            <input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Órgano, técnica o docente…"
              className="w-full bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {(["Todas", "en-linea", "hibrido", "presencial"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModalidad(m)}
                aria-pressed={modalidad === m}
                className={`h-11 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${focusRing} ${
                  modalidad === m
                    ? "border-transparent bg-sidebar text-sidebar-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {m === "Todas" ? "Todas las modalidades" : MODALIDAD[m].etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* órganos */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {organos.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrgano(o)}
              aria-pressed={organo === o}
              className={`h-9 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                organo === o
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </header>

      {/* ───── Programa destacado ───── */}
      <section
        aria-label={`Destacado: ${destacado.titulo}`}
        className="relative mt-7 overflow-hidden rounded-[16px]"
        style={{ background: "var(--sidebar)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 9px), radial-gradient(90% 130% at 82% 0%, rgba(26,136,128,.5) 0%, rgba(15,45,82,0) 62%)",
          }}
        />
        <div className="relative grid gap-7 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                Inscripciones abiertas
              </span>
              <MetaModalidad m={destacado.modalidad} sobreNavy />
              <span className={`${mono} text-[12px]`} style={{ color: "var(--hero-ink-muted)" }}>
                {destacado.horas} h acreditables
              </span>
            </div>
            <h2
              className="mt-4 max-w-[24ch] text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-[36px]"
              style={{ color: "var(--hero-ink)" }}
            >
              {destacado.titulo}
            </h2>
            <p className="mt-2 text-[13.5px]" style={{ color: "var(--hero-ink-muted)" }}>
              {destacado.linea}
            </p>
            <p
              className="mt-4 max-w-[60ch] text-[14.5px] leading-relaxed"
              style={{ color: "var(--hero-ink-soft)" }}
            >
              {destacado.resumen}
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {destacado.incluye.map((i) => (
                <li
                  key={i}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/25 px-3 text-[12.5px] font-semibold"
                  style={{ color: "var(--hero-ink)" }}
                >
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {destacado.inscrito ? (
                <>
                  <span
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-white/12 px-5 text-[14px] font-semibold"
                    style={{ color: "var(--hero-ink)" }}
                  >
                    <Check aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    Ya está inscrita
                  </span>
                  <button
                    type="button"
                    onClick={() => onIrAlCurso(destacado.id)}
                    className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white"
                  >
                    Ir al curso
                    <ChevronRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onSolicitarInfo(destacado.id)}
                  className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white"
                >
                  Solicitar informes
                </button>
              )}
              <button
                type="button"
                onClick={() => onVerDetalle(destacado.id)}
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 px-5 text-[14px] font-semibold transition-colors hover:bg-white/10"
                style={{ color: "var(--hero-ink)" }}
              >
                Ver el temario
              </button>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--hero-ink-muted)" }}>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                {destacado.inicia}
              </span>
              {destacado.cupo && <span className={mono}>{destacado.cupo}</span>}
            </p>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-white/15">
            <Portada etiqueta="portada del diplomado · 1000 h" alto={260} />
          </div>
        </div>
      </section>

      {/* ───── Rejilla del catálogo ───── */}
      <section aria-label="Cursos del catálogo" className="mt-9">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            Cursos y especializaciones
          </h2>
          <span className={`${mono} text-[12.5px] text-muted-foreground`}>
            {visibles.length} de {cursos.length}
          </span>
          {(consulta || organo !== "Todos" || modalidad !== "Todas") && (
            <button
              type="button"
              onClick={limpiar}
              className={`ml-auto inline-flex h-11 items-center rounded-full px-4 text-[13.5px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {visibles.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="text-[17px] font-extrabold tracking-[-0.02em]">
              Nada coincide con esa búsqueda
            </p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13.5px] leading-relaxed ${softText}`}>
              Pruebe con otro órgano o quite la modalidad. Si busca un tema que no está en el
              catálogo, la coordinación puede avisarle cuando abra.
            </p>
            <button
              type="button"
              onClick={limpiar}
              className={`mt-5 inline-flex h-12 items-center rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c) => (
              <li key={c.id} className={`${card} flex flex-col overflow-hidden`}>
                <div className="relative">
                  <Portada etiqueta={`portada · ${c.organo.toLowerCase()}`} />
                  <span
                    className={`absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${mono}`}
                    style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
                  >
                    {c.horas} h
                  </span>
                  {c.nuevo && (
                    <span className="absolute left-2.5 top-2.5 inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[11px] font-bold text-[color:var(--sidebar)]">
                      Nuevo
                    </span>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-5">
                  <div className="flex items-center gap-3">
                    <span className={`${kicker} text-muted-foreground`}>{c.organo}</span>
                    <span className="ml-auto">
                      <MetaModalidad m={c.modalidad} />
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[17px] font-extrabold leading-snug tracking-[-0.02em]">
                    {c.titulo}
                  </h3>
                  <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>{c.resumen}</p>
                  <p className="mt-2.5 text-[12.5px] text-muted-foreground">{c.docente}</p>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                      <Clock3 aria-hidden className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                      {c.inicia}
                    </p>
                    {c.cupo && (
                      <p
                        className={`${mono} mt-1.5 text-[12px] font-semibold text-[color:var(--warning-foreground)]`}
                      >
                        {c.cupo}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {c.inscrito ? (
                      <>
                        <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-bold text-accent-foreground">
                          <Check aria-hidden className="h-4 w-4" strokeWidth={2.2} />
                          Ya inscrita
                        </span>
                        <button
                          type="button"
                          onClick={() => onIrAlCurso(c.id)}
                          className={`inline-flex h-11 items-center gap-1 rounded-full px-3 text-[13.5px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
                        >
                          Ir al curso
                          <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSolicitarInfo(c.id)}
                          className={`inline-flex h-11 items-center rounded-full bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                        >
                          Solicitar informes
                        </button>
                        <button
                          type="button"
                          onClick={() => onVerDetalle(c.id)}
                          className={`inline-flex h-11 items-center gap-1 rounded-full px-3 text-[13.5px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
                        >
                          Temario
                          <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ───── Rutas sugeridas ───── */}
      <section aria-label="Rutas sugeridas" className="mt-10">
        <h2 className={`${kicker} text-muted-foreground`}>Rutas sugeridas</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {rutas.map((r) => (
            <article key={r.id} className={`${card} flex flex-wrap items-center gap-x-5 gap-y-4 p-5`}>
              <div className="min-w-0 flex-1 basis-[220px]">
                <p className="text-[16px] font-extrabold leading-snug tracking-[-0.02em]">{r.titulo}</p>
                <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>{r.resumen}</p>
                <p className={`${mono} mt-2 text-[12.5px] text-muted-foreground`}>
                  {r.cursos} cursos · {r.horas} h
                </p>
              </div>
              <button
                type="button"
                onClick={() => onVerDetalle(r.id)}
                className={`inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
              >
                Ver la ruta
                <ArrowUpRight aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

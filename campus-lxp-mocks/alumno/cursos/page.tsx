"use client";

/**
 * Mis cursos · Campus Virtual — Médica Capacitación (LXP)
 * Solo lo que la alumna ya tiene inscrito: retomar, ver avance y saber cuánto le falta.
 * Explorar el catálogo es otra sección (aquí solo hay un enlace de salida en el estado vacío).
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx): lateral, búsqueda global, campana, cuenta
 * y bottom-nav los aporta el layout.
 *
 * Jerarquía: 1) cabecera con horas acreditadas (el modelo del programa es acumulable)
 * 2) curso en foco = retomar donde se quedó + mapa de módulos
 * 3) resto de los cursos inscritos en tarjetas 4) completados, en tono apagado.
 *
 * Tokens de globals.css (sin hex aquí): bg-card bg-background bg-muted bg-primary bg-secondary
 * bg-accent bg-sidebar text-foreground text-muted-foreground text-secondary text-accent-foreground
 * border-border · var(--foreground-soft) var(--track) var(--hero-ink*) var(--warning*) var(--info*)
 *
 * Stubs: onRetomarCurso(id) · onVerCurso(id)
 */

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Lock,
  Play,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoCurso = "en-curso" | "por-empezar" | "completado";
export type EstadoModulo = "completado" | "actual" | "pendiente";

export type Modulo = {
  clave: string;
  titulo: string;
  horas: number;
  estado: EstadoModulo;
};

export type Curso = {
  id: string;
  titulo: string;
  linea: string;
  estado: EstadoCurso;
  avance: number;
  horasAcreditadas: number;
  horasTotales: number;
  modulos: Modulo[];
  retomar?: { modulo: string; leccion: string; avanceModulo: number; restante: string };
  proximaFecha?: string;
  completadoEn?: string;
};

export type MisCursosData = {
  horas: { acreditadas: number; meta: number };
  cursos: Curso[];
};

const MOCK: MisCursosData = {
  horas: { acreditadas: 612, meta: 1000 },
  cursos: [
    {
      id: "c1",
      titulo: "Ultrasonografía Médica",
      linea: "Diplomado modular · 1000 h",
      estado: "en-curso",
      avance: 48,
      horasAcreditadas: 480,
      horasTotales: 1000,
      retomar: {
        modulo: "Módulo 4 · Interpretación renal",
        leccion: "Lección 3 de 6 — Hidronefrosis: gradación y trampas del modo B",
        avanceModulo: 42,
        restante: "12 min restantes",
      },
      proximaFecha: "Clase en vivo hoy, 19:00",
      modulos: [
        { clave: "M1", titulo: "Física y equipo", horas: 120, estado: "completado" },
        { clave: "M2", titulo: "Abdomen superior", horas: 140, estado: "completado" },
        { clave: "M3", titulo: "Hígado y vía biliar", horas: 120, estado: "completado" },
        { clave: "M4", titulo: "Interpretación renal", horas: 120, estado: "actual" },
        { clave: "M5", titulo: "Vías urinarias", horas: 110, estado: "pendiente" },
        { clave: "M6", titulo: "Tiroides y cuello", horas: 130, estado: "pendiente" },
        { clave: "M7", titulo: "Doppler vascular", horas: 140, estado: "pendiente" },
        { clave: "M8", titulo: "Casos integradores", horas: 120, estado: "pendiente" },
      ],
    },
    {
      id: "c2",
      titulo: "Ultrasonido en urgencias (POCUS)",
      linea: "Curso · 120 h",
      estado: "en-curso",
      avance: 22,
      horasAcreditadas: 26,
      horasTotales: 120,
      retomar: {
        modulo: "Módulo 1 · Protocolo E-FAST",
        leccion: "Lección 5 de 8 — Ventana pericárdica",
        avanceModulo: 62,
        restante: "18 min restantes",
      },
      proximaFecha: "Práctica presencial el 21 nov",
      modulos: [
        { clave: "M1", titulo: "E-FAST", horas: 40, estado: "actual" },
        { clave: "M2", titulo: "Pulmón", horas: 40, estado: "pendiente" },
        { clave: "M3", titulo: "Choque y volemia", horas: 40, estado: "pendiente" },
      ],
    },
    {
      id: "c3",
      titulo: "Ultrasonido obstétrico básico",
      linea: "Curso · 80 h",
      estado: "por-empezar",
      avance: 0,
      horasAcreditadas: 0,
      horasTotales: 80,
      proximaFecha: "Abre el 2 de diciembre",
      modulos: [
        { clave: "M1", titulo: "Primer trimestre", horas: 30, estado: "pendiente" },
        { clave: "M2", titulo: "Biometría fetal", horas: 30, estado: "pendiente" },
        { clave: "M3", titulo: "Bienestar fetal", horas: 20, estado: "pendiente" },
      ],
    },
    {
      id: "c4",
      titulo: "Bases de ultrasonido musculoesquelético",
      linea: "Curso · 106 h",
      estado: "completado",
      avance: 100,
      horasAcreditadas: 106,
      horasTotales: 106,
      completadoEn: "Acreditado el 30 de agosto de 2026",
      modulos: [
        { clave: "M1", titulo: "Hombro", horas: 36, estado: "completado" },
        { clave: "M2", titulo: "Rodilla", horas: 35, estado: "completado" },
        { clave: "M3", titulo: "Mano y pie", horas: 35, estado: "completado" },
      ],
    },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


function Barra({ valor, alto = 8 }: { valor: number; alto?: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-[color:var(--track)]"
      style={{ height: alto }}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${valor}%` }} />
    </div>
  );
}

function ChipEstado({ estado }: { estado: EstadoCurso }) {
  if (estado === "completado")
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
        Completado
      </span>
    );
  if (estado === "por-empezar")
    return (
      <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-border px-2.5 text-[11.5px] font-semibold text-muted-foreground">
        Por empezar
      </span>
    );
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-semibold text-[color:var(--info-foreground)]">
      En curso
    </span>
  );
}

/* Mapa de módulos: el ADN del diplomado modular, legible de un vistazo. */
function MapaModulos({ modulos }: { modulos: Modulo[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {modulos.map((m) => {
        const base =
          "flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold";
        const estilo =
          m.estado === "completado"
            ? "border-transparent bg-accent text-accent-foreground"
            : m.estado === "actual"
              ? "border-transparent bg-primary text-[color:var(--sidebar)]"
              : "border-border bg-card text-muted-foreground";
        return (
          <li key={m.clave} className={`${base} ${estilo}`} title={`${m.titulo} · ${m.horas} h`}>
            {m.estado === "completado" && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />}
            {m.estado === "pendiente" && <Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />}
            <span className={mono}>{m.clave}</span>
            <span className="hidden font-medium sm:inline">{m.titulo}</span>
            <span className={`${mono} font-medium`}>{m.horas} h</span>
          </li>
        );
      })}
    </ul>
  );
}

/* Placeholder de portada: rayas suaves + etiqueta en mono. */
function Portada({ etiqueta, alto = 176 }: { etiqueta: string; alto?: number | string }) {
  return (
    <div
      aria-hidden
      className="relative grid w-full place-items-center overflow-hidden rounded-[12px]"
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

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function MisCursos({ data = MOCK }: { data?: MisCursosData }) {
  const [filtro, setFiltro] = useState<"todos" | "en-curso" | "completados">("todos");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onRetomarCurso = (_id: string) => {};
  const onVerCurso = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const { horas, cursos } = data;
  const enCurso = cursos.filter((c) => c.estado !== "completado");
  const completados = cursos.filter((c) => c.estado === "completado");
  const foco = enCurso.find((c) => c.retomar) ?? enCurso[0];

  const visibles = useMemo(() => {
    if (filtro === "en-curso") return enCurso;
    if (filtro === "completados") return completados;
    return cursos;
  }, [filtro, cursos, enCurso, completados]);

  const otros = visibles.filter((c) => c.id !== foco?.id && c.estado !== "completado");
  const completadosVisibles = visibles.filter((c) => c.estado === "completado");
  const mostrarFoco = !!foco && visibles.some((c) => c.id === foco.id);
  const horasPct = Math.round((horas.acreditadas / horas.meta) * 100);

  /* ── Estado vacío ── */
  if (cursos.length === 0)
    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center`}
        >
          <Portada etiqueta="portada del diplomado" alto={120} />
          <p className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">
            Todavía no tiene cursos inscritos
          </p>
          <p className={`max-w-[46ch] text-[14px] leading-relaxed ${softText}`}>
            Cuando su institución confirme la inscripción, el diplomado aparecerá aquí con sus
            módulos y sus horas acreditables.
          </p>
          <a
            href="#explorar"
            className={`mt-3 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Explorar el catálogo
            <ArrowUpRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera: horas acreditadas ───── */}
      <header className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div className="ml-auto w-full max-w-[320px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`${kicker} text-muted-foreground`}>Horas acreditadas</span>
            <span className={`${mono} text-[15px] font-bold`}>
              {horas.acreditadas}
              <span className="text-muted-foreground"> / {horas.meta} h</span>
            </span>
          </div>
          <div className="mt-2.5">
            <Barra valor={horasPct} />
          </div>
        </div>
      </header>

      {/* ───── Filtros ───── */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        {(
          [
            ["todos", `Todos · ${cursos.length}`],
            ["en-curso", `En curso · ${enCurso.length}`],
            ["completados", `Completados · ${completados.length}`],
          ] as const
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            aria-pressed={filtro === id}
            className={`h-11 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${focusRing} ${
              filtro === id
                ? "border-transparent bg-sidebar text-sidebar-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/* ───── Curso en foco ───── */}
      {mostrarFoco && foco && (
        <section aria-label={`Retomar ${foco.titulo}`} className={`${card} mt-6 overflow-hidden`}>
          <div className="grid gap-6 p-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-7">
            <div className="flex flex-col gap-3">
              <Portada etiqueta={`portada · ${foco.titulo.toLowerCase()}`} alto={176} />
              <div className="flex items-center gap-2">
                <ChipEstado estado={foco.estado} />
                <span className={`${mono} text-[11.5px] text-muted-foreground`}>{foco.linea}</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className={`${kicker} text-secondary`}>Retome donde se quedó</p>
              <h2 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">
                {foco.titulo}
              </h2>

              {foco.retomar && (
                <div className="mt-4 rounded-[12px] bg-muted p-4">
                  <p className="text-[13px] font-bold">{foco.retomar.modulo}</p>
                  <p className={`mt-1 text-[14px] leading-snug ${softText}`}>{foco.retomar.leccion}</p>
                  <div className="mt-3.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Barra valor={foco.retomar.avanceModulo} alto={6} />
                    </div>
                    <span className={`${mono} shrink-0 text-[12px] text-muted-foreground`}>
                      {foco.retomar.restante}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] font-semibold text-muted-foreground">
                      Avance del curso
                    </span>
                    <span className={`${mono} text-[14px] font-bold`}>
                      {foco.avance}%
                      <span className="ml-2 font-medium text-muted-foreground">
                        {foco.horasAcreditadas} / {foco.horasTotales} h
                      </span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <Barra valor={foco.avance} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onRetomarCurso(foco.id)}
                    className={`inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary px-6 text-[15px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    <Play aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    Retomar
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerCurso(foco.id)}
                    className={`inline-flex h-12 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-5 text-[14px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                  >
                    Ver el temario
                    <ChevronRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {foco.proximaFecha && (
                <p className="mt-4 flex items-center gap-2 text-[13px] text-[color:var(--info-foreground)]">
                  <CalendarClock aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {foco.proximaFecha}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-muted px-6 py-5 lg:px-7">
            <p className={`${kicker} mb-3 text-muted-foreground`}>
              Ruta del diplomado · {foco.modulos.filter((m) => m.estado === "completado").length} de{" "}
              {foco.modulos.length} módulos acreditados
            </p>
            <MapaModulos modulos={foco.modulos} />
          </div>
        </section>
      )}

      {/* ───── Otros cursos inscritos ───── */}
      {otros.length > 0 && (
        <section aria-label="Otros cursos inscritos" className="mt-8">
          <h2 className={`${kicker} text-muted-foreground`}>También inscrita</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {otros.map((c) => (
              <article key={c.id} className={`${card} flex flex-col p-5`}>
                <Portada etiqueta={`portada · ${c.titulo.toLowerCase()}`} alto={132} />
                <div className="mt-4 flex items-center gap-2">
                  <ChipEstado estado={c.estado} />
                  <span className={`${mono} text-[11.5px] text-muted-foreground`}>{c.linea}</span>
                </div>
                <h3 className="mt-3 text-[18px] font-extrabold leading-snug tracking-[-0.02em]">
                  {c.titulo}
                </h3>

                {c.retomar ? (
                  <p className={`mt-2 text-[13px] leading-snug ${softText}`}>
                    <span className="font-semibold text-foreground">{c.retomar.modulo}</span> ·{" "}
                    {c.retomar.leccion}
                  </p>
                ) : (
                  <p className={`mt-2 text-[13px] leading-snug ${softText}`}>
                    {c.modulos.length} módulos · {c.horasTotales} h acreditables
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-semibold text-muted-foreground">Avance</span>
                    <span className={`${mono} text-[13px] font-bold`}>
                      {c.avance}%
                      <span className="ml-2 font-medium text-muted-foreground">
                        {c.horasAcreditadas} / {c.horasTotales} h
                      </span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <Barra valor={c.avance} alto={6} />
                  </div>
                </div>

                {c.proximaFecha && (
                  <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <Clock3 aria-hidden className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                    {c.proximaFecha}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onRetomarCurso(c.id)}
                    disabled={c.estado === "por-empezar"}
                    className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
                  >
                    {c.estado === "por-empezar" ? "Disponible pronto" : "Retomar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerCurso(c.id)}
                    className={`inline-flex h-11 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
                  >
                    Ver el temario
                    <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ───── Completados ───── */}
      {completadosVisibles.length > 0 && (
        <section aria-label="Cursos completados" className="mt-8">
          <h2 className={`${kicker} text-muted-foreground`}>Completados</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {completadosVisibles.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-muted px-5 py-4"
              >
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
                >
                  <Check className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 basis-[240px]">
                  <p className="text-[15px] font-bold leading-snug">{c.titulo}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {c.completadoEn} ·{" "}
                    <span className={mono}>
                      {c.horasAcreditadas} h
                    </span>{" "}
                    acreditadas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onVerCurso(c.id)}
                  className={`inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
                >
                  Ver el curso
                  <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

/**
 * Detalle de un caso de la Biblioteca — Campus Virtual · Médica Capacitación (LXP)
 *
 * Material de estudio: el diagnóstico SÍ se revela, después de los hallazgos.
 * Orden pedagógico: visor → viñeta → hallazgos → diagnóstico confirmado → puntos clave.
 * "Practicar con este caso" es el gancho al simulador (oculta el diagnóstico).
 *
 * Vive dentro del shell. Stubs: onPracticar · onGuardar · onVerDiscusion · onAbrirRelacionado
 */

import { useState } from "react";
import { Bookmark, Check, ChevronLeft, MonitorPlay } from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

export type Pieza = { etiqueta: string; loop?: boolean };

export type CasoDetalle = {
  id: string;
  folio: string;
  titulo: string;
  area: string;
  dificultad: "Básico" | "Intermedio" | "Avanzado";
  validadoPor: string;
  archivado: string;
  estudios: number;
  piezas: Pieza[];
  adquisicion: string[];
  vineta: string;
  hallazgos: { titulo: string; detalle: string }[];
  diagnostico: string;
  confirmacion: string;
  puntosClave: string[];
  ficha: [string, string][];
  etiquetas: string[];
  relacionados: { id: string; titulo: string; meta: string }[];
};

const MOCK: CasoDetalle = {
  id: "c0412",
  folio: "0412",
  titulo: "Hidronefrosis grado III por litiasis ureteral",
  area: "Renal",
  dificultad: "Intermedio",
  validadoPor: "Dra. Karla Lugo",
  archivado: "marzo",
  estudios: 412,
  piezas: [
    { etiqueta: "longitudinal derecho", loop: true },
    { etiqueta: "transversal derecho" },
    { etiqueta: "riñón izquierdo" },
    { etiqueta: "vejiga · jet ureteral", loop: true },
    { etiqueta: "uréter distal" },
    { etiqueta: "doppler espectral" },
  ],
  adquisicion: ["C 8.5 MHz · Prof. 14 cm", "Gan. 62 · TIS 0.4"],
  vineta:
    "Mujer de 46 años que acude por dolor lumbar derecho de tres días, tipo cólico, con náusea. Sin fiebre. Creatinina normal y examen general de orina con microhematuria. Se solicita ultrasonido renal y de vías urinarias.",
  hallazgos: [
    {
      titulo: "Dilatación pielocalicial derecha",
      detalle:
        "Cálices mayores y menores redondeados que comunican con la pelvis, sin deformar el contorno renal.",
    },
    {
      titulo: "Cortical conservada",
      detalle: "Espesor de 14 mm en ambos polos, medido en el mismo plano.",
    },
    {
      titulo: "Jet ureteral ausente del lado derecho",
      detalle: "Sin emisión en dos observaciones de cinco minutos con vejiga en repleción media.",
    },
    {
      titulo: "Imagen ecogénica en uréter distal",
      detalle: "De 6 mm, con sombra acústica posterior y centelleo en Doppler color.",
    },
  ],
  diagnostico: "Hidronefrosis grado III derecha por litiasis ureteral distal obstructiva",
  confirmacion:
    "Confirmado por urotomografía y resuelto con colocación de catéter doble J. Validado por la Dra. Karla Lugo.",
  puntosClave: [
    "Mida la cortical en los dos polos y en el mismo plano: un solo corte confunde el ángulo con adelgazamiento.",
    "El jet ureteral ausente de forma sostenida apoya obstrucción funcional aun sin ver el lito.",
    "El centelleo en Doppler color ayuda a confirmar la litiasis cuando la sombra acústica es dudosa.",
    "Reporte grado, lado, causa visible y espesor cortical: en ese orden.",
  ],
  ficha: [
    ["Órgano", "Riñón y vía urinaria"],
    ["Patología", "Litiasis obstructiva"],
    ["Dominio I-AIM", "Interpretación"],
    ["Técnica", "Modo B y Doppler color"],
    ["Equipo", "Convexo 3.5–5 MHz"],
    ["Docente", "Dra. Karla Lugo"],
  ],
  etiquetas: ["#litiasis", "#jet-ureteral", "#hidronefrosis", "#doppler"],
  relacionados: [
    { id: "c0121", titulo: "Hidronefrosis grado I: el límite con lo normal", meta: "Renal · Básico" },
    { id: "c0209", titulo: "Quiste parapiélico: la trampa clásica", meta: "Renal · Intermedio" },
    { id: "c0317", titulo: "Obstrucción sin litiasis visible", meta: "Vías urinarias · Avanzado" },
  ],
};


const rayas =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

export default function CasoBiblioteca({ caso = MOCK }: { caso?: CasoDetalle }) {
  const [pieza, setPieza] = useState(0);
  const [guardado, setGuardado] = useState(true);

  const onPracticar = (_id: string) => {};
  const onVerDiscusion = (_id: string) => {};
  const onAbrirRelacionado = (_id: string) => {};

  const actual = caso.piezas[pieza];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Volver a la biblioteca
      </button>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_396px]">
        {/* ══════════ Estudio ══════════ */}
        <div className="min-w-0">
          <div className={`${card} overflow-hidden`}>
            <div
              aria-hidden
              className="relative grid h-[280px] place-items-center sm:h-[430px]"
              style={{ background: "var(--wave-0)" }}
            >
              <div className="absolute inset-0" style={{ background: rayas }} />
              <span
                className={`relative ${mono} px-4 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                style={{ color: "var(--hero-ink-muted)" }}
              >
                visor DICOM · {actual.etiqueta}
              </span>
              {actual.loop && (
                <span
                  className={`absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${mono}`}
                  style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
                >
                  cine-loop · 38 cuadros
                </span>
              )}
              <span
                className={`absolute bottom-3.5 left-3.5 ${mono} text-[10px] leading-[1.7]`}
                style={{ color: "var(--hero-ink-muted)" }}
              >
                {caso.adquisicion.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
              <span className="absolute bottom-3.5 right-3.5 flex gap-1.5">
                {["medir", "ganancia", "zoom"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: "rgba(255,255,255,.14)", color: "var(--hero-ink)" }}
                  >
                    {t}
                  </span>
                ))}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-border p-3.5">
              {caso.piezas.map((p, i) => (
                <button
                  key={p.etiqueta}
                  type="button"
                  onClick={() => setPieza(i)}
                  aria-current={i === pieza}
                  className={`relative grid h-16 w-[92px] shrink-0 place-items-center overflow-hidden rounded-[9px] border-2 ${focusRing} ${
                    i === pieza ? "border-primary" : "border-transparent"
                  }`}
                  style={{ background: "var(--wave-0)" }}
                >
                  <span aria-hidden className="absolute inset-0" style={{ background: rayas }} />
                  <span
                    className={`relative ${mono} px-1 text-center text-[7.5px] uppercase tracking-[0.1em]`}
                    style={{ color: "var(--hero-ink-muted)" }}
                  >
                    {p.etiqueta}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <section className={`${card} p-6`}>
              <p className={`${kicker} text-muted-foreground`}>Viñeta clínica</p>
              <p className={`mt-3 max-w-[70ch] text-[15px] leading-[1.75] ${softText}`}>
                {caso.vineta}
              </p>
            </section>

            <section className={`${card} p-6`}>
              <p className={`${kicker} text-muted-foreground`}>Hallazgos</p>
              <ul className="mt-3.5 flex max-w-[70ch] flex-col gap-3">
                {caso.hallazgos.map((h) => (
                  <li key={h.titulo} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
                    >
                      <Check className="h-[13px] w-[13px]" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-bold leading-snug">{h.titulo}</span>
                      <span className={`mt-0.5 block text-[14px] leading-relaxed ${softText}`}>
                        {h.detalle}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* la respuesta: es material de estudio, se revela */}
            <section
              className="relative overflow-hidden rounded-xl p-6"
              style={{ background: "var(--sidebar)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.55) 0%, rgba(15,45,82,0) 62%)",
                }}
              />
              <div className="relative">
                <p className={`${kicker} text-primary`}>Diagnóstico confirmado</p>
                <p
                  className="mt-3 max-w-[56ch] text-[22px] font-extrabold leading-snug tracking-[-0.02em]"
                  style={{ color: "var(--hero-ink)" }}
                >
                  {caso.diagnostico}
                </p>
                <p
                  className="mt-3 max-w-[64ch] text-[14.5px] leading-relaxed"
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  {caso.confirmacion}
                </p>
              </div>
            </section>

            <section className={`${card} p-6`}>
              <p className={`${kicker} text-muted-foreground`}>Puntos clave de aprendizaje</p>
              <ol className="mt-3.5 flex max-w-[70ch] flex-col gap-2.5">
                {caso.puntosClave.map((p, i) => (
                  <li key={p} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground ${mono}`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[14px] leading-relaxed ${softText}`}>{p}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        {/* ══════════ Ficha y acciones ══════════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                {caso.area}
              </span>
              <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold text-[color:var(--foreground-soft)]">
                {caso.dificultad}
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-sidebar px-2.5 text-[11.5px] font-bold text-sidebar-foreground">
                <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                Validado
              </span>
            </div>
            <h1
              className="mt-3.5 text-[24px] font-extrabold leading-tight tracking-[-0.02em]"
              style={{ textWrap: "pretty" }}
            >
              {caso.titulo}
            </h1>
            <p className={`${mono} mt-2.5 text-[12.5px] text-muted-foreground`}>
              Caso {caso.folio} · archivado en {caso.archivado} · {caso.estudios} estudios
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onPracticar(caso.id)}
                className={`inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                <MonitorPlay aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Practicar con este caso
              </button>
              <button
                type="button"
                onClick={() => setGuardado((v) => !v)}
                aria-pressed={guardado}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border text-[13.5px] font-semibold transition-colors ${focusRing} ${
                  guardado
                    ? "border-transparent bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Bookmark
                  aria-hidden
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  fill={guardado ? "currentColor" : "none"}
                />
                {guardado ? "Guardado para estudio" : "Guardar para estudio"}
              </button>
            </div>
            <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Practicar oculta el diagnóstico y le pide interpretar el loop antes de revelarlo.
            </p>
          </section>

          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Ficha del caso</p>
            <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
              {caso.ficha.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[13px] text-muted-foreground">{k}</dt>
                  <dd className="text-[13.5px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-5">
              {caso.etiquetas.map((t) => (
                <span
                  key={t}
                  className={`inline-flex h-7 items-center rounded-full bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
                >
                  {t}
                </span>
              ))}
            </div>
          </section>

          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Casos relacionados</p>
            <ul className="mt-3.5 flex flex-col gap-3">
              {caso.relacionados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirRelacionado(r.id)}
                    className={`flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg"
                      style={{ background: "var(--wave-0)" }}
                    >
                      <span className="absolute inset-0" style={{ background: rayas }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold leading-snug">{r.titulo}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                        {r.meta}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl bg-accent p-5">
            <p className={`text-[13.5px] leading-relaxed ${softText}`}>
              Este caso nació en el Ateneo.{" "}
              <button
                type="button"
                onClick={() => onVerDiscusion(caso.id)}
                className={`font-semibold text-secondary underline-offset-2 hover:underline ${focusRing}`}
              >
                Ver la discusión original
              </button>{" "}
              y cómo se llegó al diagnóstico.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

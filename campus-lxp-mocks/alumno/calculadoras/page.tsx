"use client";

/**
 * Calculadoras · herramientas de cálculo clínico — Campus Virtual · Médica Capacitación
 *
 * Patrón común: medidas → fórmula → resultado destacado + interpretación. Se usa a media consulta,
 * así que el resultado es lo más grande de la pantalla y el cálculo ocurre al escribir.
 *
 * Dos vistas en este archivo:
 *   · CatalogoCalculadoras (default) — agrupadas por área, con búsqueda por nombre o siglas
 *   · VistaCalculadora               — entradas + resultado + fórmula + cálculos de la sesión
 *
 * Tres calculadoras REALES implementadas como muestra del patrón:
 *   · elipsoide  V = D1 × D2 × D3 × 0.523
 *   · fpp        Naegele: FUM + 280 días (ajustado al ciclo) + edad gestacional a hoy
 *   · doppler    IR = (VPS − VDF) / VPS   ·   IP = (VPS − VDF) / Vm
 * El resto del catálogo va como tarjetas "Pronto": la fórmula y los RANGOS DE REFERENCIA de cada
 * una se definen aparte (ver <ZonaReferencia>, placeholder declarado).
 *
 * Gancho con Mis reportes: "Insertar en el reporte" está como botón, sin cablear.
 *
 * Stubs: onAbrirCalculadora · onCalcular · onBuscar · onInsertarEnReporte
 */

import { useMemo, useState } from "react";
import {
  Activity,
  Baby,
  Bookmark,
  Calculator,
  CalendarDays,
  ChevronLeft,
  CircleDot,
  FileText,
  Search,
  Stethoscope,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type AreaCalc = "Obstétricas" | "Doppler" | "Abdominal y renal" | "Vascular" | "Generales";
export type CalcId = "elipsoide" | "fpp" | "doppler";

export type ItemCalculadora = {
  id: string;
  nombre: string;
  entrada: string;
  salida: string;
  disponible: boolean;
  /** Sólo las implementadas llevan clave de vista. */
  calc?: CalcId;
  descripcion?: string;
};

export type GrupoCalculadoras = { area: AreaCalc; items: ItemCalculadora[] };

export type CalculadorasData = {
  frecuentes: ItemCalculadora[];
  grupos: GrupoCalculadoras[];
  /** Reporte abierto en Mis reportes, para el gancho de inserción. */
  reporteActivo?: { folio: string; estudio: string; seccion: string };
};

const MOCK: CalculadorasData = {
  frecuentes: [
    {
      id: "f1",
      nombre: "Volumen por elipsoide",
      entrada: "3 medidas",
      salida: "mL",
      disponible: true,
      calc: "elipsoide",
      descripcion: "Riñón, próstata, tiroides o vejiga",
    },
    {
      id: "f2",
      nombre: "Fecha probable de parto",
      entrada: "1 fecha",
      salida: "FPP y SDG",
      disponible: true,
      calc: "fpp",
      descripcion: "Regla de Naegele desde la FUM",
    },
    {
      id: "f3",
      nombre: "Índices Doppler · IR e IP",
      entrada: "3 velocidades",
      salida: "IR · IP",
      disponible: true,
      calc: "doppler",
      descripcion: "Desde VPS, VDF y velocidad media",
    },
    {
      id: "f4",
      nombre: "Volumen residual vesical",
      entrada: "3 medidas",
      salida: "mL",
      disponible: true,
      calc: "elipsoide",
      descripcion: "Antes y después de la micción",
    },
  ],
  grupos: [
    {
      area: "Obstétricas",
      items: [
        { id: "o1", nombre: "Fecha probable de parto", entrada: "FUM", salida: "FPP y SDG", disponible: true, calc: "fpp" },
        { id: "o2", nombre: "Edad gestacional por biometría", entrada: "DBP · CC · CA · LF", salida: "SDG", disponible: false },
        { id: "o3", nombre: "Peso fetal estimado", entrada: "DBP · CC · CA · LF", salida: "gramos", disponible: false },
        { id: "o4", nombre: "Índice de líquido amniótico", entrada: "4 cuadrantes", salida: "ILA", disponible: false },
        { id: "o5", nombre: "Percentil de crecimiento", entrada: "PFE · SDG", salida: "percentil", disponible: false },
        { id: "o6", nombre: "Longitud cervical", entrada: "1 medida", salida: "riesgo", disponible: false },
      ],
    },
    {
      area: "Doppler",
      items: [
        { id: "d1", nombre: "Índices IR e IP", entrada: "VPS · VDF · Vm", salida: "IR · IP", disponible: true, calc: "doppler" },
        { id: "d2", nombre: "Relación sístole/diástole", entrada: "VPS · VDF", salida: "S/D", disponible: false },
        { id: "d3", nombre: "Índice cerebroplacentario", entrada: "IP ACM · IP AU", salida: "ICP", disponible: false },
        { id: "d4", nombre: "Gradiente de presión", entrada: "velocidad máxima", salida: "mmHg", disponible: false },
      ],
    },
    {
      area: "Abdominal y renal",
      items: [
        { id: "a1", nombre: "Volumen por elipsoide", entrada: "D1 · D2 · D3", salida: "mL", disponible: true, calc: "elipsoide" },
        { id: "a2", nombre: "Volumen residual vesical", entrada: "D1 · D2 · D3", salida: "mL", disponible: true, calc: "elipsoide" },
        { id: "a3", nombre: "Índice resistivo renal", entrada: "VPS · VDF", salida: "IR", disponible: false },
        { id: "a4", nombre: "Volumen prostático y PSA", entrada: "volumen · PSA", salida: "densidad", disponible: false },
        { id: "a5", nombre: "Volumen tiroideo", entrada: "por lóbulo", salida: "mL", disponible: false },
        { id: "a6", nombre: "Grado de esteatosis", entrada: "por definir", salida: "grado", disponible: false },
      ],
    },
    {
      area: "Vascular",
      items: [
        { id: "v1", nombre: "Diámetro aórtico", entrada: "1 medida", salida: "riesgo", disponible: false },
        { id: "v2", nombre: "Estenosis carotídea", entrada: "VPS · relación", salida: "%", disponible: false },
        { id: "v3", nombre: "Reflujo venoso", entrada: "tiempo", salida: "segundos", disponible: false },
      ],
    },
    {
      area: "Generales",
      items: [
        { id: "g1", nombre: "Superficie corporal", entrada: "peso · talla", salida: "m²", disponible: false },
        { id: "g2", nombre: "Índice de masa corporal", entrada: "peso · talla", salida: "IMC", disponible: false },
        { id: "g3", nombre: "Conversión de unidades", entrada: "valor", salida: "equivalente", disponible: false },
      ],
    },
  ],
  reporteActivo: { folio: "RPT-0248", estudio: "Ultrasonido abdominal", seccion: "riñones" },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const iconoArea: Record<AreaCalc, typeof Baby> = {
  Obstétricas: Baby,
  Doppler: Activity,
  "Abdominal y renal": CircleDot,
  Vascular: Stethoscope,
  Generales: Calculator,
};

/** Zona reservada: los rangos por órgano/edad/territorio se definen aparte. */
function ZonaReferencia({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <div
      className="rounded-[11px] border-[1.5px] border-dashed p-4"
      style={{
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

/** Campo de medida: alto, con la unidad dentro y cifra en mono. */
function CampoMedida({
  etiqueta,
  unidad,
  valor,
  onChange,
}: {
  etiqueta: string;
  unidad: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold">{etiqueta}</span>
      <span className="mt-[7px] flex h-[52px] items-center gap-2 rounded-[11px] border border-border bg-card px-4 transition-colors focus-within:border-secondary">
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={`${mono} w-full bg-transparent text-[18px] font-semibold text-foreground outline-none`}
        />
        <span className={`${mono} shrink-0 text-[12.5px] font-medium text-muted-foreground`}>
          {unidad}
        </span>
      </span>
    </label>
  );
}

/** Bloque de resultado: lo más grande de la pantalla. */
function Resultado({
  rotulo,
  valor,
  unidad,
  operacion,
  titulo,
  detalle,
}: {
  rotulo: string;
  valor: string;
  unidad?: string;
  operacion?: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl p-7" style={{ background: "var(--secondary)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)",
        }}
      />
      <div className="relative flex flex-wrap items-start gap-7">
        <div className="min-w-0">
          <p className={kicker} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
            {rotulo}
          </p>
          <div className="mt-3 flex items-end gap-2.5">
            <span
              className={`${mono} text-[54px] font-extrabold leading-none tracking-[-0.03em]`}
              style={{ color: "var(--hero-ink)" }}
            >
              {valor}
            </span>
            {unidad && (
              <span
                className={`${mono} pb-1.5 text-[18px] font-semibold`}
                style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
              >
                {unidad}
              </span>
            )}
          </div>
          {operacion && (
            <p className={`${mono} mt-3.5 text-[13px]`} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
              {operacion}
            </p>
          )}
        </div>
        <div
          className="min-w-[260px] flex-1 pl-7"
          style={{ borderLeft: "1px solid rgba(255,255,255,.22)" }}
        >
          <p className={kicker} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
            Interpretación
          </p>
          <p
            className="mt-2.5 text-[16px] font-bold leading-relaxed"
            style={{ color: "var(--hero-ink)" }}
          >
            {titulo}
          </p>
          <p
            className="mt-2 text-[13.5px] leading-relaxed"
            style={{ color: "var(--hero-ink-soft, #eafaf9)" }}
          >
            {detalle}
          </p>
        </div>
      </div>
    </section>
  );
}

function BotonInsertar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] border bg-card text-[13.5px] font-bold text-secondary transition-colors hover:bg-accent ${focusRing}`}
      style={{ borderColor: "color-mix(in oklab, var(--secondary) 35%, white)" }}
    >
      <FileText aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
      Insertar en el reporte
    </button>
  );
}

/* ═══════════════════════ VISTA DE CALCULADORA ═══════════════════════ */

const num = (v: string) => {
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function VistaCalculadora({
  calc,
  reporteActivo,
  onVolver,
}: {
  calc: CalcId;
  reporteActivo?: CalculadorasData["reporteActivo"];
  onVolver?: () => void;
}) {
  /* ── Stubs ─────────────────────────────────────────────── */
  const onCalcular = () => {};
  const onInsertarEnReporte = () => {};
  /* ──────────────────────────────────────────────────────── */

  /* elipsoide */
  const [organo, setOrgano] = useState("Riñón");
  const [d1, setD1] = useState("10.8");
  const [d2, setD2] = useState("4.6");
  const [d3, setD3] = useState("4.2");
  /* fpp */
  const [fum, setFum] = useState("2026-02-12");
  const [ciclo, setCiclo] = useState("28");
  /* doppler */
  const [vps, setVps] = useState("48");
  const [vdf, setVdf] = useState("16");
  const [vm, setVm] = useState("28");

  const sesion = [
    { n: "Riñón derecho", v: "109.1 mL", m: "10.8 × 4.6 × 4.2" },
    { n: "Riñón izquierdo", v: "118.4 mL", m: "11.2 × 4.8 × 4.2" },
    { n: "Vejiga posmicción", v: "38.6 mL", m: "5.4 × 4.1 × 3.3" },
  ];

  /* ── cálculo: ocurre al escribir ── */
  const volumen = useMemo(() => {
    const [a, b, c] = [num(d1), num(d2), num(d3)];
    if (a === null || b === null || c === null) return null;
    return a * b * c * 0.523;
  }, [d1, d2, d3]);

  const gesta = useMemo(() => {
    const base = new Date(fum);
    if (Number.isNaN(base.getTime())) return null;
    const ajuste = (num(ciclo) ?? 28) - 28;
    const fpp = new Date(base.getTime() + (280 + ajuste) * 86400000);
    const hoy = new Date();
    const dias = Math.floor((hoy.getTime() - base.getTime()) / 86400000);
    return {
      fpp: fpp.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      sdg: `${Math.floor(dias / 7)}.${dias % 7}`,
      termino: dias >= 259 && dias < 273,
    };
  }, [fum, ciclo]);

  const indices = useMemo(() => {
    const [s, d, m] = [num(vps), num(vdf), num(vm)];
    if (s === null || d === null || !s) return null;
    return { ir: (s - d) / s, ip: m ? (s - d) / m : null };
  }, [vps, vdf, vm]);

  const titulos: Record<CalcId, { area: AreaCalc; nombre: string }> = {
    elipsoide: { area: "Abdominal y renal", nombre: "Volumen por elipsoide" },
    fpp: { area: "Obstétricas", nombre: "Fecha probable de parto" },
    doppler: { area: "Doppler", nombre: "Índices Doppler · IR e IP" },
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver al catálogo"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <p className={`${kicker} text-secondary`}>{titulos[calc].area}</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
            {titulos[calc].nombre}
          </h1>
        </div>
        <button
          type="button"
          className={`ml-auto inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Guardar en mis favoritas
        </button>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ── entradas ── */}
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>
                {calc === "fpp" ? "Datos" : "Medidas"}
              </p>
              {calc === "elipsoide" && (
                <div className="ml-auto flex gap-1.5 rounded-full bg-muted p-1">
                  {["Riñón", "Próstata", "Tiroides", "Vejiga"].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOrgano(o)}
                      aria-pressed={organo === o}
                      className={`h-9 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                        organo === o
                          ? "bg-sidebar text-sidebar-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {calc === "elipsoide" && (
              <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
                <CampoMedida etiqueta="Longitud (D1)" unidad="cm" valor={d1} onChange={setD1} />
                <CampoMedida etiqueta="Ancho (D2)" unidad="cm" valor={d2} onChange={setD2} />
                <CampoMedida etiqueta="Espesor (D3)" unidad="cm" valor={d3} onChange={setD3} />
              </div>
            )}

            {calc === "fpp" && (
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-[11.5px] font-semibold">
                    Fecha de última menstruación
                  </span>
                  <span className="mt-[7px] flex h-[52px] items-center gap-2 rounded-[11px] border border-border bg-card px-4 transition-colors focus-within:border-secondary">
                    <input
                      type="date"
                      value={fum}
                      onChange={(e) => setFum(e.target.value)}
                      className={`${mono} w-full bg-transparent text-[16px] font-semibold text-foreground outline-none`}
                    />
                    <CalendarDays aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  </span>
                </label>
                <CampoMedida etiqueta="Duración del ciclo" unidad="días" valor={ciclo} onChange={setCiclo} />
              </div>
            )}

            {calc === "doppler" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <CampoMedida etiqueta="VPS" unidad="cm/s" valor={vps} onChange={setVps} />
                <CampoMedida etiqueta="VDF" unidad="cm/s" valor={vdf} onChange={setVdf} />
                <CampoMedida etiqueta="V media" unidad="cm/s" valor={vm} onChange={setVm} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onCalcular}
                className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                <Calculator aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                Calcular
              </button>
              <button
                type="button"
                onClick={() => {
                  setD1("");
                  setD2("");
                  setD3("");
                }}
                className={`h-11 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Limpiar
              </button>
              <span className="ml-auto text-[12.5px] text-muted-foreground">
                Calcula al escribir; el botón es por si prefiere confirmar.
              </span>
            </div>
          </section>

          {/* ── resultado ── */}
          {calc === "elipsoide" && volumen !== null && (
            <Resultado
              rotulo={`Volumen · ${organo.toLowerCase()}`}
              valor={volumen.toFixed(1)}
              unidad="mL"
              operacion={`${d1} × ${d2} × ${d3} × 0.523`}
              titulo="Dentro del rango esperado para un adulto."
              detalle="Referencia de ejemplo: 90 a 160 mL. El rango definitivo por edad y sexo se define aparte."
            />
          )}

          {calc === "fpp" && gesta && (
            <Resultado
              rotulo="Fecha probable de parto"
              valor={gesta.fpp}
              operacion={`FUM + ${280 + ((num(ciclo) ?? 28) - 28)} días`}
              titulo={`Edad gestacional hoy: ${gesta.sdg} SDG`}
              detalle={
                gesta.termino
                  ? "Embarazo de término temprano."
                  : "La clasificación por semanas se define aparte."
              }
            />
          )}

          {calc === "doppler" && indices && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Índice de resistencia (IR)", indices.ir.toFixed(2), "(VPS − VDF) / VPS"],
                [
                  "Índice de pulsatilidad (IP)",
                  indices.ip === null ? "—" : indices.ip.toFixed(2),
                  "(VPS − VDF) / Vm",
                ],
              ].map(([rotulo, valor, formula]) => (
                <div
                  key={rotulo}
                  className="relative overflow-hidden rounded-2xl p-5"
                  style={{ background: "var(--secondary)" }}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.5) 0%, rgba(26,136,128,0) 62%)",
                    }}
                  />
                  <div className="relative">
                    <p className={kicker} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
                      {rotulo}
                    </p>
                    <p
                      className={`${mono} mt-2.5 text-[36px] font-extrabold leading-none tracking-[-0.03em]`}
                      style={{ color: "var(--hero-ink)" }}
                    >
                      {valor}
                    </p>
                    <p
                      className={`${mono} mt-2.5 text-[11.5px]`}
                      style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
                    >
                      {formula}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── fórmula y referencia ── */}
          <div className="grid gap-5 sm:grid-cols-2">
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Fórmula</p>
              <p className={`${mono} mt-3 text-[15px] font-semibold leading-[1.7]`}>
                {calc === "elipsoide"
                  ? "V = D1 × D2 × D3 × 0.523"
                  : calc === "fpp"
                    ? "FPP = FUM + 280 días ± ciclo"
                    : "IR = (VPS − VDF) / VPS"}
              </p>
              <p className={`mt-2.5 text-[13px] leading-relaxed ${softText}`}>
                {calc === "elipsoide"
                  ? "Aproximación elipsoidal. Mida los tres ejes en el mismo estudio y en planos perpendiculares."
                  : calc === "fpp"
                    ? "Regla de Naegele. Si el ciclo no es de 28 días, la fecha se ajusta por la diferencia."
                    : "La interpretación depende del vaso y, en obstetricia, de la edad gestacional."}
              </p>
            </section>
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Rangos de referencia</p>
              <div className="mt-3">
                <ZonaReferencia
                  titulo="Tabla de referencia"
                  nota="Aquí van los rangos por órgano, edad, sexo o territorio vascular, con su fuente. Se define aparte."
                />
              </div>
            </section>
          </div>
        </div>

        {/* ── rail: gancho al reporte y sesión ── */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Llevarlo al reporte</p>
            {reporteActivo ? (
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                Está escribiendo{" "}
                <span className={`${mono} font-semibold text-foreground`}>
                  {reporteActivo.folio}
                </span>{" "}
                · {reporteActivo.estudio}. El resultado entra en la sección de{" "}
                {reporteActivo.seccion} con su fórmula.
              </p>
            ) : (
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                Abra un reporte en Mis reportes y el resultado podrá insertarse en la sección que
                corresponda.
              </p>
            )}
            <div className="mt-3.5">
              <BotonInsertar onClick={onInsertarEnReporte} />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Cálculos de esta sesión</p>
            <ul className="mt-3 flex flex-col">
              {sesion.map((s, i) => (
                <li
                  key={s.n}
                  className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-border" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug">{s.n}</span>
                    <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                      {s.m}
                    </span>
                  </span>
                  <span className={`${mono} text-[13.5px] font-bold text-secondary`}>{s.v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              Se quedan aquí mientras dura la sesión; no se guardan con datos del paciente.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════ CATÁLOGO ═══════════════════════════ */

export default function CatalogoCalculadoras({ data = MOCK }: { data?: CalculadorasData }) {
  const { frecuentes, grupos, reporteActivo } = data;
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<CalcId | null>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onBuscar = (t: string) => setBusqueda(t);
  const onAbrirCalculadora = (it: ItemCalculadora) =>
    it.calc ? setAbierta(it.calc) : undefined;
  /* ──────────────────────────────────────────────────────── */

  if (abierta) {
    return (
      <VistaCalculadora
        calc={abierta}
        reporteActivo={reporteActivo}
        onVolver={() => setAbierta(null)}
      />
    );
  }

  const q = busqueda.trim().toLowerCase();
  const filtrados = grupos
    .map((g) => ({
      ...g,
      items: q
        ? g.items.filter((i) =>
            [i.nombre, i.entrada, i.salida].join(" ").toLowerCase().includes(q),
          )
        : g.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="ml-auto flex h-[52px] min-w-[300px] items-center gap-2.5 rounded-full border border-border bg-card px-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar calculadora</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Busque por nombre, medida o siglas (DBP, IR, FPP…)"
            className="w-full bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* las que más usa */}
      {!q && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Las que más usa</p>
            <span className="text-[12px] text-muted-foreground">
              aparecen aquí solas, por uso reciente
            </span>
          </div>
          <ul className="mt-3.5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {frecuentes.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onAbrirCalculadora(it)}
                  className={`flex h-full w-full flex-col items-start rounded-xl border border-border bg-card p-5 text-left shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-full bg-sidebar text-primary"
                  >
                    <Calculator className="h-[21px] w-[21px]" strokeWidth={1.75} />
                  </span>
                  <span className="mt-3.5 text-[15.5px] font-bold leading-snug">{it.nombre}</span>
                  {it.descripcion && (
                    <span className={`mt-1.5 text-[12.5px] leading-snug ${softText}`}>
                      {it.descripcion}
                    </span>
                  )}
                  <span className={`${mono} mt-3 text-[11.5px] text-muted-foreground`}>
                    {it.entrada}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* grupos por área */}
      <div className="mt-8 flex flex-col gap-7">
        {filtrados.map((g) => {
          const Icono = iconoArea[g.area];
          return (
            <section key={g.area}>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
                >
                  <Icono className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="text-[16px] font-bold tracking-[-0.01em]">{g.area}</h2>
                <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                  {g.items.length}
                </span>
              </div>
              <ul className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirCalculadora(it)}
                      aria-disabled={!it.disponible}
                      className={`flex h-full w-full flex-col items-start rounded-xl border border-border bg-card p-4 text-left shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors ${focusRing} ${
                        it.disponible ? "hover:border-primary hover:bg-accent" : "hover:bg-muted"
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        <span className="text-[14.5px] font-bold leading-snug">{it.nombre}</span>
                        {!it.disponible && (
                          <span className="ml-auto inline-flex h-[22px] shrink-0 items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-muted-foreground">
                            Pronto
                          </span>
                        )}
                      </span>
                      <span className={`${mono} mt-2 text-[11.5px] text-muted-foreground`}>
                        {it.entrada} → {it.salida}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className={`mt-7 max-w-[74ch] text-[12.5px] leading-relaxed text-muted-foreground`}>
        Las calculadoras marcadas como <span className="font-semibold text-foreground">Pronto</span>{" "}
        ya tienen su tarjeta y su lugar en el catálogo; la fórmula y los rangos de referencia de cada
        una se definen aparte.
      </p>
    </div>
  );
}

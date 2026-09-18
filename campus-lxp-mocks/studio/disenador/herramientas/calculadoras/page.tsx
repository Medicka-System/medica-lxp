"use client";

/**
 * Studio · Herramientas → CALCULADORAS
 *
 * Las calculadoras clínicas del campus: entradas con unidad → fórmula → rangos de interpretación.
 * La prueba rápida resuelve en vivo para no publicar a ciegas.
 *
 * La fórmula real y los valores de referencia se definen aparte: van como placeholder editable.
 *
 * Stubs: onCrear · onAbrir · onGuardar · onPublicar · onFiltrar · onProbar
 */

import { useMemo, useState } from "react";
import {
  Calculator,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import {
  BarraListado,
  CampoTexto,
  ChipEstado,
  ChipNeutro,
  ChipPlaceholder,
  ChipUso,
  ChipsSelector,
  CONTEOS,
  card,
  FilaGrupo,
  FilaHerramienta,
  FranjaContexto,
  focusRing,
  HeaderEditor,
  kicker,
  mono,
  softText,
  SubNavHerramientas,
  TablaHerramienta,
  VacioHerramienta,
  type EstadoHerramienta,
} from "../_patron";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EntradaCalculadora = {
  id: string;
  /** identificador usable en la fórmula */
  clave: string;
  etiqueta: string;
  unidad: string;
  valido: string;
};

export type RangoInterpretacion = {
  id: string;
  etiqueta: string;
  condicion: string;
  tono: "normal" | "atencion";
  interpretacion: string;
};

export type CalculadoraResumen = {
  id: string;
  nombre: string;
  resumen: string;
  area: string;
  estado: EstadoHerramienta;
  calculos: number;
  ultimaEdicion: string;
};

export type CalculadoraDetalle = {
  id: string;
  nombre: string;
  area: string;
  estado: EstadoHerramienta;
  guardado: string;
  unidadResultado: string;
  paraQue: string;
  notaPie: string;
  calculos: number;
  grupos: number;
  /** la fórmula real es placeholder: se define aparte */
  formula: string;
  entradas: EntradaCalculadora[];
  rangos: RangoInterpretacion[];
  prueba: { valores: Record<string, string>; resultado: string };
};

export type CalculadorasData = {
  calculadoras: CalculadoraResumen[];
  detalle: CalculadoraDetalle;
};

const AREAS = ["Abdominal", "Obstétrico", "Doppler", "Tiroideo", "MSK"];

const MOCK: CalculadorasData = {
  calculadoras: [
    { id: "k1", nombre: "Volumen por elipsoide", resumen: "Largo × ancho × alto × 0.523", area: "Abdominal", estado: "publicada", calculos: 1240, ultimaEdicion: "hace 2 días" },
    { id: "k2", nombre: "Volumen vesical y residuo posmiccional", resumen: "3 medidas · mL", area: "Abdominal", estado: "publicada", calculos: 860, ultimaEdicion: "hace 3 días" },
    { id: "k3", nombre: "Índice de resistencia renal", resumen: "IR = (VPS − VDF) / VPS", area: "Abdominal", estado: "publicada", calculos: 412, ultimaEdicion: "hace 4 días" },
    { id: "k4", nombre: "Edad gestacional por biometría", resumen: "DBP · CC · CA · LF", area: "Obstétrico", estado: "publicada", calculos: 1580, ultimaEdicion: "hace 2 días" },
    { id: "k5", nombre: "Peso fetal estimado (Hadlock)", resumen: "4 medidas · gramos", area: "Obstétrico", estado: "publicada", calculos: 940, ultimaEdicion: "hace 3 días" },
    { id: "k6", nombre: "Índice de líquido amniótico", resumen: "4 cuadrantes · cm", area: "Obstétrico", estado: "borrador", calculos: 0, ultimaEdicion: "sin publicar" },
    { id: "k7", nombre: "Índice de pulsatilidad", resumen: "IP = (VPS − VDF) / Vmedia", area: "Doppler", estado: "publicada", calculos: 388, ultimaEdicion: "hace 2 días" },
    { id: "k8", nombre: "Relación cerebro-placentaria", resumen: "IP ACM / IP AU", area: "Doppler", estado: "borrador", calculos: 0, ultimaEdicion: "sin publicar" },
    { id: "k9", nombre: "Volumen tiroideo total", resumen: "Dos lóbulos · elipsoide", area: "Tiroideo", estado: "publicada", calculos: 204, ultimaEdicion: "hace 2 días" },
  ],
  detalle: {
    id: "k1",
    nombre: "Volumen por elipsoide",
    area: "Abdominal",
    estado: "publicada",
    guardado: "hace 18 s",
    unidadResultado: "mL",
    paraQue: "Estima el volumen de un órgano o lesión a partir de sus tres diámetros.",
    notaPie: "Referencia bibliográfica por definir",
    calculos: 1240,
    grupos: 6,
    formula: "volumen = largo * ancho * alto * 0.523 / 1000",
    entradas: [
      { id: "e1", clave: "largo", etiqueta: "Longitud", unidad: "mm", valido: "20 – 250" },
      { id: "e2", clave: "ancho", etiqueta: "Ancho", unidad: "mm", valido: "10 – 200" },
      { id: "e3", clave: "alto", etiqueta: "Alto (AP)", unidad: "mm", valido: "10 – 200" },
    ],
    rangos: [
      { id: "r1", etiqueta: "Normal", condicion: "< 15 mL", tono: "normal", interpretacion: "Volumen dentro de lo esperado para el órgano medido." },
      { id: "r2", etiqueta: "Límite alto", condicion: "15 – 25 mL", tono: "atencion", interpretacion: "Correlacione con clínica y compare con el lado contralateral." },
      { id: "r3", etiqueta: "Aumentado", condicion: "> 25 mL", tono: "atencion", interpretacion: "Describa morfología y sugiera control en el informe." },
    ],
    prueba: { valores: { largo: "104", ancho: "48", alto: "42" }, resultado: "109.7" },
  },
};

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Calculadoras({
  data = MOCK,
  modo = "lista",
}: {
  data?: CalculadorasData;
  modo?: "lista" | "editor";
}) {
  const { calculadoras, detalle } = data;
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("Todas");
  const [area, setArea] = useState("Toda área");
  const [formula, setFormula] = useState(detalle.formula);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onCrear = () => {};
  const onAbrir = (_id: string) => {};
  const onGuardar = () => {};
  const onPublicar = () => {};
  const onFiltrar = (grupo: string, valor: string) =>
    grupo === "estado" ? setEstado(valor) : setArea(valor);
  const onProbar = () => {};
  const onAgregarEntrada = () => {};
  const onAgregarRango = () => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos = useMemo(
    () => ({
      todas: calculadoras.length,
      publicadas: calculadoras.filter((c) => c.estado === "publicada").length,
      borradores: calculadoras.filter((c) => c.estado === "borrador").length,
    }),
    [calculadoras],
  );

  const visibles = useMemo(
    () =>
      calculadoras.filter(
        (c) =>
          (estado === "Todas" ||
            (estado === "Publicadas" ? c.estado === "publicada" : c.estado === "borrador")) &&
          (area === "Toda área" || c.area === area) &&
          (!busca.trim() || c.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [calculadoras, estado, area, busca],
  );

  /** agrupadas por área clínica: es como las busca el diseñador */
  const porArea = useMemo(() => {
    const mapa = new Map<string, CalculadoraResumen[]>();
    visibles.forEach((c) => mapa.set(c.area, [...(mapa.get(c.area) ?? []), c]));
    return [...mapa.entries()];
  }, [visibles]);

  /* ══════════ EDITOR ══════════ */
  if (modo === "editor") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <HeaderEditor
          ruta="Calculadoras"
          nombre={detalle.nombre}
          estado={detalle.estado}
          guardado={detalle.guardado}
          onVistaPrevia={() => {}}
          onGuardar={onGuardar}
          onPublicar={onPublicar}
        />
        <FranjaContexto
          items={[
            ["Área", detalle.area],
            ["Entradas", String(detalle.entradas.length)],
            ["Rangos", String(detalle.rangos.length)],
            ["Cálculos hechos", detalle.calculos.toLocaleString("es-MX")],
            ["Usada en", `${detalle.grupos} grupos`],
          ]}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_316px]">
            <div className="min-w-0">
              {/* entradas */}
              <section className={`${card} p-5`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className={`${kicker} text-muted-foreground`}>
                    Entradas · medidas que captura el médico
                  </p>
                  <button
                    type="button"
                    onClick={onAgregarEntrada}
                    className={`ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Entrada
                  </button>
                </div>
                <ul className="mt-3.5 flex flex-col gap-2">
                  {detalle.entradas.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary"
                    >
                      <span aria-hidden className="shrink-0 cursor-grab text-[color:var(--track)]">
                        <GripVertical className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span
                        className={`${mono} shrink-0 rounded-[6px] border border-border bg-muted px-1.5 py-0.5 text-[11.5px] font-bold text-secondary`}
                      >
                        {e.clave}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{e.etiqueta}</span>
                      <span
                        className={`${mono} inline-flex h-[30px] shrink-0 items-center rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-bold ${softText}`}
                      >
                        {e.unidad}
                      </span>
                      <span className={`${mono} shrink-0 whitespace-nowrap text-[11.5px] text-muted-foreground`}>
                        válido {e.valido}
                      </span>
                      <span className="flex shrink-0 gap-0.5">
                        {[
                          { label: "Editar", icono: Pencil },
                          { label: "Eliminar", icono: Trash2 },
                        ].map(({ label, icono: I }) => (
                          <button
                            key={label}
                            type="button"
                            aria-label={`${label}: ${e.etiqueta}`}
                            className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                          >
                            <I aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* fórmula + prueba rápida */}
              <section className={`${card} mt-4 p-5`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 place-items-center rounded-lg border border-border bg-muted ${softText}`}
                  >
                    <Sigma className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <p className={`${kicker} text-muted-foreground`}>Fórmula</p>
                  <ChipPlaceholder>Fórmula real por definir</ChipPlaceholder>
                </div>
                <textarea
                  rows={2}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  className={`${mono} mt-3 w-full resize-none rounded-[10px] border border-border bg-muted px-3.5 py-3 text-[14px] font-semibold leading-relaxed text-foreground outline-none transition-colors focus:border-secondary`}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span className="text-[12px] text-muted-foreground">
                    Use los identificadores de las entradas:
                  </span>
                  {detalle.entradas.map((e) => (
                    <span
                      key={e.id}
                      className={`${mono} inline-flex h-[26px] items-center rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground`}
                    >
                      {e.clave}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-[11px] bg-muted p-4">
                  <span className="min-w-[220px] flex-1">
                    <span className={`${kicker} block text-muted-foreground`}>Prueba rápida</span>
                    <span className="mt-2 flex flex-wrap gap-2">
                      {detalle.entradas.map((e) => (
                        <span
                          key={e.id}
                          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border bg-card px-2.5"
                        >
                          <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>
                            {e.clave}
                          </span>
                          <span className={`${mono} text-[13px] font-bold`}>
                            {detalle.prueba.valores[e.clave]}
                          </span>
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`${kicker} block text-muted-foreground`}>Resultado</span>
                    <span className={`${mono} mt-1.5 block text-[24px] font-extrabold`}>
                      {detalle.prueba.resultado}{" "}
                      <span className="text-[14px] text-muted-foreground">
                        {detalle.unidadResultado}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={onProbar}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    <Play aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Probar
                  </button>
                </div>
              </section>

              {/* rangos de interpretación */}
              <section className={`${card} mt-4 p-5`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className={`${kicker} text-muted-foreground`}>
                    Rangos de referencia e interpretación
                  </p>
                  <ChipPlaceholder>Valores clínicos por definir</ChipPlaceholder>
                  <button
                    type="button"
                    onClick={onAgregarRango}
                    className={`ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Rango
                  </button>
                </div>
                <p className={`mt-2.5 text-[12.5px] leading-relaxed ${softText}`}>
                  El alumno ve el resultado y, debajo, la interpretación del rango en que cayó. Ese
                  texto es la enseñanza de la calculadora.
                </p>
                <ul className="mt-3.5 flex flex-col gap-2">
                  {detalle.rangos.map((r) => (
                    <li
                      key={r.id}
                      className={`flex flex-wrap items-start gap-3 rounded-[11px] border px-3.5 py-3 ${
                        r.tono === "atencion"
                          ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          : "border-border bg-card"
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
                          r.tono === "atencion"
                            ? "bg-card text-[color:var(--warning-foreground)]"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {r.etiqueta}
                      </span>
                      <span className={`${mono} shrink-0 whitespace-nowrap text-[12.5px] font-bold`}>
                        {r.condicion}
                      </span>
                      <span className={`min-w-[200px] flex-1 text-[12.5px] leading-relaxed ${softText}`}>
                        {r.interpretacion}
                      </span>
                      <button
                        type="button"
                        aria-label={`Editar rango ${r.etiqueta}`}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground ${focusRing}`}
                      >
                        <Pencil aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* propiedades */}
            <aside className={`${card} min-w-0 p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Calculadora</p>
              <CampoTexto label="Nombre" valor={detalle.nombre} />
              <ChipsSelector label="Área clínica" opciones={AREAS} valor={detalle.area} />
              <CampoTexto label="Unidad del resultado" valor={detalle.unidadResultado} mono />
              <CampoTexto label="Para qué sirve" valor={detalle.paraQue} filas={3} />
              <CampoTexto label="Nota al pie" valor={detalle.notaPie} filas={2} ayuda="Placeholder" />

              <p className={`${kicker} mt-6 text-muted-foreground`}>Dónde aparece</p>
              <p className={`mt-2.5 text-[12.5px] leading-relaxed ${softText}`}>
                En <span className="font-bold text-foreground">Herramientas → Calculadoras</span> del
                campus y como acción dentro de la plantilla de reporte abdominal.
              </p>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ LISTADO ══════════ */
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      <SubNavHerramientas activa="calculadoras" conteos={CONTEOS} />

      {calculadoras.length === 0 ? (
        <VacioHerramienta
          icono={Calculator}
          titulo="Ninguna calculadora todavía"
          explicacion="Una calculadora toma medidas con su unidad, aplica una fórmula y devuelve el resultado con su interpretación. Esa interpretación es lo que enseña."
          cta="Nueva calculadora"
          onCrear={onCrear}
        />
      ) : (
        <>
          <BarraListado
            placeholder="Buscar calculadora…"
            busca={busca}
            onBuscar={setBusca}
            grupos={[
              {
                id: "estado",
                activa: estado,
                opciones: [
                  { etiqueta: "Todas", conteo: conteos.todas },
                  { etiqueta: "Publicadas", conteo: conteos.publicadas },
                  { etiqueta: "Borradores", conteo: conteos.borradores },
                ],
              },
              {
                id: "area",
                activa: area,
                opciones: [{ etiqueta: "Toda área" }, ...AREAS.map((a) => ({ etiqueta: a }))],
              },
            ]}
            onFiltrar={onFiltrar}
            cta="Nueva calculadora"
            onCrear={onCrear}
          />

          <TablaHerramienta
            columnas={[
              ["Calculadora", "left"],
              ["Área clínica", "left"],
              ["Estado", "left"],
              ["Uso", "right"],
              ["Última edición", "left"],
              ["", "right"],
            ]}
          >
            {porArea.map(([nombreArea, items]) => (
              <>
                <FilaGrupo key={nombreArea} titulo={nombreArea} n={items.length} columnas={6} />
                {items.map((c, i) => (
                  <FilaHerramienta
                    key={c.id}
                    nombre={c.nombre}
                    submeta={c.resumen}
                    icono={Calculator}
                    destacada={nombreArea === porArea[0][0] && i === 0}
                    onAbrir={() => onAbrir(c.id)}
                    celdas={[
                      { contenido: <ChipNeutro>{c.area}</ChipNeutro> },
                      { contenido: <ChipEstado estado={c.estado} /> },
                      { contenido: <ChipUso n={c.calculos} unidad="cálculos" />, alinear: "right" },
                      {
                        contenido: (
                          <span className={`${mono} whitespace-nowrap text-[12px] text-muted-foreground`}>
                            {c.ultimaEdicion}
                          </span>
                        ),
                      },
                    ]}
                  />
                ))}
              </>
            ))}
          </TablaHerramienta>
        </>
      )}
    </div>
  );
}

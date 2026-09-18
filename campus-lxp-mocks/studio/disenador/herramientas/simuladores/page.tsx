"use client";

/**
 * Studio · Herramientas → SIMULADORES
 *
 * El PANEL DE CONFIGURACIÓN de los entrenadores IA (no el simulador que usa el alumno):
 * casos base → criterios con peso → tono del feedback.
 *
 * Solo entran casos con la "verdad del caso" estructurada desde el área Casos (hallazgos clave
 * anclados, puntos de aprendizaje, errores comunes). Los parámetros de IA van como placeholder.
 *
 * El simulador NO acredita horas: es práctica. Lo que acredita sigue siendo el caso validado
 * por el docente.
 *
 * Stubs: onCrear · onAbrir · onGuardar · onPublicar · onFiltrar · onAgregarCaso · onQuitarCaso
 */

import { useMemo, useState } from "react";
import {
  Check,
  GripVertical,
  MonitorPlay,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
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

export type TipoSimulador = "Interpretación" | "Reporte";
export type Dificultad = "Básico" | "Intermedio" | "Avanzado";

export type CasoBase = {
  id: string;
  titulo: string;
  meta: string;
  dificultad: Dificultad;
  /** la curaduría dejó la verdad del caso estructurada */
  verdadLista: boolean;
};

export type CriterioIA = {
  id: string;
  titulo: string;
  peso: number;
  comoEvalua: string;
};

export type SimuladorResumen = {
  id: string;
  nombre: string;
  tipo: TipoSimulador;
  area: string;
  dificultad: Dificultad;
  estado: EstadoHerramienta;
  casosBase: number;
  sesiones: number;
};

export type SimuladorDetalle = {
  id: string;
  nombre: string;
  tipo: TipoSimulador;
  area: string;
  dificultad: Dificultad;
  estado: EstadoHerramienta;
  guardado: string;
  queEntrena: string;
  intentos: number;
  minutos: number;
  totalCasosBase: number;
  sesiones: number;
  casosBase: CasoBase[];
  criterios: CriterioIA[];
  /** prompt/tono con que la IA devuelve el feedback — se define aparte */
  tonoFeedback: string;
  cuandoMuestraDiagnostico: string;
};

export type SimuladoresData = {
  simuladores: SimuladorResumen[];
  detalle: SimuladorDetalle;
};

const AREAS = ["Renal", "Vías urinarias", "Obstétrico", "Doppler", "Hígado y vía biliar"];

const MOCK: SimuladoresData = {
  simuladores: [
    { id: "x1", nombre: "Interpretación renal · gradación", tipo: "Interpretación", area: "Renal", dificultad: "Intermedio", estado: "publicada", casosBase: 12, sesiones: 186 },
    { id: "x2", nombre: "Informe abdominal completo", tipo: "Reporte", area: "Abdominal", dificultad: "Avanzado", estado: "publicada", casosBase: 8, sesiones: 94 },
    { id: "x3", nombre: "Trampas del modo B", tipo: "Interpretación", area: "Renal", dificultad: "Avanzado", estado: "publicada", casosBase: 6, sesiones: 72 },
    { id: "x4", nombre: "Biometría fetal guiada", tipo: "Interpretación", area: "Obstétrico", dificultad: "Básico", estado: "publicada", casosBase: 10, sesiones: 128 },
    { id: "x5", nombre: "Informe Doppler de miembros", tipo: "Reporte", area: "Doppler", dificultad: "Avanzado", estado: "borrador", casosBase: 4, sesiones: 0 },
    { id: "x6", nombre: "Vía biliar: colecistitis o no", tipo: "Interpretación", area: "Hígado y vía biliar", dificultad: "Básico", estado: "borrador", casosBase: 0, sesiones: 0 },
  ],
  detalle: {
    id: "x1",
    nombre: "Interpretación renal · gradación",
    tipo: "Interpretación",
    area: "Renal",
    dificultad: "Intermedio",
    estado: "publicada",
    guardado: "hace 18 s",
    queEntrena:
      "Cerrar el grado de hidronefrosis con la medida correcta y sin caer en las trampas del modo B.",
    intentos: 2,
    minutos: 15,
    totalCasosBase: 12,
    sesiones: 186,
    tonoFeedback:
      "Señale primero lo que hizo bien, luego el hallazgo que faltó y cierre con la regla práctica. Sin juicios.",
    cuandoMuestraDiagnostico: "Al terminar el intento",
    casosBase: [
      { id: "c1", titulo: "Hidronefrosis grado III con adelgazamiento cortical", meta: "Renal · Interpretación", dificultad: "Intermedio", verdadLista: true },
      { id: "c2", titulo: "Quiste parapiélico simulando dilatación", meta: "Renal · Interpretación", dificultad: "Avanzado", verdadLista: true },
      { id: "c3", titulo: "Riñón poliquístico: conteo y medición", meta: "Renal · Adquisición", dificultad: "Intermedio", verdadLista: true },
      { id: "c4", titulo: "Litiasis ureteral distal con jet ausente", meta: "Vías urinarias · Decisión", dificultad: "Avanzado", verdadLista: true },
    ],
    criterios: [
      { id: "k1", titulo: "Identifica los hallazgos clave", peso: 40, comoEvalua: "Compara contra los hallazgos anclados del caso." },
      { id: "k2", titulo: "Cierra el grado con la medida correcta", peso: 30, comoEvalua: "Exige que use la cortical, no solo la dilatación." },
      { id: "k3", titulo: "Evita los errores comunes del caso", peso: 20, comoEvalua: "Penaliza las trampas registradas en la curaduría." },
      { id: "k4", titulo: "Redacta el hallazgo con orden clínico", peso: 10, comoEvalua: "Grado, lado, causa visible y espesor cortical." },
    ],
  },
};

function ChipTipo({ tipo }: { tipo: TipoSimulador }) {
  return tipo === "Reporte" ? (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[11.5px] font-bold text-sidebar-foreground">
      Reporte
    </span>
  ) : (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
      Interpretación
    </span>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Simuladores({
  data = MOCK,
  modo = "lista",
}: {
  data?: SimuladoresData;
  modo?: "lista" | "editor";
}) {
  const { simuladores, detalle } = data;
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("Todos");
  const [tipo, setTipo] = useState("Todo tipo");
  const [dificultad, setDificultad] = useState("Toda dificultad");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onCrear = () => {};
  const onAbrir = (_id: string) => {};
  const onGuardar = () => {};
  const onPublicar = () => {};
  const onFiltrar = (grupo: string, valor: string) =>
    grupo === "estado" ? setEstado(valor) : grupo === "tipo" ? setTipo(valor) : setDificultad(valor);
  const onAgregarCaso = () => {};
  const onQuitarCaso = (_id: string) => {};
  const onAgregarCriterio = () => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos = useMemo(
    () => ({
      todos: simuladores.length,
      publicados: simuladores.filter((s) => s.estado === "publicada").length,
      borradores: simuladores.filter((s) => s.estado === "borrador").length,
    }),
    [simuladores],
  );

  const visibles = useMemo(
    () =>
      simuladores.filter(
        (s) =>
          (estado === "Todos" ||
            (estado === "Publicados" ? s.estado === "publicada" : s.estado === "borrador")) &&
          (tipo === "Todo tipo" || s.tipo === tipo) &&
          (dificultad === "Toda dificultad" || s.dificultad === dificultad) &&
          (!busca.trim() || s.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [simuladores, estado, tipo, dificultad, busca],
  );

  const sumaPesos = detalle.criterios.reduce((s, c) => s + c.peso, 0);

  /* ══════════ EDITOR ══════════ */
  if (modo === "editor") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <HeaderEditor
          ruta="Simuladores"
          nombre={detalle.nombre}
          estado={detalle.estado}
          guardado={detalle.guardado}
          onVistaPrevia={() => {}}
          onGuardar={onGuardar}
          onPublicar={onPublicar}
        />
        <FranjaContexto
          items={[
            ["Tipo", detalle.tipo],
            ["Área", detalle.area],
            ["Dificultad", detalle.dificultad],
            ["Casos base", String(detalle.totalCasosBase)],
            ["Sesiones", String(detalle.sesiones)],
          ]}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_316px]">
            <div className="min-w-0">
              {/* casos base */}
              <section className={`${card} p-5`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className={`${kicker} text-muted-foreground`}>Casos base del entrenador</p>
                  <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
                    <MonitorPlay aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                    {detalle.totalCasosBase} marcados desde Casos
                  </span>
                  <button
                    type="button"
                    onClick={onAgregarCaso}
                    className={`ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[12px] font-bold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Agregar del banco
                  </button>
                </div>
                <p className={`mt-2.5 text-[12.5px] leading-relaxed ${softText}`}>
                  Solo entran casos con la{" "}
                  <span className="font-bold text-foreground">verdad del caso</span> estructurada:
                  hallazgos clave anclados, puntos de aprendizaje y errores comunes.
                </p>

                <ul className="mt-3.5 flex flex-col gap-2">
                  {detalle.casosBase.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-primary"
                    >
                      <span
                        aria-hidden
                        className="relative w-14 shrink-0 overflow-hidden rounded-[7px]"
                        style={{ aspectRatio: "4 / 3", background: "var(--sidebar)" }}
                      >
                        <span
                          className="absolute inset-0"
                          style={{
                            background:
                              "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)",
                          }}
                        />
                      </span>
                      <span className="min-w-[200px] flex-1">
                        <span className="block text-[13px] font-semibold leading-relaxed">
                          {c.titulo}
                        </span>
                        <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                          {c.meta} · {c.dificultad}
                        </span>
                      </span>
                      {c.verdadLista && (
                        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                          Verdad lista
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onQuitarCaso(c.id)}
                        aria-label={`Quitar ${c.titulo} del simulador`}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <Trash2 aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-2 h-10 w-full text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
                >
                  Ver los {detalle.totalCasosBase} casos base
                </button>
              </section>

              {/* cómo evalúa la IA */}
              <section className={`${card} mt-4 p-5`} style={{ background: "#fbfbfd" }}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                  >
                    <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <p className={`${kicker} text-[color:var(--info-foreground)]`}>Cómo evalúa la IA</p>
                  <ChipPlaceholder>Parámetros por definir</ChipPlaceholder>
                  <button
                    type="button"
                    onClick={onAgregarCriterio}
                    className={`ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-full border border-[color:var(--info-border)] bg-card px-2.5 text-[12px] font-bold text-[color:var(--info-foreground)] ${focusRing}`}
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Criterio
                  </button>
                </div>

                <ul className="mt-3.5 flex flex-col gap-2">
                  {detalle.criterios.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3.5 rounded-[11px] border border-border bg-card px-3.5 py-3"
                    >
                      <span aria-hidden className="shrink-0 cursor-grab text-[color:var(--track)]">
                        <GripVertical className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-[200px] flex-1">
                        <span className="block text-[13px] font-semibold leading-relaxed">
                          {c.titulo}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                          {c.comoEvalua}
                        </span>
                      </span>
                      <span className="flex w-[168px] shrink-0 items-center gap-2.5">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span
                            className="block h-full rounded-full bg-[color:var(--info)]"
                            style={{ width: `${c.peso}%` }}
                          />
                        </span>
                        <span className={`${mono} shrink-0 text-[12.5px] font-bold`}>{c.peso}%</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Editar criterio ${c.titulo}`}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <Pencil aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-[11px] border border-border bg-card px-3.5 py-3">
                  <span className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
                    Los pesos deben sumar <span className="font-bold text-foreground">100%</span>.
                  </span>
                  <span
                    className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                      sumaPesos === 100
                        ? "bg-accent text-accent-foreground"
                        : "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                    }`}
                  >
                    {sumaPesos === 100 && <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />}
                    {sumaPesos === 100 ? "Suman 100%" : `Suman ${sumaPesos}%`}
                  </span>
                </div>

                <CampoTexto
                  label="Tono del feedback al alumno"
                  valor={detalle.tonoFeedback}
                  filas={3}
                  ayuda="Prompt por definir"
                />
                <ChipsSelector
                  label="Cuándo muestra el diagnóstico"
                  opciones={["Al terminar el intento", "Tras dos intentos", "Nunca"]}
                  valor={detalle.cuandoMuestraDiagnostico}
                />
              </section>
            </div>

            {/* propiedades */}
            <aside className={`${card} min-w-0 p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Simulador</p>
              <CampoTexto label="Nombre" valor={detalle.nombre} />
              <ChipsSelector
                label="Tipo de entrenamiento"
                opciones={["Interpretación", "Reporte"]}
                valor={detalle.tipo}
              />
              <ChipsSelector label="Área clínica" opciones={AREAS} valor={detalle.area} />
              <ChipsSelector
                label="Dificultad"
                opciones={["Básico", "Intermedio", "Avanzado"]}
                valor={detalle.dificultad}
              />
              <CampoTexto label="Qué entrena" valor={detalle.queEntrena} filas={3} />

              <p className={`${kicker} mt-6 text-muted-foreground`}>Intentos y límites</p>
              <div className="mt-3 flex gap-2">
                {[
                  ["Intentos", String(detalle.intentos)],
                  ["Minutos", String(detalle.minutos)],
                ].map(([k, v]) => (
                  <label key={k} className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-semibold">{k}</span>
                    <input
                      type="text"
                      defaultValue={v}
                      className={`${mono} mt-1.5 h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-foreground outline-none transition-colors focus:border-secondary`}
                    />
                  </label>
                ))}
              </div>

              {/* el simulador es práctica, no acreditación */}
              <div className="mt-4 flex items-start gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                  strokeWidth={2}
                />
                <p className="text-[12px] leading-relaxed text-[color:var(--warning-foreground)]">
                  El simulador no acredita horas: es práctica. Lo que acredita sigue siendo el caso
                  validado por el docente.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ LISTADO ══════════ */
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      <SubNavHerramientas activa="simuladores" conteos={CONTEOS} />

      {simuladores.length === 0 ? (
        <VacioHerramienta
          icono={MonitorPlay}
          titulo="Ningún simulador configurado"
          explicacion="Un simulador toma casos ya curados y los convierte en práctica evaluada por IA. Primero marque casos para simulador en el área Casos; aquí define con qué criterios se evalúan."
          cta="Nuevo simulador"
          secundaria="Ver casos marcados"
          onCrear={onCrear}
        />
      ) : (
        <>
          <BarraListado
            placeholder="Buscar simulador…"
            busca={busca}
            onBuscar={setBusca}
            grupos={[
              {
                id: "estado",
                activa: estado,
                opciones: [
                  { etiqueta: "Todos", conteo: conteos.todos },
                  { etiqueta: "Publicados", conteo: conteos.publicados },
                  { etiqueta: "Borradores", conteo: conteos.borradores },
                ],
              },
              {
                id: "tipo",
                activa: tipo,
                opciones: [
                  { etiqueta: "Todo tipo" },
                  { etiqueta: "Interpretación" },
                  { etiqueta: "Reporte" },
                ],
              },
              {
                id: "dificultad",
                activa: dificultad,
                opciones: [
                  { etiqueta: "Toda dificultad" },
                  { etiqueta: "Básico" },
                  { etiqueta: "Intermedio" },
                  { etiqueta: "Avanzado" },
                ],
              },
            ]}
            onFiltrar={onFiltrar}
            cta="Nuevo simulador"
            onCrear={onCrear}
          />

          <TablaHerramienta
            columnas={[
              ["Simulador", "left"],
              ["Tipo", "left"],
              ["Área", "left"],
              ["Dificultad", "left"],
              ["Estado", "left"],
              ["Casos base", "right"],
              ["Uso", "right"],
              ["", "right"],
            ]}
          >
            {visibles.map((s, i) => (
              <FilaHerramienta
                key={s.id}
                nombre={s.nombre}
                submeta={`${s.casosBase} casos base · ${s.area.toLowerCase()}`}
                icono={MonitorPlay}
                destacada={i === 0}
                onAbrir={() => onAbrir(s.id)}
                celdas={[
                  { contenido: <ChipTipo tipo={s.tipo} /> },
                  { contenido: <ChipNeutro>{s.area}</ChipNeutro> },
                  { contenido: <ChipNeutro>{s.dificultad}</ChipNeutro> },
                  { contenido: <ChipEstado estado={s.estado} /> },
                  {
                    contenido: s.casosBase ? (
                      <span className={`${mono} text-[12.5px] font-semibold`}>{s.casosBase}</span>
                    ) : (
                      /* sin casos base no puede entrenar: lo único que pide acción */
                      <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                        Sin casos
                      </span>
                    ),
                    alinear: "right",
                  },
                  { contenido: <ChipUso n={s.sesiones} unidad="sesiones" />, alinear: "right" },
                ]}
              />
            ))}
          </TablaHerramienta>
        </>
      )}
    </div>
  );
}

"use client";

/**
 * Studio · Herramientas → PLANTILLAS DE REPORTE
 *
 * Las plantillas que el médico usa en "Mis reportes": secciones/órganos → campos → texto guía.
 * El texto guía es la sugerencia que lo orienta mientras dicta; NO sale en el informe final.
 *
 * Listado + editor en el mismo archivo (modo="lista" | "editor"), sobre el patrón común de
 * _patron.tsx. El contenido clínico real va como placeholder: se define aparte.
 *
 * Stubs: onCrear · onAbrir · onGuardar · onPublicar · onFiltrar
 */

import { useMemo, useState } from "react";
import {
  Copy,
  GripVertical,
  HelpCircle,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
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
} from "./_patron";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoCampo = "Medida" | "Opción" | "Texto" | "Sí / No" | "Imagen";

export type CampoPlantilla = {
  id: string;
  tipo: TipoCampo;
  nombre: string;
  /** unidad o dominio de la respuesta: "mm · numérico", "normal / aumentada", "texto libre" */
  formato: string;
  /** la sugerencia que orienta al médico; no aparece en el reporte */
  textoGuia: string;
};

export type SeccionPlantilla = {
  id: string;
  titulo: string;
  campos: CampoPlantilla[];
};

export type PlantillaResumen = {
  id: string;
  nombre: string;
  tipoEstudio: string;
  secciones: number;
  campos: number;
  estado: EstadoHerramienta;
  reportes: number;
  grupos: number;
  ultimaEdicion: string;
};

export type PlantillaDetalle = {
  id: string;
  nombre: string;
  tipoEstudio: string;
  estado: EstadoHerramienta;
  guardado: string;
  membrete: string;
  notaMedico: string;
  reportes: number;
  grupos: number;
  textosGuia: number;
  secciones: SeccionPlantilla[];
  dondeSeUsa: { programa: string; detalle: string }[];
};

export type PlantillasData = {
  plantillas: PlantillaResumen[];
  detalle: PlantillaDetalle;
};

const TIPOS_ESTUDIO = ["Abdominal", "Obstétrico", "Mama", "Doppler", "MSK", "Tiroideo"];

const MOCK: PlantillasData = {
  plantillas: [
    { id: "t1", nombre: "Abdomen completo · informe estándar", tipoEstudio: "Abdominal", secciones: 8, campos: 46, estado: "publicada", reportes: 312, grupos: 6, ultimaEdicion: "hace 2 h · Mariana V." },
    { id: "t2", nombre: "Obstétrico segundo trimestre", tipoEstudio: "Obstétrico", secciones: 6, campos: 38, estado: "publicada", reportes: 198, grupos: 4, ultimaEdicion: "ayer · Karla L." },
    { id: "t3", nombre: "Renal y vías urinarias", tipoEstudio: "Abdominal", secciones: 5, campos: 31, estado: "publicada", reportes: 164, grupos: 5, ultimaEdicion: "hace 3 días · Mariana V." },
    { id: "t4", nombre: "Doppler arterial de miembros", tipoEstudio: "Doppler", secciones: 4, campos: 28, estado: "borrador", reportes: 0, grupos: 0, ultimaEdicion: "hace 4 días · Hugo C." },
    { id: "t5", nombre: "Mama bilateral · BI-RADS", tipoEstudio: "Mama", secciones: 5, campos: 34, estado: "publicada", reportes: 87, grupos: 2, ultimaEdicion: "hace 1 semana · Karla L." },
    { id: "t6", nombre: "Hombro · musculoesquelético", tipoEstudio: "MSK", secciones: 6, campos: 29, estado: "publicada", reportes: 52, grupos: 2, ultimaEdicion: "hace 2 semanas · Hugo C." },
    { id: "t7", nombre: "Tiroides y cuello", tipoEstudio: "Tiroideo", secciones: 4, campos: 22, estado: "borrador", reportes: 0, grupos: 0, ultimaEdicion: "hace 3 semanas · Mariana V." },
  ],
  detalle: {
    id: "t1",
    nombre: "Abdomen completo · informe estándar",
    tipoEstudio: "Abdominal",
    estado: "publicada",
    guardado: "hace 18 s",
    membrete: "Médica Capacitación · Campus Virtual",
    notaMedico:
      "Complete de arriba a abajo; los campos con guía son los que más se equivocan.",
    reportes: 312,
    grupos: 6,
    textosGuia: 39,
    dondeSeUsa: [
      { programa: "Ultrasonografía Médica", detalle: "3 grupos · 186 reportes" },
      { programa: "POCUS en Urgencias", detalle: "2 grupos · 94 reportes" },
      { programa: "Doppler Vascular", detalle: "1 grupo · 32 reportes" },
    ],
    secciones: [
      { id: "s1", titulo: "Membrete y datos del estudio", campos: [] },
      { id: "s2", titulo: "Técnica y equipo", campos: [] },
      { id: "s3", titulo: "Hígado", campos: [] },
      { id: "s4", titulo: "Vía biliar y vesícula", campos: [] },
      {
        id: "s5",
        titulo: "Riñones",
        campos: [
          { id: "c1", tipo: "Medida", nombre: "Longitud del riñón derecho", formato: "mm · numérico", textoGuia: "Mida en el plano longitudinal máximo." },
          { id: "c2", tipo: "Medida", nombre: "Espesor cortical derecho", formato: "mm · numérico", textoGuia: "Menos de 10 mm sugiere daño crónico." },
          { id: "c3", tipo: "Opción", nombre: "Ecogenicidad cortical", formato: "normal / aumentada / disminuida", textoGuia: "Compare siempre contra el hígado." },
          { id: "c4", tipo: "Opción", nombre: "Dilatación pielocalicial", formato: "ausente / grado I–IV", textoGuia: "Confirme con cortical antes de cerrar el grado." },
          { id: "c5", tipo: "Texto", nombre: "Lesiones focales", formato: "texto libre", textoGuia: "Describa tamaño, localización y ecoestructura." },
          { id: "c6", tipo: "Opción", nombre: "Jet ureteral", formato: "presente / ausente / no valorado", textoGuia: "Observe al menos 2 minutos por lado." },
          { id: "c7", tipo: "Texto", nombre: "Comentario del riñón izquierdo", formato: "texto libre", textoGuia: "Repita el esquema del lado derecho." },
        ],
      },
      { id: "s6", titulo: "Bazo y páncreas", campos: [] },
      { id: "s7", titulo: "Retroperitoneo y grandes vasos", campos: [] },
      { id: "s8", titulo: "Conclusión y recomendaciones", campos: [] },
    ],
  },
};

const CHIP_TIPO_CAMPO: Record<TipoCampo, string> = {
  Medida: "bg-accent text-accent-foreground",
  Opción: "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  Texto: `bg-muted ${softText}`,
  "Sí / No": `bg-muted ${softText}`,
  Imagen: `bg-muted ${softText}`,
};

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Plantillas({
  data = MOCK,
  modo = "lista",
}: {
  data?: PlantillasData;
  modo?: "lista" | "editor";
}) {
  const { plantillas, detalle } = data;
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("Todas");
  const [tipoEstudio, setTipoEstudio] = useState("Todo estudio");
  const [seccionId, setSeccionId] = useState(
    detalle.secciones.find((s) => s.campos.length > 0)?.id ?? detalle.secciones[0].id,
  );

  /* ── Stubs ─────────────────────────────────────────────── */
  const onCrear = () => {};
  const onAbrir = (_id: string) => {};
  const onGuardar = () => {};
  const onPublicar = () => {};
  const onFiltrar = (grupo: string, valor: string) =>
    grupo === "estado" ? setEstado(valor) : setTipoEstudio(valor);
  const onAgregarSeccion = () => {};
  const onAgregarCampo = (_tipo: TipoCampo) => {};
  /* ──────────────────────────────────────────────────────── */

  const conteos = useMemo(
    () => ({
      todas: plantillas.length,
      publicadas: plantillas.filter((p) => p.estado === "publicada").length,
      borradores: plantillas.filter((p) => p.estado === "borrador").length,
    }),
    [plantillas],
  );

  const visibles = useMemo(
    () =>
      plantillas.filter(
        (p) =>
          (estado === "Todas" ||
            (estado === "Publicadas" ? p.estado === "publicada" : p.estado === "borrador")) &&
          (tipoEstudio === "Todo estudio" || p.tipoEstudio === tipoEstudio) &&
          (!busca.trim() || p.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [plantillas, estado, tipoEstudio, busca],
  );

  /* ══════════ EDITOR ══════════ */
  if (modo === "editor") {
    const seccion = detalle.secciones.find((s) => s.id === seccionId) ?? detalle.secciones[0];
    const indice = detalle.secciones.findIndex((s) => s.id === seccion.id) + 1;

    return (
      <div className="flex h-screen flex-col bg-background">
        <HeaderEditor
          ruta="Plantillas de reporte"
          nombre={detalle.nombre}
          estado={detalle.estado}
          guardado={detalle.guardado}
          onVistaPrevia={() => {}}
          onGuardar={onGuardar}
          onPublicar={onPublicar}
        />
        <FranjaContexto
          items={[
            ["Secciones", String(detalle.secciones.length)],
            ["Campos", String(detalle.secciones.reduce((s, x) => s + x.campos.length, 0) || 46)],
            ["Textos guía", String(detalle.textosGuia)],
            ["Reportes emitidos", String(detalle.reportes)],
            ["Grupos", String(detalle.grupos)],
          ]}
        >
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Rows3 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Membrete
          </button>
        </FranjaContexto>

        <div className="flex min-h-0 flex-1">
          {/* estructura: secciones y órganos */}
          <aside className="flex w-[324px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
              <p className={`${kicker} text-muted-foreground`}>Secciones y órganos</p>
              <button
                type="button"
                onClick={onAgregarSeccion}
                className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                Sección
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {detalle.secciones.map((s, i) => {
                const on = s.id === seccion.id;
                return (
                  <div
                    key={s.id}
                    className={`mb-0.5 flex items-center gap-2 rounded-[9px] px-2 py-2.5 ${
                      on ? "bg-accent shadow-[inset_0_0_0_1px_var(--primary)]" : "hover:bg-muted"
                    }`}
                  >
                    <span aria-hidden className="shrink-0 cursor-grab text-[color:var(--track)]">
                      <GripVertical className="h-[15px] w-[15px]" strokeWidth={1.9} />
                    </span>
                    <span
                      aria-hidden
                      className={`${mono} grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-[10px] font-bold ${
                        on ? "bg-primary text-[color:var(--sidebar)]" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSeccionId(s.id)}
                      className={`min-w-0 flex-1 text-left ${focusRing}`}
                    >
                      <span
                        className={`block text-[12.5px] leading-snug ${
                          on ? "font-bold text-accent-foreground" : "font-semibold"
                        }`}
                      >
                        {s.titulo}
                      </span>
                      <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                        {s.campos.length || "—"} campos
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Acciones de ${s.titulo}`}
                      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-foreground ${focusRing}`}
                    >
                      <MoreHorizontal aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* campos de la sección */}
          <div className="min-w-0 flex-1 overflow-y-auto px-7 py-6">
            <p className={`${kicker} text-secondary`}>
              Sección {String(indice).padStart(2, "0")} de {detalle.secciones.length}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                {seccion.titulo}
              </h1>
              <button
                type="button"
                aria-label="Renombrar la sección"
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {seccion.campos.length} campos · el médico la llena en este orden
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <h2 className="text-[15px] font-bold tracking-[-0.01em]">Campos de la sección</h2>
              <ChipPlaceholder>Contenido clínico por definir</ChipPlaceholder>
              <span className="text-[12.5px] text-muted-foreground">Arrastre para reordenar.</span>
            </div>

            <ul className="mt-3.5 flex flex-col gap-2">
              {seccion.campos.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-[11px] border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary"
                >
                  <span aria-hidden className="mt-1 shrink-0 cursor-grab text-[color:var(--track)]">
                    <GripVertical className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-[21px] items-center rounded-full px-2 text-[10.5px] font-bold ${CHIP_TIPO_CAMPO[c.tipo]}`}
                      >
                        {c.tipo}
                      </span>
                      <span className="text-[13.5px] font-bold">{c.nombre}</span>
                      <span className={`${mono} text-[11.5px] text-muted-foreground`}>{c.formato}</span>
                    </span>
                    {/* el texto guía orienta al médico y no sale en el informe */}
                    <span className="mt-2 flex items-start gap-1.5 rounded-[9px] bg-muted px-3 py-2.5">
                      <HelpCircle
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
                        strokeWidth={1.75}
                      />
                      <span className={`text-[12px] leading-relaxed ${softText}`}>
                        <span className="font-bold text-foreground">Texto guía · </span>
                        {c.textoGuia}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-0.5">
                    {[
                      { label: "Editar campo", icono: Pencil },
                      { label: "Duplicar", icono: Copy },
                      { label: "Eliminar", icono: Trash2 },
                    ].map(({ label, icono: I }) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={`${label}: ${c.nombre}`}
                        className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <I aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card p-4">
              <p className={`${kicker} text-muted-foreground`}>Agregar campo</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["Medida", "Opción", "Texto", "Sí / No", "Imagen"] as TipoCampo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onAgregarCampo(t)}
                    className={`inline-flex h-11 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[26px] w-[26px] place-items-center rounded-lg ${CHIP_TIPO_CAMPO[t]}`}
                    >
                      <Rows3 className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    </span>
                    {t === "Texto" ? "Texto libre" : t === "Imagen" ? "Imagen del estudio" : t}
                  </button>
                ))}
              </div>
              <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
                Cada campo lleva su texto guía: es la sugerencia que orienta al médico mientras dicta
                el informe, no aparece en el reporte final.
              </p>
            </div>
          </div>

          {/* propiedades + publicación */}
          <aside className="w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
            <p className={`${kicker} text-muted-foreground`}>Plantilla</p>
            <CampoTexto label="Nombre" valor={detalle.nombre} />
            <ChipsSelector label="Tipo de estudio" opciones={TIPOS_ESTUDIO} valor={detalle.tipoEstudio} />
            <CampoTexto label="Membrete" valor={detalle.membrete} ayuda="Logo y pie por definir" />
            <CampoTexto label="Nota para el médico" valor={detalle.notaMedico} filas={3} />

            <p className={`${kicker} mt-6 text-muted-foreground`}>Publicación</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[color:var(--warning)]" />
                Cambios sin publicar
              </span>
            </div>
            <p className={`mt-3 text-[12.5px] leading-relaxed ${softText}`}>
              Los <span className="font-bold text-foreground">{detalle.reportes} reportes</span> ya
              emitidos conservan la versión con la que se firmaron. Publicar solo afecta a los
              reportes nuevos.
            </p>
            <button
              type="button"
              onClick={onPublicar}
              className={`mt-3.5 inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              Publicar la plantilla
            </button>

            <p className={`${kicker} mt-6 text-muted-foreground`}>Dónde se usa</p>
            <div className="mt-3 flex flex-col gap-0.5">
              {detalle.dondeSeUsa.map((u) => (
                <button
                  key={u.programa}
                  type="button"
                  className={`flex flex-col gap-0.5 rounded-[9px] px-2.5 py-2.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                >
                  <span className="text-[12.5px] font-semibold leading-snug">{u.programa}</span>
                  <span className={`${mono} text-[11px] text-muted-foreground`}>{u.detalle}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ══════════ LISTADO ══════════ */
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      <SubNavHerramientas activa="plantillas" conteos={CONTEOS} />

      {plantillas.length === 0 ? (
        <VacioHerramienta
          icono={LayoutTemplate}
          titulo="Ninguna plantilla todavía"
          explicacion="Una plantilla define las secciones, los campos y los textos guía con los que el médico dicta su informe en “Mis reportes”. Empiece por un tipo de estudio y duplíquela después para los demás."
          cta="Nueva plantilla"
          secundaria="Partir de una plantilla base"
          onCrear={onCrear}
        />
      ) : (
        <>
          <BarraListado
            placeholder="Buscar plantilla…"
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
                id: "tipo",
                activa: tipoEstudio,
                opciones: [{ etiqueta: "Todo estudio" }, ...TIPOS_ESTUDIO.map((t) => ({ etiqueta: t }))],
              },
            ]}
            onFiltrar={onFiltrar}
            cta="Nueva plantilla"
            onCrear={onCrear}
          />

          <TablaHerramienta
            columnas={[
              ["Plantilla", "left"],
              ["Tipo de estudio", "left"],
              ["Estado", "left"],
              ["Uso", "right"],
              ["Grupos", "right"],
              ["Última edición", "left"],
              ["", "right"],
            ]}
          >
            {visibles.map((p, i) => (
              <FilaHerramienta
                key={p.id}
                nombre={p.nombre}
                submeta={`${p.secciones} secciones · ${p.campos} campos`}
                icono={LayoutTemplate}
                destacada={i === 0}
                onAbrir={() => onAbrir(p.id)}
                celdas={[
                  { contenido: <ChipNeutro>{p.tipoEstudio}</ChipNeutro> },
                  { contenido: <ChipEstado estado={p.estado} /> },
                  { contenido: <ChipUso n={p.reportes} unidad="reportes" />, alinear: "right" },
                  {
                    contenido: p.grupos ? (
                      <span className={`${mono} text-[12.5px] font-semibold`}>{p.grupos} grupos</span>
                    ) : (
                      <span className={`${mono} text-[12px] text-muted-foreground`}>—</span>
                    ),
                    alinear: "right",
                  },
                  {
                    contenido: (
                      <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                        {p.ultimaEdicion}
                      </span>
                    ),
                  },
                ]}
              />
            ))}
          </TablaHerramienta>

          {visibles.length === 0 && (
            <div className={`${card} mt-4 px-6 py-12 text-center`}>
              <p className="text-[15px] font-bold">Ninguna plantilla con ese filtro</p>
              <p className={`mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
                Cambie el tipo de estudio o el estado, o cree la plantilla que falta.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

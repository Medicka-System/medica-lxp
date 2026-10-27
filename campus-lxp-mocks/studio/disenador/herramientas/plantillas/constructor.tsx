"use client";

/**
 * Studio · Herramientas · CONSTRUCTOR DE PLANTILLAS DE REPORTE
 *
 * Archivo self-contained: tipos, mock, estado, drag-and-drop y los tres paneles.
 * Depende solo de React, lucide-react y los tokens de globals.css.
 *
 * Layout (bajo el header del Studio, 60px):
 *   · Barra de contexto (64px): volver · nombre editable · estudio · estado · guardado · Vista previa · Guardar
 *   · Cuerpo en 3 columnas, cada una con scroll propio:
 *       1. Paleta de elementos        (252px)  → se arrastran o se agregan con clic
 *       2. Lienzo por secciones       (flex)   → la plantilla tal como la verá el médico
 *       3. Propiedades del elemento   (328px)  → cambian según lo seleccionado
 *
 * Drag-and-drop nativo (HTML5). Tres cargas posibles en dataTransfer ("application/x-plantilla"):
 *   { k: "nuevo",   tipo }        → desde la paleta
 *   { k: "campo",   id }          → mover un campo (dentro de su sección o a otra)
 *   { k: "seccion", id }          → reordenar secciones
 * Soltar sobre un campo inserta ANTES de él; soltar en el cuerpo vacío de la sección lo agrega al final.
 *
 * Colores: teal = selección y acciones · ámbar = advertencias (fuera de rango, obligatorio)
 *          lila (info) = zona de carga de imágenes · punteado gris = borrador / guía.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  AlignLeft,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Eye,
  GripVertical,
  Hash,
  Heading,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Info,
  LayoutPanelTop,
  ListChecks,
  Monitor,
  Plus,
  Ruler,
  Save,
  Search,
  Table2,
  ToggleRight,
  Trash2,
  Type,
  User,
  ClipboardList,
  X,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
 * TIPOS
 * ══════════════════════════════════════════════════════════════════════ */

export type TipoCampo =
  | "titulo"
  | "guia"
  | "texto"
  | "multitexto"
  | "numero"
  | "medida"
  | "fecha"
  | "tabla"
  | "sino"
  | "opcion"
  | "imagen"
  | "galeria"
  | "columnas";

export type Ancho = 1 | 2 | 3;

export type ColumnaTabla = {
  id: string;
  nombre: string;
  tipo: "texto" | "numero" | "medida" | "opcion";
  unidad?: string;
};

export type ConfigCampo = {
  // texto / multitexto
  placeholder?: string;
  limite?: number;
  prellenado?: "" | "paciente" | "medico" | "expediente" | "equipo";
  soloLectura?: boolean;
  frasesRapidas?: string[];
  formato?: "plano" | "basico";
  lineas?: number;
  // número / medida
  decimales?: number;
  min?: number;
  max?: number;
  unidad?: string;
  refMin?: number;
  refMax?: number;
  calculado?: boolean;
  formula?: string;
  // fecha
  formatoFecha?: "fecha" | "fecha-hora";
  fechaDefecto?: "vacia" | "hoy" | "estudio";
  rango?: "libre" | "pasado" | "futuro";
  // tabla
  columnas?: ColumnaTabla[];
  filas?: string[];
  filasAbiertas?: boolean;
  mostrarVacia?: boolean;
  percentiles?: boolean;
  // sí / no
  etiquetas?: "sino" | "presente" | "positivo";
  noValorable?: boolean;
  // opción
  opciones?: string[];
  presentacion?: "menu" | "segmentado" | "casillas";
  multiple?: boolean;
  incluirOtro?: boolean;
  // imagen / galería
  origen?: "dicom" | "subida" | "ambos";
  proporcion?: "libre" | "4:3" | "16:9";
  minImgs?: number;
  maxImgs?: number;
  rejilla?: 2 | 3 | 4;
  pie?: boolean;
  anotaciones?: boolean;
  // guía / título
  tono?: "neutral" | "advertencia";
  nivel?: "h2" | "h3";
  divisor?: boolean;
  // columnas
  subcolumnas?: 2 | 3 | 4;
};

export type Campo = {
  id: string;
  tipo: TipoCampo;
  etiqueta: string;
  ancho: Ancho;
  obligatorio: boolean;
  enInforme: boolean;
  guia: string;
  predeterminado: string;
  auto?: boolean; // prellenado desde el sistema
  config: ConfigCampo;
};

export type Seccion = {
  id: string;
  titulo: string;
  columnas: Ancho;
  colapsada: boolean;
  enInforme: boolean;
  campos: Campo[];
};

export type EstadoPlantilla = "borrador" | "publicada";

export type Plantilla = {
  id: string;
  nombre: string;
  estudio: string;
  estado: EstadoPlantilla;
  secciones: Seccion[];
};

type Seleccion =
  | { k: "campo"; seccionId: string; campoId: string }
  | { k: "seccion"; seccionId: string }
  | null;

type CargaDrag = { k: "nuevo"; tipo: TipoCampo; preset?: Partial<Campo> } | { k: "campo"; id: string } | { k: "seccion"; id: string };

const MIME = "application/x-plantilla";

/* ══════════════════════════════════════════════════════════════════════
 * CATÁLOGO DE ELEMENTOS (paleta)
 * ══════════════════════════════════════════════════════════════════════ */

type ElementoPaleta = { tipo: TipoCampo | "seccion"; nombre: string; icono: typeof Type };

const GRUPOS: { titulo: string; items: ElementoPaleta[] }[] = [
  {
    titulo: "Estructura",
    items: [
      { tipo: "seccion", nombre: "Sección", icono: LayoutPanelTop },
      { tipo: "columnas", nombre: "Columnas", icono: Columns3 },
      { tipo: "titulo", nombre: "Título", icono: Heading },
      { tipo: "guia", nombre: "Guía", icono: Info },
    ],
  },
  { titulo: "Texto", items: [{ tipo: "texto", nombre: "Texto", icono: Type }, { tipo: "multitexto", nombre: "Multitexto", icono: AlignLeft }] },
  {
    titulo: "Valores clínicos",
    items: [
      { tipo: "numero", nombre: "Número", icono: Hash },
      { tipo: "medida", nombre: "Medida", icono: Ruler },
      { tipo: "fecha", nombre: "Fecha", icono: Calendar },
      { tipo: "tabla", nombre: "Tabla", icono: Table2 },
    ],
  },
  { titulo: "Selección", items: [{ tipo: "sino", nombre: "Sí / No", icono: ToggleRight }, { tipo: "opcion", nombre: "Opción", icono: ListChecks }] },
  { titulo: "Imágenes", items: [{ tipo: "imagen", nombre: "Imagen", icono: ImageIcon }, { tipo: "galeria", nombre: "Galería", icono: Images }] },
];

/** Campos del paciente: llegan prellenados desde CORA o desde el estudio. */
const CAMPOS_PACIENTE: { nombre: string; icono: typeof Type; preset: Partial<Campo> }[] = [
  { nombre: "Sexo", icono: User, preset: { tipo: "opcion", etiqueta: "Sexo", auto: true, config: { opciones: ["Femenino", "Masculino"], presentacion: "segmentado" } } },
  { nombre: "Equipo", icono: Monitor, preset: { tipo: "texto", etiqueta: "Equipo", auto: true, config: { prellenado: "equipo" } } },
  { nombre: "Motivo del estudio", icono: ClipboardList, preset: { tipo: "multitexto", etiqueta: "Motivo del estudio", auto: true, config: { lineas: 2 } } },
];

const ICONO_TIPO: Record<TipoCampo, typeof Type> = {
  titulo: Heading,
  guia: Info,
  texto: Type,
  multitexto: AlignLeft,
  numero: Hash,
  medida: Ruler,
  fecha: Calendar,
  tabla: Table2,
  sino: ToggleRight,
  opcion: ListChecks,
  imagen: ImageIcon,
  galeria: Images,
  columnas: Columns3,
};

const NOMBRE_TIPO: Record<TipoCampo, string> = {
  titulo: "Título",
  guia: "Guía",
  texto: "Texto",
  multitexto: "Multitexto",
  numero: "Número",
  medida: "Medida",
  fecha: "Fecha",
  tabla: "Tabla",
  sino: "Sí / No",
  opcion: "Opción",
  imagen: "Imagen",
  galeria: "Galería",
  columnas: "Columnas",
};

const ATAJOS: TipoCampo[] = ["texto", "medida", "fecha", "tabla", "sino", "guia"];

/* ══════════════════════════════════════════════════════════════════════
 * FÁBRICA Y MOCK
 * ══════════════════════════════════════════════════════════════════════ */

let contador = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

function configPorTipo(tipo: TipoCampo): ConfigCampo {
  switch (tipo) {
    case "texto":
      return { placeholder: "", limite: undefined, prellenado: "", soloLectura: false };
    case "multitexto":
      return { placeholder: "", formato: "basico", lineas: 3, frasesRapidas: [] };
    case "numero":
      return { decimales: 0 };
    case "medida":
      return { decimales: 1, unidad: "mm", calculado: false };
    case "fecha":
      return { formatoFecha: "fecha", fechaDefecto: "vacia", rango: "libre" };
    case "tabla":
      return {
        columnas: [
          { id: uid("c"), nombre: "Valor", tipo: "medida", unidad: "mm" },
          { id: uid("c"), nombre: "Comentario", tipo: "texto" },
        ],
        filas: ["Fila 1", "Fila 2"],
        filasAbiertas: false,
        mostrarVacia: false,
        percentiles: false,
      };
    case "sino":
      return { etiquetas: "sino", noValorable: false };
    case "opcion":
      return { opciones: ["Opción 1", "Opción 2"], presentacion: "menu", multiple: false, incluirOtro: false };
    case "imagen":
      return { origen: "ambos", proporcion: "4:3", pie: false, anotaciones: true };
    case "galeria":
      return { origen: "ambos", minImgs: 1, maxImgs: 6, rejilla: 2, pie: false };
    case "guia":
      return { tono: "neutral" };
    case "titulo":
      return { nivel: "h3", divisor: false };
    case "columnas":
      return { subcolumnas: 2 };
  }
}

function crearCampo(tipo: TipoCampo, preset: Partial<Campo> = {}): Campo {
  const anchoDefecto: Ancho = tipo === "tabla" || tipo === "galeria" || tipo === "guia" || tipo === "titulo" || tipo === "columnas" ? 3 : 1;
  const base: Campo = {
    id: uid("f"),
    tipo,
    etiqueta: NOMBRE_TIPO[tipo],
    ancho: anchoDefecto,
    obligatorio: false,
    enInforme: tipo !== "guia",
    guia: tipo === "guia" ? "Escriba aquí la indicación para el médico." : "",
    predeterminado: "",
    config: configPorTipo(tipo),
  };
  return { ...base, ...preset, config: { ...base.config, ...(preset.config ?? {}) } };
}

function crearSeccion(titulo = "Nueva sección"): Seccion {
  return { id: uid("s"), titulo, columnas: 2, colapsada: false, enInforme: true, campos: [] };
}

const MOCK: Plantilla = {
  id: "p-obst-5-10",
  nombre: "USG obstétrico 5–10.6 semanas",
  estudio: "Obstétrico",
  estado: "publicada",
  secciones: [
    {
      id: "s1",
      titulo: "Datos del estudio",
      columnas: 3,
      colapsada: false,
      enInforme: true,
      campos: [
        crearCampo("texto", { etiqueta: "Paciente", obligatorio: true, auto: true, config: { prellenado: "paciente" } }),
        crearCampo("numero", { etiqueta: "Edad", auto: true }),
        crearCampo("texto", { etiqueta: "Médico tratante", predeterminado: "Dr. ", config: { prellenado: "medico" } }),
        crearCampo("fecha", { etiqueta: "Fecha de última menstruación", obligatorio: true, config: { rango: "pasado" } }),
        crearCampo("fecha", { etiqueta: "Fecha del estudio", auto: true, config: { fechaDefecto: "estudio" } }),
        crearCampo("sino", { etiqueta: "FUM confiable" }),
        crearCampo("medida", {
          etiqueta: "Edad gestacional",
          obligatorio: true,
          guia: "Por FUM confiable, o por LCC si la FUM no lo es.",
          config: { unidad: "sem", decimales: 1, min: 4, max: 42 },
        }),
        crearCampo("fecha", { etiqueta: "Fecha probable de parto", auto: true, config: { rango: "futuro" } }),
        crearCampo("opcion", { etiqueta: "Equipo", config: { opciones: ["Mindray DC-80", "Mindray Resona 7"], presentacion: "menu" } }),
      ],
    },
    {
      id: "s2",
      titulo: "Biometría fetal",
      columnas: 1,
      colapsada: false,
      enInforme: true,
      campos: [
        crearCampo("tabla", {
          etiqueta: "Biometría",
          ancho: 1,
          config: {
            columnas: [
              { id: "c1", nombre: "Valor (mm)", tipo: "medida", unidad: "mm" },
              { id: "c2", nombre: "Percentil", tipo: "numero" },
              { id: "c3", nombre: "Comentario", tipo: "texto" },
            ],
            filas: ["DBP", "DOF", "Circunferencia cefálica", "Circunferencia abdominal", "Longitud femoral", "ILA · bolsillo mayor"],
            filasAbiertas: false,
            percentiles: true,
          },
        }),
        crearCampo("guia", {
          etiqueta: "Guía",
          ancho: 1,
          guia: "Mida la LCC si la edad es menor a 14 semanas; a partir de ahí, DBP y circunferencias.",
        }),
      ],
    },
    {
      id: "s3",
      titulo: "Hallazgos e impresión",
      columnas: 2,
      colapsada: false,
      enInforme: true,
      campos: [
        crearCampo("multitexto", { etiqueta: "Hallazgos", ancho: 2, predeterminado: "Útero en anteversoflexión, de contornos regulares…" }),
        crearCampo("multitexto", { etiqueta: "Impresión diagnóstica", obligatorio: true }),
        crearCampo("multitexto", { etiqueta: "Recomendaciones" }),
      ],
    },
    {
      id: "s4",
      titulo: "Imágenes del estudio",
      columnas: 1,
      colapsada: false,
      enInforme: true,
      campos: [crearCampo("galeria", { etiqueta: "Imágenes del estudio", ancho: 1 })],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
 * ESTILOS COMPARTIDOS
 * ══════════════════════════════════════════════════════════════════════ */

const mono = "font-mono tabular-nums";
const kicker = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const inputBase =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[12.5px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground";
const previewBox =
  "flex h-10 items-center rounded-[9px] border border-border bg-card px-3 text-[12.5px] text-muted-foreground";

/* ══════════════════════════════════════════════════════════════════════
 * PANTALLA
 * ══════════════════════════════════════════════════════════════════════ */

export default function ConstructorPlantillas({ data = MOCK }: { data?: Plantilla }) {
  const [plantilla, setPlantilla] = useState<Plantilla>(data);
  const [seleccion, setSeleccion] = useState<Seleccion>({
    k: "campo",
    seccionId: data.secciones[0].id,
    campoId: data.secciones[0].campos[6]?.id ?? data.secciones[0].campos[0].id,
  });
  const [busca, setBusca] = useState("");
  const [guardadoHace, setGuardadoHace] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [dropSobre, setDropSobre] = useState<string | null>(null); // id de campo/sección bajo el cursor

  /* ── Stubs ─────────────────────────────────────────────── */
  const onVolver = () => {};
  const onVistaPrevia = (_p: Plantilla) => {};
  const onGuardar = (_p: Plantilla) => {
    setSucio(false);
    setGuardadoHace(0);
  };
  /* ──────────────────────────────────────────────────────── */

  /* Autoguardado: cada cambio marca "sucio"; a los 2 s se guarda. */
  useEffect(() => {
    if (!sucio) return;
    const t = setTimeout(() => onGuardar(plantilla), 2000);
    return () => clearTimeout(t);
  }, [sucio, plantilla]);
  useEffect(() => {
    const t = setInterval(() => setGuardadoHace((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mutar = useCallback((fn: (p: Plantilla) => Plantilla) => {
    setPlantilla((p) => fn(structuredClone(p)));
    setSucio(true);
  }, []);

  /* ── selección actual ── */
  const seccionSel = useMemo(
    () => (seleccion ? plantilla.secciones.find((s) => s.id === seleccion.seccionId) ?? null : null),
    [plantilla, seleccion],
  );
  const campoSel = useMemo(
    () => (seleccion?.k === "campo" && seccionSel ? seccionSel.campos.find((c) => c.id === seleccion.campoId) ?? null : null),
    [seccionSel, seleccion],
  );

  /* ── operaciones sobre la plantilla ── */
  const actualizarCampo = (campoId: string, cambio: Partial<Campo> | ((c: Campo) => Campo)) =>
    mutar((p) => {
      for (const s of p.secciones) {
        const i = s.campos.findIndex((c) => c.id === campoId);
        if (i >= 0) s.campos[i] = typeof cambio === "function" ? cambio(s.campos[i]) : { ...s.campos[i], ...cambio };
      }
      return p;
    });

  const actualizarSeccion = (seccionId: string, cambio: Partial<Seccion>) =>
    mutar((p) => {
      const s = p.secciones.find((x) => x.id === seccionId);
      if (s) Object.assign(s, cambio);
      return p;
    });

  const insertarCampo = (seccionId: string, campo: Campo, antesDe?: string) => {
    mutar((p) => {
      const s = p.secciones.find((x) => x.id === seccionId);
      if (!s) return p;
      const i = antesDe ? s.campos.findIndex((c) => c.id === antesDe) : -1;
      if (i >= 0) s.campos.splice(i, 0, campo);
      else s.campos.push(campo);
      s.colapsada = false;
      return p;
    });
    setSeleccion({ k: "campo", seccionId, campoId: campo.id });
  };

  const moverCampo = (campoId: string, destinoSeccion: string, antesDe?: string) => {
    if (campoId === antesDe) return;
    mutar((p) => {
      let campo: Campo | undefined;
      for (const s of p.secciones) {
        const i = s.campos.findIndex((c) => c.id === campoId);
        if (i >= 0) [campo] = s.campos.splice(i, 1);
      }
      const d = p.secciones.find((x) => x.id === destinoSeccion);
      if (!campo || !d) return p;
      const i = antesDe ? d.campos.findIndex((c) => c.id === antesDe) : -1;
      if (i >= 0) d.campos.splice(i, 0, campo);
      else d.campos.push(campo);
      return p;
    });
    setSeleccion({ k: "campo", seccionId: destinoSeccion, campoId });
  };

  const duplicarCampo = (seccionId: string, campoId: string) => {
    const s = plantilla.secciones.find((x) => x.id === seccionId);
    const c = s?.campos.find((x) => x.id === campoId);
    if (!c) return;
    const copia = { ...structuredClone(c), id: uid("f"), etiqueta: `${c.etiqueta} (copia)` };
    const i = s!.campos.findIndex((x) => x.id === campoId);
    insertarCampo(seccionId, copia, s!.campos[i + 1]?.id);
  };

  const eliminarCampo = (seccionId: string, campoId: string) => {
    mutar((p) => {
      const s = p.secciones.find((x) => x.id === seccionId);
      if (s) s.campos = s.campos.filter((c) => c.id !== campoId);
      return p;
    });
    setSeleccion({ k: "seccion", seccionId });
  };

  const agregarSeccion = (antesDe?: string) => {
    const nueva = crearSeccion();
    mutar((p) => {
      const i = antesDe ? p.secciones.findIndex((s) => s.id === antesDe) : -1;
      if (i >= 0) p.secciones.splice(i, 0, nueva);
      else p.secciones.push(nueva);
      return p;
    });
    setSeleccion({ k: "seccion", seccionId: nueva.id });
  };

  const duplicarSeccion = (seccionId: string) =>
    mutar((p) => {
      const i = p.secciones.findIndex((s) => s.id === seccionId);
      if (i < 0) return p;
      const copia = structuredClone(p.secciones[i]);
      copia.id = uid("s");
      copia.titulo = `${copia.titulo} (copia)`;
      copia.campos = copia.campos.map((c) => ({ ...c, id: uid("f") }));
      p.secciones.splice(i + 1, 0, copia);
      return p;
    });

  const eliminarSeccion = (seccionId: string) => {
    mutar((p) => ({ ...p, secciones: p.secciones.filter((s) => s.id !== seccionId) }));
    setSeleccion(null);
  };

  const moverSeccion = (id: string, antesDe: string) => {
    if (id === antesDe) return;
    mutar((p) => {
      const i = p.secciones.findIndex((s) => s.id === id);
      const [s] = p.secciones.splice(i, 1);
      const j = p.secciones.findIndex((x) => x.id === antesDe);
      p.secciones.splice(j < 0 ? p.secciones.length : j, 0, s);
      return p;
    });
  };

  const subirBajarSeccion = (id: string, dir: -1 | 1) =>
    mutar((p) => {
      const i = p.secciones.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.secciones.length) return p;
      [p.secciones[i], p.secciones[j]] = [p.secciones[j], p.secciones[i]];
      return p;
    });

  /* ── clic en la paleta: agrega a la sección seleccionada (o a la última) ── */
  const agregarDesdePaleta = (tipo: TipoCampo | "seccion", preset?: Partial<Campo>) => {
    if (tipo === "seccion") return agregarSeccion();
    const destino = seleccion?.seccionId ?? plantilla.secciones.at(-1)?.id;
    if (!destino) {
      const s = crearSeccion("Sección 1");
      const c = crearCampo(tipo, preset);
      s.campos.push(c);
      mutar((p) => ({ ...p, secciones: [...p.secciones, s] }));
      setSeleccion({ k: "campo", seccionId: s.id, campoId: c.id });
      return;
    }
    insertarCampo(destino, crearCampo(tipo, preset));
  };

  /* ── drag-and-drop ── */
  const iniciarDrag = (e: DragEvent, carga: CargaDrag) => {
    e.dataTransfer.setData(MIME, JSON.stringify(carga));
    e.dataTransfer.effectAllowed = carga.k === "nuevo" ? "copy" : "move";
  };
  const leerCarga = (e: DragEvent): CargaDrag | null => {
    try {
      return JSON.parse(e.dataTransfer.getData(MIME));
    } catch {
      return null;
    }
  };
  const soltarEnSeccion = (e: DragEvent, seccionId: string, antesDeCampo?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropSobre(null);
    const c = leerCarga(e);
    if (!c) return;
    if (c.k === "nuevo") {
      if ((c.tipo as string) === "seccion") return agregarSeccion(seccionId);
      insertarCampo(seccionId, crearCampo(c.tipo, c.preset), antesDeCampo);
    } else if (c.k === "campo") moverCampo(c.id, seccionId, antesDeCampo);
    else if (c.k === "seccion") moverSeccion(c.id, seccionId);
  };
  const permitirDrop = (e: DragEvent, id: string) => {
    if (!e.dataTransfer.types.includes(MIME)) return;
    e.preventDefault();
    if (dropSobre !== id) setDropSobre(id);
  };

  /* ── teclado: Supr elimina, Esc deselecciona ── */
  const lienzoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") setSeleccion(null);
      if ((e.key === "Delete" || e.key === "Backspace") && seleccion?.k === "campo")
        eliminarCampo(seleccion.seccionId, seleccion.campoId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalCampos = plantilla.secciones.reduce((n, s) => n + s.campos.length, 0);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col bg-background">
      {/* ═════════ Barra de contexto ═════════ */}
      <BarraContexto
        plantilla={plantilla}
        guardadoHace={guardadoHace}
        sucio={sucio}
        onNombre={(nombre) => mutar((p) => ({ ...p, nombre }))}
        onEstudio={(estudio) => mutar((p) => ({ ...p, estudio }))}
        onVolver={onVolver}
        onVistaPrevia={() => onVistaPrevia(plantilla)}
        onGuardar={() => onGuardar(plantilla)}
      />

      <div className="flex min-h-0 flex-1">
        {/* ═════════ 1 · Paleta ═════════ */}
        <Paleta busca={busca} setBusca={setBusca} onAgregar={agregarDesdePaleta} onDrag={iniciarDrag} />

        {/* ═════════ 2 · Lienzo ═════════ */}
        <div
          ref={lienzoRef}
          className="min-w-0 flex-1 overflow-y-auto bg-[#F1F4F6] px-7 pb-10 pt-[22px]"
          onClick={(e) => e.target === e.currentTarget && setSeleccion(null)}
        >
          <div className="mx-auto flex max-w-[880px] flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <p className={kicker}>Vista de construcción · así se verá en “Mis reportes”</p>
              <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                {plantilla.secciones.length} secciones · {totalCampos} campos
              </span>
            </div>

            {plantilla.secciones.map((s, i) => (
              <SeccionCard
                key={s.id}
                seccion={s}
                primera={i === 0}
                ultima={i === plantilla.secciones.length - 1}
                seleccion={seleccion}
                dropSobre={dropSobre}
                onSeleccionar={(sel) => setSeleccion(sel)}
                onTitulo={(titulo) => actualizarSeccion(s.id, { titulo })}
                onColumnas={(columnas) => actualizarSeccion(s.id, { columnas })}
                onColapsar={() => actualizarSeccion(s.id, { colapsada: !s.colapsada })}
                onDuplicar={() => duplicarSeccion(s.id)}
                onEliminar={() => eliminarSeccion(s.id)}
                onSubirBajar={(d) => subirBajarSeccion(s.id, d)}
                onAtajo={(tipo) => insertarCampo(s.id, crearCampo(tipo))}
                onDuplicarCampo={(cid) => duplicarCampo(s.id, cid)}
                onEliminarCampo={(cid) => eliminarCampo(s.id, cid)}
                onDragCampo={(e, cid) => iniciarDrag(e, { k: "campo", id: cid })}
                onDragSeccion={(e) => iniciarDrag(e, { k: "seccion", id: s.id })}
                onDragOver={permitirDrop}
                onDragLeave={() => setDropSobre(null)}
                onDrop={soltarEnSeccion}
              />
            ))}

            {plantilla.secciones.length === 0 && (
              <div className="rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-8 py-12 text-center">
                <p className="text-[15px] font-bold">La plantilla está vacía</p>
                <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
                  Empiece por una sección y arrastre los campos que el médico va a llenar.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => agregarSeccion()}
              onDragOver={(e) => permitirDrop(e, "nueva-seccion")}
              onDragLeave={() => setDropSobre(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDropSobre(null);
                const c = leerCarga(e);
                if (!c) return;
                const s = crearSeccion();
                if (c.k === "nuevo" && (c.tipo as string) !== "seccion") s.campos.push(crearCampo(c.tipo, c.preset));
                mutar((p) => ({ ...p, secciones: [...p.secciones, s] }));
                if (c.k === "campo") moverCampo(c.id, s.id);
                setSeleccion({ k: "seccion", seccionId: s.id });
              }}
              className={`inline-flex h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-primary text-[13.5px] font-bold text-secondary transition-colors hover:bg-accent ${focusRing} ${
                dropSobre === "nueva-seccion" ? "bg-accent" : "bg-primary/[0.06]"
              }`}
            >
              <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
              Agregar sección
            </button>
          </div>
        </div>

        {/* ═════════ 3 · Propiedades ═════════ */}
        <aside
          aria-label="Propiedades"
          className="w-[328px] shrink-0 overflow-y-auto border-l border-border bg-card"
        >
          {campoSel && seccionSel ? (
            <PanelCampo
              campo={campoSel}
              seccion={seccionSel}
              onCambio={(c) => actualizarCampo(campoSel.id, c)}
              onTipo={(tipo) =>
                actualizarCampo(campoSel.id, (c) => ({ ...c, tipo, config: { ...configPorTipo(tipo) } }))
              }
            />
          ) : seccionSel ? (
            <PanelSeccion seccion={seccionSel} onCambio={(c) => actualizarSeccion(seccionSel.id, c)} />
          ) : (
            <PanelPlantilla plantilla={plantilla} />
          )}
        </aside>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * BARRA DE CONTEXTO
 * ══════════════════════════════════════════════════════════════════════ */

function BarraContexto({
  plantilla,
  guardadoHace,
  sucio,
  onNombre,
  onEstudio,
  onVolver,
  onVistaPrevia,
  onGuardar,
}: {
  plantilla: Plantilla;
  guardadoHace: number;
  sucio: boolean;
  onNombre: (v: string) => void;
  onEstudio: (v: string) => void;
  onVolver: () => void;
  onVistaPrevia: () => void;
  onGuardar: () => void;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-5">
      <button
        type="button"
        onClick={onVolver}
        aria-label="Volver a Plantillas"
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-border text-foreground transition-colors hover:bg-accent ${focusRing}`}
      >
        <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
      </button>

      <span className="flex min-w-0 flex-col leading-tight">
        <span className={kicker}>Plantilla de reporte</span>
        <label className="sr-only" htmlFor="nombre-plantilla">
          Nombre de la plantilla
        </label>
        <input
          id="nombre-plantilla"
          value={plantilla.nombre}
          onChange={(e) => onNombre(e.target.value)}
          className="mt-0.5 w-[320px] max-w-full rounded-md bg-transparent p-0 text-[16px] font-extrabold text-foreground outline-none focus:bg-muted"
        />
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        <label className="text-[11.5px] font-semibold text-muted-foreground" htmlFor="estudio">
          Estudio
        </label>
        <select
          id="estudio"
          value={plantilla.estudio}
          onChange={(e) => onEstudio(e.target.value)}
          className={`h-[38px] rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold ${focusRing}`}
        >
          {["Obstétrico", "Abdominal", "Renal", "Doppler", "Mama", "Tiroides", "MSK"].map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <span
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${
            plantilla.estado === "publicada"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-muted text-muted-foreground"
          }`}
        >
          {plantilla.estado === "publicada" ? "Publicada" : "Borrador"}
        </span>
        <span className={`${mono} whitespace-nowrap text-[11px] text-muted-foreground`}>
          {sucio ? "guardando…" : `guardado hace ${guardadoHace} s`}
        </span>

        <button
          type="button"
          onClick={onVistaPrevia}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Eye aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Vista previa
        </button>
        <button
          type="button"
          onClick={onGuardar}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Save aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Guardar
        </button>
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * 1 · PALETA
 * ══════════════════════════════════════════════════════════════════════ */

function Paleta({
  busca,
  setBusca,
  onAgregar,
  onDrag,
}: {
  busca: string;
  setBusca: (v: string) => void;
  onAgregar: (tipo: TipoCampo | "seccion", preset?: Partial<Campo>) => void;
  onDrag: (e: DragEvent, c: CargaDrag) => void;
}) {
  const q = busca.trim().toLowerCase();
  const grupos = GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.nombre.toLowerCase().includes(q)) })).filter(
    (g) => g.items.length,
  );
  const paciente = CAMPOS_PACIENTE.filter((c) => !q || c.nombre.toLowerCase().includes(q));

  return (
    <aside
      aria-label="Elementos"
      className="w-[252px] shrink-0 overflow-y-auto border-r border-border bg-card p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <label className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-muted px-3 focus-within:border-secondary">
        <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="sr-only">Buscar elemento</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar elemento…"
          className="w-full min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
        />
      </label>

      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className={`${kicker} mb-2 mt-[18px]`}>{g.titulo}</p>
          <div className="grid grid-cols-2 gap-2">
            {g.items.map((it) => {
              const Icono = it.icono;
              return (
                <button
                  key={it.nombre}
                  type="button"
                  draggable
                  onDragStart={(e) => onDrag(e, { k: "nuevo", tipo: it.tipo as TipoCampo })}
                  onClick={() => onAgregar(it.tipo)}
                  className={`flex h-[74px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[11.5px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground active:cursor-grabbing ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {it.nombre}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {paciente.length > 0 && (
        <>
          <p className={`${kicker} mb-2 mt-[18px]`}>Campos del paciente</p>
          <div className="flex flex-col gap-1.5">
            {paciente.map((c) => {
              const Icono = c.icono;
              return (
                <button
                  key={c.nombre}
                  type="button"
                  draggable
                  onDragStart={(e) => onDrag(e, { k: "nuevo", tipo: c.preset.tipo!, preset: c.preset })}
                  onClick={() => onAgregar(c.preset.tipo!, c.preset)}
                  className={`flex h-10 cursor-grab items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 text-left text-[12px] font-semibold transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[15px] w-[15px] text-secondary" strokeWidth={1.75} />
                  {c.nombre}
                  <span className={`${mono} ml-auto text-[10px] text-muted-foreground`}>prellenado</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Arrastre al lienzo o haga clic para agregarlo a la sección seleccionada.
      </p>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * 2 · LIENZO — sección y campo
 * ══════════════════════════════════════════════════════════════════════ */

function SeccionCard({
  seccion: s,
  primera,
  ultima,
  seleccion,
  dropSobre,
  onSeleccionar,
  onTitulo,
  onColumnas,
  onColapsar,
  onDuplicar,
  onEliminar,
  onSubirBajar,
  onAtajo,
  onDuplicarCampo,
  onEliminarCampo,
  onDragCampo,
  onDragSeccion,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  seccion: Seccion;
  primera: boolean;
  ultima: boolean;
  seleccion: Seleccion;
  dropSobre: string | null;
  onSeleccionar: (s: Seleccion) => void;
  onTitulo: (v: string) => void;
  onColumnas: (n: Ancho) => void;
  onColapsar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onSubirBajar: (d: -1 | 1) => void;
  onAtajo: (t: TipoCampo) => void;
  onDuplicarCampo: (id: string) => void;
  onEliminarCampo: (id: string) => void;
  onDragCampo: (e: DragEvent, id: string) => void;
  onDragSeccion: (e: DragEvent) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, seccionId: string, antesDe?: string) => void;
}) {
  const activa = seleccion?.seccionId === s.id;
  const esLaSeccion = seleccion?.k === "seccion" && activa;
  const zona = `sec-${s.id}`;

  return (
    <section
      aria-label={`Sección ${s.titulo}`}
      onDragOver={(e) => onDragOver(e, zona)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, s.id)}
      className={`rounded-xl border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors ${
        esLaSeccion ? "border-primary shadow-[0_0_0_4px_rgba(83,195,190,.16)]" : activa ? "border-primary" : "border-border"
      } ${dropSobre === zona ? "ring-2 ring-primary/40" : ""}`}
    >
      {/* cabecera */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3.5 ${s.colapsada ? "" : "border-b border-border"}`}
        onClick={() => onSeleccionar({ k: "seccion", seccionId: s.id })}
      >
        <span
          draggable
          onDragStart={onDragSeccion}
          aria-label="Arrastrar sección"
          className="cursor-grab text-[color:var(--track)] active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </span>
        <input
          value={s.titulo}
          onChange={(e) => onTitulo(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Título de la sección"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-[15px] font-bold outline-none focus:bg-muted"
        />
        <span role="radiogroup" aria-label="Columnas" className="flex gap-1 rounded-[9px] bg-muted p-[3px]">
          {([1, 2, 3] as Ancho[]).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={s.columnas === n}
              aria-label={`${n} columnas`}
              onClick={(e) => {
                e.stopPropagation();
                onColumnas(n);
              }}
              className={`${mono} h-7 w-8 rounded-[7px] text-[11.5px] font-bold transition-colors ${focusRing} ${
                s.columnas === n ? "bg-card text-foreground shadow-[0_1px_2px_rgba(17,24,39,.1)]" : "text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </span>
        <IconBtn label="Subir sección" disabled={primera} onClick={() => onSubirBajar(-1)}>
          <ChevronUp className="h-[15px] w-[15px]" strokeWidth={2} />
        </IconBtn>
        <IconBtn label="Bajar sección" disabled={ultima} onClick={() => onSubirBajar(1)}>
          <ChevronDown className="h-[15px] w-[15px]" strokeWidth={2} />
        </IconBtn>
        <IconBtn label="Duplicar sección" onClick={onDuplicar}>
          <Copy className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </IconBtn>
        <IconBtn label="Eliminar sección" onClick={onEliminar}>
          <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </IconBtn>
      </div>

      {s.colapsada ? (
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-2.5">
          <span className={`${mono} text-[11px] text-muted-foreground`}>
            {s.campos.length} campos · {s.columnas} columnas
          </span>
          <button
            type="button"
            onClick={onColapsar}
            className={`ml-auto h-[30px] rounded-lg px-2.5 text-[11.5px] font-semibold text-secondary hover:bg-accent ${focusRing}`}
          >
            Expandir
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3.5">
          {s.campos.length > 0 ? (
            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: `repeat(${s.columnas}, minmax(0, 1fr))` }}
            >
              {s.campos.map((c) => (
                <CampoCard
                  key={c.id}
                  campo={c}
                  columnasSeccion={s.columnas}
                  seleccionado={seleccion?.k === "campo" && seleccion.campoId === c.id}
                  dropAntes={dropSobre === c.id}
                  onSeleccionar={() => onSeleccionar({ k: "campo", seccionId: s.id, campoId: c.id })}
                  onDuplicar={() => onDuplicarCampo(c.id)}
                  onEliminar={() => onEliminarCampo(c.id)}
                  onDragStart={(e) => onDragCampo(e, c.id)}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    onDragOver(e, c.id);
                  }}
                  onDrop={(e) => onDrop(e, s.id, c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] px-4 py-6 text-center text-[12px] text-muted-foreground">
              Suelte aquí un elemento, o use los atajos de abajo.
            </div>
          )}

          {/* atajos */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] p-2.5">
            <span className={`${kicker} mr-1`}>Agregar</span>
            {ATAJOS.map((t) => {
              const Icono = ICONO_TIPO[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onAtajo(t)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:border-primary hover:text-secondary ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {NOMBRE_TIPO[t]}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onColapsar}
              className={`ml-auto h-8 rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
            >
              Colapsar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CampoCard({
  campo: c,
  columnasSeccion,
  seleccionado,
  dropAntes,
  onSeleccionar,
  onDuplicar,
  onEliminar,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  campo: Campo;
  columnasSeccion: Ancho;
  seleccionado: boolean;
  dropAntes: boolean;
  onSeleccionar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const span = Math.min(c.ancho, columnasSeccion);
  const esGuia = c.tipo === "guia";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={seleccionado}
      aria-label={`${NOMBRE_TIPO[c.tipo]}: ${c.etiqueta}`}
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionar();
      }}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSeleccionar())}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ gridColumn: `span ${span}` }}
      className={`relative min-w-0 cursor-pointer rounded-[10px] bg-card px-3 pb-[13px] pt-3 transition-[border-color,box-shadow] ${focusRing} ${
        seleccionado
          ? "border-2 border-primary shadow-[0_0_0_4px_rgba(83,195,190,.16)]"
          : esGuia
            ? "border border-dashed border-[#d6dde3] bg-muted hover:border-primary"
            : "border border-dashed border-[#d6dde3] hover:border-primary"
      } ${dropAntes ? "before:absolute before:-left-[7px] before:bottom-1 before:top-1 before:w-[3px] before:rounded-full before:bg-primary" : ""}`}
    >
      {/* fila de meta */}
      <div className="flex items-center gap-1.5">
        <GripVertical aria-hidden className="h-[13px] w-[13px] cursor-grab text-[color:var(--track)]" strokeWidth={1.9} />
        <span className="inline-flex h-5 items-center rounded-md bg-muted px-[7px] text-[10px] font-semibold text-muted-foreground">
          {NOMBRE_TIPO[c.tipo]}
        </span>
        {c.auto && (
          <span className="inline-flex h-5 items-center rounded-md bg-accent px-[7px] text-[10px] font-semibold text-accent-foreground">
            auto
          </span>
        )}
        {c.tipo === "tabla" && (
          <span className={`${mono} text-[10.5px] text-muted-foreground`}>
            {c.config.filas?.length ?? 0} × {c.config.columnas?.length ?? 0}
          </span>
        )}
        {!c.enInforme && !esGuia && (
          <span className="inline-flex h-5 items-center rounded-md border border-border px-[7px] text-[10px] font-semibold text-muted-foreground">
            no sale
          </span>
        )}
        {seleccionado && (
          <span className="ml-auto flex gap-0.5">
            <IconBtn label="Duplicar campo" onClick={onDuplicar} small>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            </IconBtn>
            <IconBtn label="Eliminar campo" onClick={onEliminar} small>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </IconBtn>
          </span>
        )}
      </div>

      {!esGuia && c.tipo !== "titulo" && (
        <p className="mb-[7px] mt-[9px] text-[12.5px] font-semibold">
          {c.etiqueta}
          {c.obligatorio && <span className="text-[color:var(--warning-foreground)]"> *</span>}
        </p>
      )}

      <PreviewControl campo={c} />

      {c.predeterminado && !["multitexto", "guia"].includes(c.tipo) && (
        <p className="mt-[7px] text-[10.5px] text-muted-foreground">Trae texto predeterminado</p>
      )}
    </div>
  );
}

/** Cómo se verá el control cuando el médico lo llene. No es interactivo en el lienzo. */
function PreviewControl({ campo: c }: { campo: Campo }) {
  const cfg = c.config;
  switch (c.tipo) {
    case "titulo":
      return (
        <p className={`mt-2 font-extrabold ${cfg.nivel === "h2" ? "text-[17px]" : "text-[14.5px]"} ${cfg.divisor ? "border-t border-border pt-2" : ""}`}>
          {c.etiqueta}
        </p>
      );
    case "guia":
      return (
        <div className="mt-2 flex gap-2.5">
          <Info
            aria-hidden
            className={`mt-px h-[15px] w-[15px] shrink-0 ${cfg.tono === "advertencia" ? "text-[color:var(--warning-foreground)]" : "text-secondary"}`}
            strokeWidth={1.75}
          />
          <span className="min-w-0">
            <span className="block text-[11px] font-bold">Guía · no sale en el informe</span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[color:var(--foreground-soft)]">{c.guia}</span>
          </span>
        </div>
      );
    case "texto":
      return <div className={previewBox}>{c.predeterminado || cfg.placeholder || ""}</div>;
    case "multitexto":
      return (
        <div
          className={`${previewBox} items-start py-2.5 leading-relaxed text-[color:var(--foreground-soft)]`}
          style={{ height: 20 * (cfg.lineas ?? 3) + 16 }}
        >
          {c.predeterminado}
        </div>
      );
    case "numero":
      return <div className={`${previewBox} ${mono}`}>0</div>;
    case "medida":
      return (
        <div className={`${previewBox} overflow-hidden p-0`}>
          <span className={`${mono} flex-1 px-3`}>{(0).toFixed(cfg.decimales ?? 1)}</span>
          <span className={`${mono} flex h-full items-center border-l border-border bg-muted px-[11px] text-[11.5px] font-semibold text-[color:var(--foreground-soft)]`}>
            {cfg.unidad || "—"}
          </span>
        </div>
      );
    case "fecha":
      return (
        <div className={`${previewBox} ${mono}`}>
          {cfg.formatoFecha === "fecha-hora" ? "dd / mm / aaaa · hh:mm" : "dd / mm / aaaa"}
          <Calendar aria-hidden className="ml-auto h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      );
    case "sino": {
      const par = cfg.etiquetas === "presente" ? ["Presente", "Ausente"] : cfg.etiquetas === "positivo" ? ["Positivo", "Negativo"] : ["Sí", "No"];
      return (
        <div className="flex gap-1.5">
          {[...par, ...(cfg.noValorable ? ["No valorable"] : [])].map((t) => (
            <span key={t} className="grid h-10 flex-1 place-items-center rounded-[9px] border border-border bg-card text-[12px] font-semibold text-[color:var(--foreground-soft)]">
              {t}
            </span>
          ))}
        </div>
      );
    }
    case "opcion":
      if (cfg.presentacion === "segmentado")
        return (
          <div className="flex gap-1 rounded-[9px] bg-muted p-[3px]">
            {(cfg.opciones ?? []).slice(0, 4).map((o) => (
              <span key={o} className="grid h-8 flex-1 place-items-center rounded-[7px] text-[11.5px] font-semibold text-muted-foreground">
                {o}
              </span>
            ))}
          </div>
        );
      if (cfg.presentacion === "casillas")
        return (
          <div className="flex flex-col gap-1.5">
            {(cfg.opciones ?? []).map((o) => (
              <span key={o} className="flex items-center gap-2 text-[12px] text-[color:var(--foreground-soft)]">
                <span className="h-4 w-4 rounded-[5px] border-[1.5px] border-[color:var(--track)]" />
                {o}
              </span>
            ))}
          </div>
        );
      return (
        <div className={previewBox}>
          {cfg.opciones?.[0] ?? "Seleccione"}
          <ChevronDown aria-hidden className="ml-auto h-3.5 w-3.5" strokeWidth={2} />
        </div>
      );
    case "tabla":
      return <TablaPreview campo={c} />;
    case "imagen":
      return (
        <div
          className="grid place-items-center rounded-[10px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
          style={{ aspectRatio: cfg.proporcion === "16:9" ? "16 / 9" : cfg.proporcion === "4:3" ? "4 / 3" : "3 / 2" }}
        >
          <span className="flex flex-col items-center gap-2 text-center">
            <ImagePlus aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            <span className="text-[12px] font-bold">El médico sube aquí una imagen</span>
          </span>
        </div>
      );
    case "galeria":
      return (
        <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-[18px] text-center text-[color:var(--info-foreground)]">
          <ImagePlus aria-hidden className="h-[26px] w-[26px]" strokeWidth={1.75} />
          <span className="text-[12.5px] font-bold">El médico sube aquí varias imágenes</span>
          <span className={`${mono} text-[11px]`}>
            rejilla de {cfg.rejilla} columnas · reordenables · {cfg.minImgs}–{cfg.maxImgs} imágenes
          </span>
        </div>
      );
    case "columnas":
      return (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cfg.subcolumnas ?? 2}, minmax(0, 1fr))` }}>
          {Array.from({ length: cfg.subcolumnas ?? 2 }).map((_, i) => (
            <span key={i} className="h-14 rounded-lg border-[1.5px] border-dashed border-[color:var(--track)]" />
          ))}
        </div>
      );
  }
}

function TablaPreview({ campo: c }: { campo: Campo }) {
  const cols = c.config.columnas ?? [];
  const filas = c.config.filas ?? [];
  const plantillaCols = `1.3fr ${cols.map(() => "1fr").join(" ")} 48px`;
  return (
    <div className="overflow-hidden rounded-[9px] border border-border">
      <div className="grid bg-muted" style={{ gridTemplateColumns: plantillaCols }}>
        <span className="px-[11px] py-[9px] text-[11px] font-bold text-[color:var(--foreground-soft)]">Medida</span>
        {cols.map((col) => (
          <span key={col.id} className="border-l border-border px-[11px] py-[9px] text-[11px] font-bold text-[color:var(--foreground-soft)]">
            {col.nombre}
          </span>
        ))}
        <span className="grid place-items-center border-l border-border text-secondary">
          <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      </div>
      {filas.map((f) => (
        <div key={f} className="grid border-t border-border" style={{ gridTemplateColumns: plantillaCols }}>
          <span className="truncate px-[11px] py-2 text-[11.5px] font-semibold">{f}</span>
          {cols.map((col) => (
            <span key={col.id} className={`border-l border-border px-[11px] py-2 text-[11.5px] text-muted-foreground ${col.tipo !== "texto" ? mono : ""}`}>
              {col.tipo === "texto" ? "—" : col.tipo === "medida" ? "0.0" : "—"}
            </span>
          ))}
          <span className="border-l border-border" />
        </div>
      ))}
      {c.config.filasAbiertas && (
        <div className="border-t border-border px-2 py-1.5">
          <span className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-accent px-2 text-[11px] font-bold text-accent-foreground">
            <Plus aria-hidden className="h-3 w-3" strokeWidth={2.4} />
            fila
          </span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * 3 · PROPIEDADES
 * ══════════════════════════════════════════════════════════════════════ */

function PanelCampo({
  campo: c,
  seccion,
  onCambio,
  onTipo,
}: {
  campo: Campo;
  seccion: Seccion;
  onCambio: (c: Partial<Campo>) => void;
  onTipo: (t: TipoCampo) => void;
}) {
  const Icono = ICONO_TIPO[c.tipo];
  const cfg = c.config;
  const setCfg = (p: Partial<ConfigCampo>) => onCambio({ config: { ...cfg, ...p } });

  return (
    <>
      {/* Identidad */}
      <Bloque>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <Icono className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold">{c.etiqueta}</span>
            <span className="mt-px block text-[11px] text-muted-foreground">en {seccion.titulo}</span>
          </span>
        </div>
        <Campo2 label="Tipo de campo" mt={14}>
          <select value={c.tipo} onChange={(e) => onTipo(e.target.value as TipoCampo)} className={inputBase}>
            {(Object.keys(NOMBRE_TIPO) as TipoCampo[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo2>
        {c.tipo !== "guia" && (
          <Campo2 label="Etiqueta">
            <input value={c.etiqueta} onChange={(e) => onCambio({ etiqueta: e.target.value })} className={inputBase} />
          </Campo2>
        )}
      </Bloque>

      {/* Configuración propia del tipo */}
      <EditorTipo campo={c} setCfg={setCfg} onCambio={onCambio} />

      {/* Ancho y comportamiento */}
      {c.tipo !== "guia" && (
        <Bloque>
          <p className={kicker}>Ancho en la sección</p>
          <Segmentado
            opciones={[
              [1, "1 col"],
              [2, "2 col"],
              [3, "3 col"],
            ]}
            valor={c.ancho}
            onCambio={(v) => onCambio({ ancho: v as Ancho })}
            deshabilitar={(v) => (v as number) > seccion.columnas}
          />
          {c.ancho > seccion.columnas && (
            <p className="mt-2 text-[11px] text-[color:var(--warning-foreground)]">
              La sección tiene {seccion.columnas} columna(s): el campo se ajusta a ese ancho.
            </p>
          )}
          <div className="mt-3">
            {!["titulo", "columnas"].includes(c.tipo) && (
              <Interruptor
                titulo="Obligatorio"
                detalle="no se puede firmar el reporte sin este dato"
                on={c.obligatorio}
                onCambio={(v) => onCambio({ obligatorio: v })}
              />
            )}
            {["numero", "medida", "fecha"].includes(c.tipo) && (
              <Interruptor
                titulo="Se calcula solo"
                detalle={c.tipo === "fecha" ? "p. ej. FPP = FUM + 280 días" : "desde otros campos de la plantilla"}
                on={!!cfg.calculado}
                onCambio={(v) => setCfg({ calculado: v })}
              />
            )}
            <Interruptor
              titulo="Sale en el informe"
              detalle="si lo apaga, solo lo ve el médico"
              on={c.enInforme}
              onCambio={(v) => onCambio({ enInforme: v })}
            />
          </div>
          {cfg.calculado && (
            <Campo2 label="Fórmula">
              <input
                value={cfg.formula ?? ""}
                onChange={(e) => setCfg({ formula: e.target.value })}
                placeholder="fecha_estudio - fum"
                className={`${inputBase} ${mono}`}
              />
            </Campo2>
          )}
        </Bloque>
      )}

      {/* Ayuda al médico */}
      <Bloque ultimo>
        <p className={kicker}>{c.tipo === "guia" ? "Contenido de la guía" : "Ayuda al médico"}</p>
        <Campo2 label="Texto guía" mt={10} nota="Orienta al médico; no sale en el informe.">
          <textarea
            rows={c.tipo === "guia" ? 4 : 2}
            value={c.guia}
            onChange={(e) => onCambio({ guia: e.target.value })}
            className={`${inputBase} h-auto resize-none py-2.5 leading-relaxed`}
          />
        </Campo2>
        {!["guia", "titulo", "sino", "opcion", "imagen", "galeria", "tabla", "columnas", "fecha"].includes(c.tipo) && (
          <Campo2 label="Contenido predeterminado" nota="Texto que ya trae el campo y el médico edita.">
            <textarea
              rows={2}
              value={c.predeterminado}
              onChange={(e) => onCambio({ predeterminado: e.target.value })}
              className={`${inputBase} h-auto resize-none py-2.5 leading-relaxed`}
            />
          </Campo2>
        )}
      </Bloque>
    </>
  );
}

function EditorTipo({
  campo: c,
  setCfg,
  onCambio,
}: {
  campo: Campo;
  setCfg: (p: Partial<ConfigCampo>) => void;
  onCambio: (c: Partial<Campo>) => void;
}) {
  const cfg = c.config;
  switch (c.tipo) {
    case "texto":
      return (
        <Bloque>
          <p className={kicker}>Texto</p>
          <Campo2 label="Placeholder" mt={10}>
            <input value={cfg.placeholder ?? ""} onChange={(e) => setCfg({ placeholder: e.target.value })} className={inputBase} />
          </Campo2>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo2 label="Límite de caracteres">
              <NumInput valor={cfg.limite} onCambio={(v) => setCfg({ limite: v })} />
            </Campo2>
            <Campo2 label="Prellenado desde">
              <select value={cfg.prellenado ?? ""} onChange={(e) => setCfg({ prellenado: e.target.value as ConfigCampo["prellenado"] })} className={inputBase}>
                <option value="">Nada</option>
                <option value="paciente">Paciente</option>
                <option value="medico">Médico</option>
                <option value="expediente">Expediente</option>
                <option value="equipo">Equipo</option>
              </select>
            </Campo2>
          </div>
          <div className="mt-2">
            <Interruptor titulo="Solo lectura" detalle="el médico lo ve pero no lo edita" on={!!cfg.soloLectura} onCambio={(v) => setCfg({ soloLectura: v })} />
          </div>
        </Bloque>
      );
    case "multitexto":
      return (
        <Bloque>
          <p className={kicker}>Párrafo</p>
          <Campo2 label="Placeholder" mt={10}>
            <input value={cfg.placeholder ?? ""} onChange={(e) => setCfg({ placeholder: e.target.value })} className={inputBase} />
          </Campo2>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo2 label="Alto (líneas)">
              <NumInput valor={cfg.lineas} onCambio={(v) => setCfg({ lineas: v })} />
            </Campo2>
            <Campo2 label="Límite">
              <NumInput valor={cfg.limite} onCambio={(v) => setCfg({ limite: v })} />
            </Campo2>
          </div>
          <Campo2 label="Formato">
            <Segmentado
              opciones={[
                ["plano", "Solo texto"],
                ["basico", "Negrita y listas"],
              ]}
              valor={cfg.formato}
              onCambio={(v) => setCfg({ formato: v as ConfigCampo["formato"] })}
            />
          </Campo2>
          <ListaEditable
            titulo="Frases rápidas"
            nota="El médico las inserta con un clic."
            items={cfg.frasesRapidas ?? []}
            onCambio={(frasesRapidas) => setCfg({ frasesRapidas })}
            placeholder="Nueva frase…"
          />
        </Bloque>
      );
    case "numero":
    case "medida":
      return (
        <Bloque>
          <p className={kicker}>Valor</p>
          <div className="grid grid-cols-2 gap-2.5">
            {c.tipo === "medida" && (
              <Campo2 label="Unidad">
                <select value={cfg.unidad} onChange={(e) => setCfg({ unidad: e.target.value })} className={`${inputBase} ${mono}`}>
                  {["mm", "cm", "mL", "cm³", "sem", "cm/s", "g", "bpm", "%"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Campo2>
            )}
            <Campo2 label="Decimales">
              <NumInput valor={cfg.decimales} onCambio={(v) => setCfg({ decimales: v })} />
            </Campo2>
            <Campo2 label="Mínimo">
              <NumInput valor={cfg.min} onCambio={(v) => setCfg({ min: v })} />
            </Campo2>
            <Campo2 label="Máximo">
              <NumInput valor={cfg.max} onCambio={(v) => setCfg({ max: v })} />
            </Campo2>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Fuera de rango se marca en ámbar al médico; no bloquea el reporte.
          </p>
          {c.tipo === "medida" && (
            <div className="grid grid-cols-2 gap-2.5">
              <Campo2 label="Referencia normal · mín">
                <NumInput valor={cfg.refMin} onCambio={(v) => setCfg({ refMin: v })} />
              </Campo2>
              <Campo2 label="· máx">
                <NumInput valor={cfg.refMax} onCambio={(v) => setCfg({ refMax: v })} />
              </Campo2>
            </div>
          )}
        </Bloque>
      );
    case "fecha":
      return (
        <Bloque>
          <p className={kicker}>Fecha</p>
          <Campo2 label="Formato" mt={10}>
            <Segmentado
              opciones={[
                ["fecha", "Fecha"],
                ["fecha-hora", "Fecha y hora"],
              ]}
              valor={cfg.formatoFecha}
              onCambio={(v) => setCfg({ formatoFecha: v as ConfigCampo["formatoFecha"] })}
            />
          </Campo2>
          <Campo2 label="Valor predeterminado">
            <select value={cfg.fechaDefecto} onChange={(e) => setCfg({ fechaDefecto: e.target.value as ConfigCampo["fechaDefecto"] })} className={inputBase}>
              <option value="vacia">Vacía</option>
              <option value="hoy">Hoy</option>
              <option value="estudio">Fecha del estudio</option>
            </select>
          </Campo2>
          <Campo2 label="Rango permitido">
            <Segmentado
              opciones={[
                ["libre", "Libre"],
                ["pasado", "Sin futuras"],
                ["futuro", "Solo futuras"],
              ]}
              valor={cfg.rango}
              onCambio={(v) => setCfg({ rango: v as ConfigCampo["rango"] })}
            />
          </Campo2>
        </Bloque>
      );
    case "tabla":
      return (
        <>
          <Bloque>
            <div className="flex items-center">
              <p className={kicker}>Columnas</p>
              <button
                type="button"
                onClick={() =>
                  setCfg({ columnas: [...(cfg.columnas ?? []), { id: uid("c"), nombre: "Nueva columna", tipo: "texto" }] })
                }
                className={`ml-auto rounded text-[11px] font-bold text-secondary ${focusRing}`}
              >
                + columna
              </button>
            </div>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {(cfg.columnas ?? []).map((col, i) => (
                <div key={col.id} className="flex items-center gap-2 rounded-[9px] border border-border px-2.5 py-2">
                  <GripVertical aria-hidden className="h-[13px] w-[13px] text-[color:var(--track)]" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1">
                    <input
                      value={col.nombre}
                      onChange={(e) => {
                        const columnas = [...(cfg.columnas ?? [])];
                        columnas[i] = { ...col, nombre: e.target.value };
                        setCfg({ columnas });
                      }}
                      className="w-full bg-transparent text-[12px] font-semibold outline-none"
                    />
                    <select
                      value={col.tipo}
                      onChange={(e) => {
                        const columnas = [...(cfg.columnas ?? [])];
                        columnas[i] = { ...col, tipo: e.target.value as ColumnaTabla["tipo"] };
                        setCfg({ columnas });
                      }}
                      className={`${mono} mt-0.5 bg-transparent text-[10.5px] text-muted-foreground outline-none`}
                    >
                      <option value="texto">Texto</option>
                      <option value="numero">Número</option>
                      <option value="medida">Medida · {col.unidad ?? "mm"}</option>
                      <option value="opcion">Opción</option>
                    </select>
                  </span>
                  <IconBtn
                    label={`Quitar ${col.nombre}`}
                    small
                    onClick={() => setCfg({ columnas: (cfg.columnas ?? []).filter((x) => x.id !== col.id) })}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </IconBtn>
                </div>
              ))}
            </div>
          </Bloque>
          <Bloque>
            <p className={kicker}>Filas</p>
            <Segmentado
              opciones={[
                [false, "Fijas"],
                [true, "El médico agrega"],
              ]}
              valor={!!cfg.filasAbiertas}
              onCambio={(v) => setCfg({ filasAbiertas: v as boolean })}
            />
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Fijas: el médico solo llena valores. Si el médico agrega, la tabla empieza con estas y puede sumar más.
            </p>
            <ListaEditable items={cfg.filas ?? []} onCambio={(filas) => setCfg({ filas })} placeholder="Nueva fila…" chips />
          </Bloque>
          <Bloque>
            <p className={kicker}>Comportamiento</p>
            <div className="mt-1">
              <Interruptor
                titulo="Mostrar vacía si no se llena"
                detalle="si lo apaga, la tabla no sale en el informe"
                on={!!cfg.mostrarVacia}
                onCambio={(v) => setCfg({ mostrarVacia: v })}
              />
              <Interruptor
                titulo="Calcular percentiles"
                detalle="con la tabla de referencia del programa"
                on={!!cfg.percentiles}
                onCambio={(v) => setCfg({ percentiles: v })}
              />
            </div>
          </Bloque>
        </>
      );
    case "sino":
      return (
        <Bloque>
          <p className={kicker}>Respuestas</p>
          <Campo2 label="Etiquetas" mt={10}>
            <Segmentado
              opciones={[
                ["sino", "Sí / No"],
                ["presente", "Presente"],
                ["positivo", "Positivo"],
              ]}
              valor={cfg.etiquetas}
              onCambio={(v) => setCfg({ etiquetas: v as ConfigCampo["etiquetas"] })}
            />
          </Campo2>
          <div className="mt-2">
            <Interruptor titulo="Incluir “No valorable”" detalle="" on={!!cfg.noValorable} onCambio={(v) => setCfg({ noValorable: v })} />
          </div>
        </Bloque>
      );
    case "opcion":
      return (
        <Bloque>
          <p className={kicker}>Opciones</p>
          <Campo2 label="Presentación" mt={10}>
            <Segmentado
              opciones={[
                ["menu", "Menú"],
                ["segmentado", "Botones"],
                ["casillas", "Casillas"],
              ]}
              valor={cfg.presentacion}
              onCambio={(v) => setCfg({ presentacion: v as ConfigCampo["presentacion"] })}
            />
          </Campo2>
          {cfg.presentacion === "segmentado" && (cfg.opciones?.length ?? 0) > 4 && (
            <p className="mt-2 text-[11px] text-[color:var(--warning-foreground)]">Los botones muestran hasta 4 opciones.</p>
          )}
          <ListaEditable items={cfg.opciones ?? []} onCambio={(opciones) => setCfg({ opciones })} placeholder="Nueva opción…" />
          <div className="mt-2">
            <Interruptor titulo="Selección múltiple" detalle="" on={!!cfg.multiple} onCambio={(v) => setCfg({ multiple: v })} />
            <Interruptor titulo="Incluir “Otro”" detalle="con un campo de texto" on={!!cfg.incluirOtro} onCambio={(v) => setCfg({ incluirOtro: v })} />
          </div>
        </Bloque>
      );
    case "imagen":
    case "galeria":
      return (
        <Bloque>
          <p className={kicker}>{c.tipo === "imagen" ? "Imagen" : "Galería"}</p>
          <Campo2 label="Origen" mt={10}>
            <Segmentado
              opciones={[
                ["dicom", "Estudio"],
                ["subida", "Subida"],
                ["ambos", "Ambos"],
              ]}
              valor={cfg.origen}
              onCambio={(v) => setCfg({ origen: v as ConfigCampo["origen"] })}
            />
          </Campo2>
          {c.tipo === "imagen" ? (
            <Campo2 label="Proporción">
              <Segmentado
                opciones={[
                  ["libre", "Libre"],
                  ["4:3", "4:3"],
                  ["16:9", "16:9"],
                ]}
                valor={cfg.proporcion}
                onCambio={(v) => setCfg({ proporcion: v as ConfigCampo["proporcion"] })}
              />
            </Campo2>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <Campo2 label="Mínimo">
                  <NumInput valor={cfg.minImgs} onCambio={(v) => setCfg({ minImgs: v })} />
                </Campo2>
                <Campo2 label="Máximo">
                  <NumInput valor={cfg.maxImgs} onCambio={(v) => setCfg({ maxImgs: v })} />
                </Campo2>
              </div>
              <Campo2 label="Rejilla en el informe">
                <Segmentado
                  opciones={[
                    [2, "2 col"],
                    [3, "3 col"],
                    [4, "4 col"],
                  ]}
                  valor={cfg.rejilla}
                  onCambio={(v) => setCfg({ rejilla: v as ConfigCampo["rejilla"] })}
                />
              </Campo2>
            </>
          )}
          <div className="mt-2">
            <Interruptor titulo="Pie de imagen" detalle="el médico describe cada una" on={!!cfg.pie} onCambio={(v) => setCfg({ pie: v })} />
            {c.tipo === "imagen" && (
              <Interruptor titulo="Permitir anotaciones" detalle="flechas y mediciones" on={!!cfg.anotaciones} onCambio={(v) => setCfg({ anotaciones: v })} />
            )}
          </div>
        </Bloque>
      );
    case "guia":
      return (
        <Bloque>
          <p className={kicker}>Tono</p>
          <Segmentado
            opciones={[
              ["neutral", "Neutral"],
              ["advertencia", "Advertencia"],
            ]}
            valor={cfg.tono}
            onCambio={(v) => setCfg({ tono: v as ConfigCampo["tono"] })}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">La guía nunca sale en el informe.</p>
        </Bloque>
      );
    case "titulo":
      return (
        <Bloque>
          <p className={kicker}>Título</p>
          <Campo2 label="Nivel" mt={10}>
            <Segmentado
              opciones={[
                ["h2", "Grande"],
                ["h3", "Mediano"],
              ]}
              valor={cfg.nivel}
              onCambio={(v) => setCfg({ nivel: v as ConfigCampo["nivel"] })}
            />
          </Campo2>
          <div className="mt-2">
            <Interruptor titulo="Línea divisoria arriba" detalle="" on={!!cfg.divisor} onCambio={(v) => setCfg({ divisor: v })} />
          </div>
        </Bloque>
      );
    case "columnas":
      return (
        <Bloque>
          <p className={kicker}>Sub-columnas</p>
          <Segmentado
            opciones={[
              [2, "2"],
              [3, "3"],
              [4, "4"],
            ]}
            valor={cfg.subcolumnas}
            onCambio={(v) => setCfg({ subcolumnas: v as ConfigCampo["subcolumnas"] })}
          />
        </Bloque>
      );
  }
  void onCambio;
  return null;
}

function PanelSeccion({ seccion: s, onCambio }: { seccion: Seccion; onCambio: (c: Partial<Seccion>) => void }) {
  return (
    <>
      <Bloque>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <LayoutPanelTop className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold">{s.titulo}</span>
            <span className={`${mono} mt-px block text-[11px] text-muted-foreground`}>{s.campos.length} campos</span>
          </span>
        </div>
        <Campo2 label="Título" mt={14}>
          <input value={s.titulo} onChange={(e) => onCambio({ titulo: e.target.value })} className={inputBase} />
        </Campo2>
      </Bloque>
      <Bloque ultimo>
        <p className={kicker}>Rejilla</p>
        <Segmentado
          opciones={[
            [1, "1 col"],
            [2, "2 col"],
            [3, "3 col"],
          ]}
          valor={s.columnas}
          onCambio={(v) => onCambio({ columnas: v as Ancho })}
        />
        <div className="mt-3">
          <Interruptor titulo="Sale en el informe" detalle="si lo apaga, la sección solo sirve para capturar" on={s.enInforme} onCambio={(v) => onCambio({ enInforme: v })} />
          <Interruptor titulo="Colapsada en el lienzo" detalle="solo afecta a esta vista" on={s.colapsada} onCambio={(v) => onCambio({ colapsada: v })} />
        </div>
      </Bloque>
    </>
  );
}

function PanelPlantilla({ plantilla }: { plantilla: Plantilla }) {
  return (
    <Bloque ultimo>
      <p className={kicker}>Plantilla</p>
      <p className="mt-2.5 text-[13.5px] font-bold">{plantilla.nombre}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {plantilla.estudio} · {plantilla.secciones.length} secciones
      </p>
      <p className="mt-4 text-[12px] leading-relaxed text-[color:var(--foreground-soft)]">
        Seleccione una sección o un campo en el lienzo para editar sus propiedades.
      </p>
    </Bloque>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * PIEZAS DE FORMULARIO
 * ══════════════════════════════════════════════════════════════════════ */

function Bloque({ children, ultimo }: { children: ReactNode; ultimo?: boolean }) {
  return <div className={`px-[18px] py-4 ${ultimo ? "" : "border-b border-border"}`}>{children}</div>;
}

function Campo2({ label, children, mt = 12, nota }: { label: string; children: ReactNode; mt?: number; nota?: string }) {
  return (
    <label className="block" style={{ marginTop: mt }}>
      <span className="block text-[11.5px] font-semibold">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {nota && <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{nota}</span>}
    </label>
  );
}

function NumInput({ valor, onCambio }: { valor?: number; onCambio: (v: number | undefined) => void }) {
  return (
    <input
      inputMode="decimal"
      value={valor ?? ""}
      onChange={(e) => {
        const v = e.target.value.trim();
        onCambio(v === "" ? undefined : Number(v));
      }}
      className={`${inputBase} ${mono} font-semibold`}
    />
  );
}

function Segmentado<T extends string | number | boolean>({
  opciones,
  valor,
  onCambio,
  deshabilitar,
}: {
  opciones: [T, string][];
  valor: T | undefined;
  onCambio: (v: T) => void;
  deshabilitar?: (v: T) => boolean;
}) {
  return (
    <span role="radiogroup" className="mt-1.5 flex gap-1 rounded-[10px] bg-muted p-[3px]">
      {opciones.map(([v, t]) => {
        const on = v === valor;
        const off = deshabilitar?.(v);
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => onCambio(v)}
            className={`h-8 flex-1 rounded-lg text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
              on ? "bg-card font-bold text-foreground shadow-[0_1px_2px_rgba(17,24,39,.1)]" : "font-semibold text-muted-foreground"
            }`}
          >
            {t}
          </button>
        );
      })}
    </span>
  );
}

function Interruptor({
  titulo,
  detalle,
  on,
  onCambio,
}: {
  titulo: string;
  detalle?: string;
  on: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-[11px] first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold">{titulo}</span>
        {detalle && <span className="mt-0.5 block text-[11px] text-muted-foreground">{detalle}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={titulo}
        onClick={() => onCambio(!on)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${focusRing} ${on ? "bg-primary" : "bg-[color:var(--track)]"}`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card shadow-[0_1px_2px_rgba(17,24,39,.2)] transition-all ${on ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function ListaEditable({
  items,
  onCambio,
  placeholder,
  titulo,
  nota,
  chips,
}: {
  items: string[];
  onCambio: (v: string[]) => void;
  placeholder: string;
  titulo?: string;
  nota?: string;
  chips?: boolean;
}) {
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    const v = nuevo.trim();
    if (!v) return;
    onCambio([...items, v]);
    setNuevo("");
  };
  return (
    <div className="mt-3">
      {titulo && <span className="block text-[11.5px] font-semibold">{titulo}</span>}
      <div className={`${titulo ? "mt-1.5" : ""} ${chips ? "flex flex-wrap gap-1.5" : "flex flex-col gap-1.5"}`}>
        {items.map((it, i) =>
          chips ? (
            <span key={`${it}-${i}`} className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-border bg-muted px-2 text-[11px] font-semibold text-[color:var(--foreground-soft)]">
              {it}
              <button type="button" aria-label={`Quitar ${it}`} onClick={() => onCambio(items.filter((_, j) => j !== i))} className="text-muted-foreground">
                <X aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              </button>
            </span>
          ) : (
            <span key={`${it}-${i}`} className="flex items-center gap-2 rounded-[9px] border border-border px-2.5 py-1.5">
              <GripVertical aria-hidden className="h-[13px] w-[13px] text-[color:var(--track)]" strokeWidth={1.9} />
              <input
                value={it}
                onChange={(e) => onCambio(items.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
              />
              <IconBtn label={`Quitar ${it}`} small onClick={() => onCambio(items.filter((_, j) => j !== i))}>
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </IconBtn>
            </span>
          ),
        )}
      </div>
      <span className="mt-1.5 flex gap-1.5">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
          placeholder={placeholder}
          className={`${inputBase} h-9`}
        />
        <button
          type="button"
          onClick={agregar}
          aria-label="Agregar"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground ${focusRing}`}
        >
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </span>
      {nota && <span className="mt-1.5 block text-[11px] text-muted-foreground">{nota}</span>}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
  small,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 ${focusRing} ${
        small ? "h-[26px] w-[26px]" : "h-8 w-8"
      }`}
    >
      {children}
    </button>
  );
}

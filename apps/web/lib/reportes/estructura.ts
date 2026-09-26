/**
 * Contrato COMPARTIDO de la estructura de una plantilla de reporte (§6/§6.5).
 *
 * Es la forma que persiste `lxp.plantillas_reporte.estructura` (jsonb). Lo escribe el
 * CONSTRUCTOR del diseñador (Studio · §5B/§5C) y lo LEE el generador del médico (campus).
 * Un solo contrato para las dos puntas: la MISMA estructura se EDITA en el Studio y se
 * RENDERIZA idéntica en el reporte del médico (cards + grid).
 *
 * No lleva `server-only` — lo importan componentes cliente de ambos lados. Solo tipos +
 * helpers puros.
 *
 * Modelo por BLOQUES/CARDS (fiel al reporte "Ultrasonido abdominal"):
 *   · Una plantilla = N SECCIONES; cada sección es una CARD.
 *   · La sección `encabezado` = card "Datos del estudio" (campos del paciente), EDITABLE.
 *   · Las secciones `hallazgos` = cards de redacción (campos tipados).
 *   · Cada sección tiene un GRID (`columnas` 1–4); cada campo ocupa `span` columnas.
 *
 * Tipos de campo (§5C): texto · multitexto · numero · medida · fecha · tabla · sino ·
 * opcion · imagen · guia · titulo. La IMAGEN distingue origen `referencia` (fija de la
 * plantilla) vs `dicom` (hueco que el médico llena con su estudio, visor real).
 */

export type TipoCampo =
  | 'texto' // input de una línea
  | 'multitexto' // textarea (hallazgos, párrafos)
  | 'numero' // numérico simple (edad…)
  | 'medida' // numérico + unidad (mm/cm/cc)
  | 'dimensiones' // medida compuesta: __ × __ × __ unidad (2 o 3 ejes). Valor = number[]
  | 'fecha' // selector de fecha
  | 'tabla' // rejilla filas × columnas (mediciones obstétrico/carótida)
  | 'sino' // checkbox / sí-no
  | 'opcion' // selección de UNA de una lista
  | 'multiseleccion' // varias de una lista (casillas). Valor = string[]
  | 'imagen' // referencia fija | hueco DICOM
  | 'galeria' // galería: el médico sube VARIAS imágenes (grid 2 col, reordenables)
  | 'guia' // texto de ayuda/instrucciones (no editable, no sale en el informe)
  | 'titulo'; // subtítulo dentro de la card

export type OrigenImagen = 'referencia' | 'dicom';
export type TipoSeccion = 'encabezado' | 'hallazgos';

export type CampoPlantilla = {
  id: string;
  tipo: TipoCampo;
  /** Etiqueta del campo. En `guia`/`titulo` es el texto que se muestra. */
  nombre: string;
  /** Sugerencia que orienta al médico mientras dicta; NO sale en el informe. */
  guia?: string;
  /** Columnas del grid que ocupa (1–4). Ausente = fila completa. */
  span?: number;
  /** `medida`: unidad de la respuesta (mm, cm, cc…). */
  unidad?: string;
  /** `opcion`: valores posibles de la selección. */
  opciones?: string[];
  /** `imagen`: de dónde sale (fija de la plantilla vs estudio del médico). */
  origen?: OrigenImagen;
  /** `imagen` + `origen: 'referencia'`: URL de la imagen fija. */
  refUrl?: string;
  /** `tabla`: encabezados de columna. */
  columnas?: string[];
  /** `tabla`: etiquetas de fila (primera celda de cada fila). */
  filas?: string[];
  /** Campo de solo lectura autollenado (ej. expediente): visible pero no editable. */
  bloqueado?: boolean;
  /**
   * Contenido PREDETERMINADO del campo (texto/multitexto): el boilerplate clínico que
   * trae la plantilla (Familia A · Fase 2) con los `xx`/`___` intactos. Se copia a
   * `contenido.valores` al crear el reporte; el médico lo edita y rellena.
   */
  valorDefecto?: string;
  /**
   * Flags del constructor (1b-1) — OPCIONALES y AUSENTE = comportamiento actual:
   *  · `obligatorio`: gate de Finalizar. Ausente ⇒ requerido (como hoy). `false` ⇒ opcional.
   *  · `enInforme`: si es `false`, el campo NO se muestra en el reporte (solo captura). Ausente ⇒ sale.
   */
  obligatorio?: boolean;
  enInforme?: boolean;

  /* ── Config RICA por tipo (1b-2) — TODAS opcionales · AUSENTE = comportamiento actual ──
   * Se conservan por el passthrough del normalizador; cada una la usa el registro (UI + lógica). */
  /** texto/multitexto/numero: texto de ayuda dentro del control. */
  placeholder?: string;
  /** texto/multitexto: frases que el médico inserta con un clic. */
  frasesRapidas?: string[];
  /** numero/medida: cota inferior/superior sugerida del valor. */
  min?: number;
  max?: number;
  /** numero/medida: decimales con que se formatea el valor. */
  decimales?: number;
  /** medida: rango normal; fuera de él se marca en ÁMBAR (no bloquea). */
  rangoNormalMin?: number;
  rangoNormalMax?: number;
  /** dimensiones: número de ejes (2 o 3, default 3). Valor = number[] de ese largo. */
  ejes?: 2 | 3;
  /** medida: curva de percentiles de referencia (nombre). */
  percentilCurva?: string;
  /** numero/medida: fórmula (se guarda; el cálculo vivo llega después · ver nota en el registro). */
  formulaExpresion?: string;
  formulaCamposFuente?: string[];
  formulaFormato?: string;
  /** opcion/multiseleccion: agrega la opción "Otro" con texto libre. */
  permiteOtro?: boolean;
  /** multiseleccion: mínimo/máximo de casillas marcadas (minSel alimenta el gate). */
  minSel?: number;
  maxSel?: number;
  /** fecha: solo fecha o fecha+hora. */
  formatoFecha?: 'fecha' | 'fecha-hora';
  /** imagen/galeria: proporción del recuadro, mín/máx de imágenes, anotaciones. */
  imagenProporcion?: 'libre' | '4:3' | '16:9';
  imagenMin?: number;
  imagenMax?: number;
  permiteAnotaciones?: boolean;
};

export type SeccionPlantilla = {
  id: string;
  tipo: TipoSeccion;
  titulo: string;
  /** Ancho del grid de la sección (1–4 columnas). */
  columnas: number;
  campos: CampoPlantilla[];
  /** Constructor (1b-1) — OPCIONALES, ausente = comportamiento actual:
   *  · `colapsada`: solo afecta la vista del lienzo del constructor.
   *  · `enInforme`: si es `false`, la sección no se muestra en el reporte. Ausente ⇒ sale. */
  colapsada?: boolean;
  enInforme?: boolean;
};

export type EstructuraPlantilla = {
  secciones: SeccionPlantilla[];
  /** Texto predeterminado de la card fija "Impresión diagnóstica" (boilerplate · Fase 2). */
  impresionDefecto?: string;
};

/* ═══════════════════════ REGISTRO DE TIPOS DE CAMPO (fuente ÚNICA) ═══════════════════════ */
/**
 * Cada `TipoCampo` declara AQUÍ, en un solo lugar, su lógica: rótulo, defaults al crear, chip de
 * formato, check de completitud y normalización de sus llaves propias. `campoNuevo`,
 * `formatoCampo`, `campoCompleto`, `normalizarCampo`, `esCampoEstatico` y `ETIQUETA_TIPO` se
 * GENERAN desde este registro — reemplaza los switch/if antes dispersos. Agregar un tipo o una
 * opción de config es agregar/editar una entrada aquí, no tocar varios archivos.
 *
 * El RENDER (`CampoReporte`) y el editor de config del constructor son JSX de cliente y NO pueden
 * vivir en este módulo (es server-importable): su dispatch por tipo sigue en sus componentes
 * cliente (fase 1b los moverá a un registro de UI paralelo). Las funciones lectoras que usa
 * `completo`/`normalizar` (leerTexto/leerBool/leerRefDicom/leerGaleria, txt/listaTxt) son
 * declaraciones hoisted definidas más abajo, por eso el registro puede referenciarlas.
 */
export type DefCampo = {
  /** Rótulo del tipo (paleta / selector). */
  label: string;
  /** Campo de solo presentación (sin respuesta del médico): guía y título. */
  estatico?: boolean;
  /** Defaults al crear el campo (además de id/tipo/nombre). Muta `c`. */
  defaults?: (c: CampoPlantilla) => void;
  /** Chip de formato de la respuesta (constructor). */
  formato: (c: CampoPlantilla) => string;
  /** ¿El valor cuenta como completo para el checklist del reporte? */
  completo: (c: CampoPlantilla, valor: unknown) => boolean;
  /** Normaliza/limpia las llaves de config PROPIAS del tipo desde el jsonb crudo `o` hacia `c`. */
  normalizar?: (o: Record<string, unknown>, c: CampoPlantilla) => void;
};

const texto = (v: unknown) => leerTexto(v).trim() !== '';

export const REGISTRO_CAMPOS: Record<TipoCampo, DefCampo> = {
  texto: {
    label: 'Texto',
    defaults: (c) => {
      c.span = 1;
    },
    formato: (c) => (c.bloqueado ? 'autollenado' : 'texto de una línea'),
    completo: (_c, v) => texto(v),
  },
  multitexto: {
    label: 'Multitexto',
    formato: () => 'texto libre (párrafo)',
    completo: (_c, v) => texto(v),
  },
  numero: {
    label: 'Número',
    defaults: (c) => {
      c.span = 1;
    },
    formato: () => 'numérico',
    completo: (_c, v) => texto(v),
  },
  medida: {
    label: 'Medida',
    defaults: (c) => {
      c.unidad = 'mm';
      c.span = 1;
    },
    formato: (c) => `${c.unidad?.trim() || '—'} · numérico`,
    completo: (_c, v) => texto(v),
    normalizar: (o, c) => {
      const u = txt(o.unidad);
      if (u) c.unidad = u;
      else delete c.unidad;
    },
  },
  dimensiones: {
    label: 'Dimensiones',
    defaults: (c) => {
      c.ejes = 3;
      c.unidad = 'mm';
      c.span = 1;
    },
    // Chip del constructor: la FORMA del campo (__ × __ × __ mm). El valor formateado (x × y × z)
    // lo produce el render/PDF con `formatearDimensiones`.
    formato: (c) => `${Array.from({ length: c.ejes ?? 3 }, () => '__').join(' × ')} ${c.unidad || 'mm'}`.trim(),
    // Completo = TODOS los ejes con número. El gate lo filtra por `campoRequerido`.
    completo: (c, v) => {
      const ejes = c.ejes === 2 ? 2 : 3;
      const arr = leerDimensiones(v, ejes);
      return arr.length === ejes && arr.every((x) => typeof x === 'number' && Number.isFinite(x));
    },
    normalizar: (o, c) => {
      c.ejes = o.ejes === 2 ? 2 : 3;
      const u = txt(o.unidad);
      if (u) c.unidad = u;
      else delete c.unidad;
    },
  },
  fecha: {
    label: 'Fecha',
    defaults: (c) => {
      c.span = 1;
    },
    formato: () => 'fecha',
    completo: (_c, v) => texto(v),
  },
  tabla: {
    label: 'Tabla',
    defaults: (c) => {
      c.columnas = ['Longitudinal', 'AP', 'Transverso'];
      c.filas = ['Derecho', 'Izquierdo'];
    },
    formato: (c) => `tabla ${c.filas?.length ?? 0}×${c.columnas?.length ?? 0}`,
    completo: (_c, v) =>
      Array.isArray(v) && v.some((f) => Array.isArray(f) && f.some((x) => leerTexto(x).trim() !== '')),
    normalizar: (o, c) => {
      c.columnas = listaTxt(o.columnas);
      c.filas = listaTxt(o.filas);
    },
  },
  sino: {
    label: 'Sí / No',
    defaults: (c) => {
      c.span = 1;
    },
    formato: () => 'sí / no',
    completo: (_c, v) => leerBool(v) !== null,
  },
  opcion: {
    label: 'Opción',
    defaults: (c) => {
      c.span = 1;
      c.opciones = ['normal', 'anormal'];
    },
    formato: (c) => (c.opciones ?? []).filter(Boolean).join(' / ') || 'sin opciones',
    completo: (_c, v) => texto(v),
    normalizar: (o, c) => {
      c.opciones = listaTxt(o.opciones).filter(Boolean);
    },
  },
  multiseleccion: {
    label: 'Casillas',
    defaults: (c) => {
      c.opciones = ['Opción 1', 'Opción 2'];
    },
    // Chip del constructor: describe el conjunto (como Opción). El VALOR (marcadas) se une por
    // ", " en el render del reporte y en el PDF.
    formato: (c) => (c.opciones ?? []).filter(Boolean).join(' / ') || 'sin opciones',
    // ≥ minSel si está definido; si no, ≥1 (has value). El gate lo filtra por `campoRequerido`.
    completo: (c, v) => leerMultiseleccion(v).length >= (typeof c.minSel === 'number' ? c.minSel : 1),
    normalizar: (o, c) => {
      c.opciones = listaTxt(o.opciones).filter(Boolean);
    },
  },
  imagen: {
    label: 'Imagen',
    defaults: (c) => {
      c.origen = 'dicom';
    },
    formato: (c) => (c.origen === 'referencia' ? 'imagen de referencia (fija)' : 'imagen del estudio (DICOM)'),
    completo: (c, v) => (c.origen === 'referencia' ? true : leerRefDicom(v) !== null),
    normalizar: (o, c) => {
      c.origen = o.origen === 'referencia' ? 'referencia' : 'dicom';
      if (c.origen === 'referencia' && txt(o.refUrl)) c.refUrl = txt(o.refUrl);
      else delete c.refUrl;
    },
  },
  galeria: {
    label: 'Galería',
    defaults: (c) => {
      c.nombre = 'Imágenes del estudio';
    },
    formato: () => 'galería · el médico sube varias imágenes',
    // Con `imagenMin` (1b-2) exige ese mínimo; AUSENTE ⇒ ≥1 (igual que hoy) → alimenta el gate.
    completo: (c, v) => leerGaleria(v).length >= (typeof c.imagenMin === 'number' ? c.imagenMin : 1),
  },
  guia: {
    label: 'Guía',
    estatico: true,
    defaults: (c) => {
      c.nombre = 'Aquí van los campos y sugerencias de esta sección.';
    },
    formato: () => 'guía de la plantilla',
    completo: () => true,
  },
  titulo: {
    label: 'Título',
    estatico: true,
    formato: () => 'subtítulo',
    completo: () => true,
  },
};

export const TIPOS_CAMPO: TipoCampo[] = [
  'texto',
  'multitexto',
  'numero',
  'medida',
  'dimensiones',
  'fecha',
  'tabla',
  'sino',
  'opcion',
  'multiseleccion',
  'imagen',
  'galeria',
  'guia',
  'titulo',
];

/** Tipos que el diseñador coloca dentro de una card de hallazgos. */
export const TIPOS_CAMPO_HALLAZGOS = TIPOS_CAMPO;

/** Rótulos por tipo — DERIVADOS del registro (fuente única). */
export const ETIQUETA_TIPO: Record<TipoCampo, string> = Object.fromEntries(
  TIPOS_CAMPO.map((t) => [t, REGISTRO_CAMPOS[t].label]),
) as Record<TipoCampo, string>;

/** Campos del paciente del catálogo estándar (§10 · viven en datos_paciente). */
export type CampoPacienteCatalogo = {
  id: string;
  nombre: string;
  tipo: TipoCampo;
  span?: number;
  opciones?: string[];
  bloqueado?: boolean;
};

export const CAMPOS_PACIENTE_CATALOGO: CampoPacienteCatalogo[] = [
  { id: 'paciente', nombre: 'Paciente', tipo: 'texto' },
  { id: 'edad', nombre: 'Edad', tipo: 'numero', span: 1 },
  { id: 'sexo', nombre: 'Sexo', tipo: 'opcion', opciones: ['Masculino', 'Femenino'], span: 1 },
  { id: 'expediente', nombre: 'Expediente', tipo: 'texto', span: 1, bloqueado: true },
  { id: 'fechaEstudio', nombre: 'Fecha del estudio', tipo: 'fecha', span: 1 },
  { id: 'solicitante', nombre: 'Médico solicitante', tipo: 'texto', span: 1 },
  { id: 'equipo', nombre: 'Equipo', tipo: 'texto', span: 1 },
  { id: 'motivo', nombre: 'Motivo del estudio', tipo: 'texto', span: 99 },
];

/** Construye un campo de plantilla a partir de una entrada del catálogo de paciente. */
export function campoPacienteDesdeCatalogo(p: CampoPacienteCatalogo): CampoPlantilla {
  const c: CampoPlantilla = { id: p.id, tipo: p.tipo, nombre: p.nombre };
  if (p.span) c.span = p.span;
  if (p.opciones) c.opciones = [...p.opciones];
  if (p.bloqueado) c.bloqueado = true;
  return c;
}

/** ¿Es un campo de solo presentación (sin respuesta del médico)? — del registro. */
export function esCampoEstatico(t: TipoCampo): boolean {
  return REGISTRO_CAMPOS[t].estatico === true;
}

/** Descripción corta del formato de la respuesta (chip del campo) — del registro. */
export function formatoCampo(c: CampoPlantilla): string {
  return REGISTRO_CAMPOS[c.tipo].formato(c);
}

export function estructuraVacia(): EstructuraPlantilla {
  return { secciones: [] };
}

export function contarCampos(e: EstructuraPlantilla): number {
  return e.secciones.reduce((n, s) => n + s.campos.filter((c) => !esCampoEstatico(c.tipo)).length, 0);
}

/**
 * Cuenta TODAS las imágenes presentes en un reporte, de cualquier formato y fuente (§6.5):
 * galería "Imágenes del estudio" (JPG/PNG/.dcm), campo `imagen/dicom` clínico (PickerEstudio) e
 * `imagen/referencia` fija de la plantilla. Fuente de verdad ÚNICA del contador (card del editor
 * y columna del listado) — antes solo miraba `origen:'dicom'` y daba 0 con galería/JPG/PNG.
 */
export function contarImagenesReporte(e: EstructuraPlantilla, valores: Record<string, unknown>): number {
  let n = 0;
  for (const s of e.secciones) {
    for (const c of s.campos) {
      if (c.tipo === 'galeria') n += leerGaleria(valores[c.id]).length;
      else if (c.tipo === 'imagen') {
        if (c.origen === 'referencia') {
          if (c.refUrl) n += 1;
        } else if (leerRefDicom(valores[c.id])) {
          n += 1;
        }
      }
    }
  }
  return n;
}

/* ───────────────────────── Fábricas ───────────────────────── */

function idAleatorio(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.floor(Math.random() * 1e9).toString(36);
}

export function nuevoId(prefijo: string): string {
  return `${prefijo}_${idAleatorio()}`;
}

/** Card de encabezado por defecto: los datos del paciente en grid de 3 (como el reporte). */
export function seccionEncabezadoPorDefecto(): SeccionPlantilla {
  return {
    id: nuevoId('s'),
    tipo: 'encabezado',
    titulo: 'Datos del estudio',
    columnas: 3,
    campos: CAMPOS_PACIENTE_CATALOGO.map(campoPacienteDesdeCatalogo),
  };
}

export function seccionHallazgosNueva(titulo = 'Nueva sección'): SeccionPlantilla {
  return { id: nuevoId('s'), tipo: 'hallazgos', titulo, columnas: 1, campos: [] };
}

export function campoNuevo(tipo: TipoCampo): CampoPlantilla {
  const base: CampoPlantilla = { id: nuevoId('c'), tipo, nombre: '' };
  REGISTRO_CAMPOS[tipo].defaults?.(base);
  return base;
}

/* ───────────────────────── Normalizador tolerante ───────────────────────── */

function esTipoCampo(v: unknown): v is TipoCampo {
  return typeof v === 'string' && (TIPOS_CAMPO as string[]).includes(v);
}
function txt(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function listaTxt(v: unknown): string[] {
  return Array.isArray(v) ? v.map(txt) : [];
}

function normalizarCampo(raw: unknown, i: number): CampoPlantilla | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  // Tipo desconocido → fallback genérico 'texto' (NO se descarta el campo · forward-compatible).
  const tipo: TipoCampo = esTipoCampo(o.tipo) ? o.tipo : 'texto';
  // PASSTHROUGH: parte de una copia del crudo → conserva llaves DESCONOCIDAS (config futura no se
  // pierde). Encima normaliza las llaves base y, vía el registro, las propias del tipo.
  const c = { ...o } as Record<string, unknown>;
  c.id = txt(o.id) || `c${i + 1}`;
  c.tipo = tipo;
  c.nombre = txt(o.nombre);
  if (txt(o.guia)) c.guia = txt(o.guia);
  else delete c.guia;
  if (num(o.span) !== undefined) c.span = num(o.span);
  else delete c.span;
  if (o.bloqueado === true) c.bloqueado = true;
  else delete c.bloqueado;
  if (typeof o.valorDefecto === 'string' && o.valorDefecto) c.valorDefecto = o.valorDefecto;
  else delete c.valorDefecto;
  // Flags del constructor (1b-1): solo se conservan si vienen como booleano explícito.
  if (typeof o.obligatorio === 'boolean') c.obligatorio = o.obligatorio;
  else delete c.obligatorio;
  if (typeof o.enInforme === 'boolean') c.enInforme = o.enInforme;
  else delete c.enInforme;
  REGISTRO_CAMPOS[tipo].normalizar?.(o, c as CampoPlantilla);
  return c as CampoPlantilla;
}

function normalizarSeccion(raw: unknown, i: number): SeccionPlantilla | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tipo: TipoSeccion = o.tipo === 'encabezado' ? 'encabezado' : 'hallazgos';
  const campos = Array.isArray(o.campos)
    ? o.campos.map((c, j) => normalizarCampo(c, j)).filter((c): c is CampoPlantilla => c !== null)
    : [];
  const columnas = Math.min(4, Math.max(1, num(o.columnas) ?? 1));
  const s: SeccionPlantilla = { id: txt(o.id) || `s${i + 1}`, tipo, titulo: txt(o.titulo) || `Sección ${i + 1}`, columnas, campos };
  if (typeof o.colapsada === 'boolean') s.colapsada = o.colapsada;
  if (typeof o.enInforme === 'boolean') s.enInforme = o.enInforme;
  return s;
}

/** Parsea el jsonb persistido a una estructura completa (tolera plantillas viejas/parciales). */
export function normalizarEstructura(raw: unknown): EstructuraPlantilla {
  // Auto-sana filas DOBLE-CODIFICADAS: si el jsonb quedó como texto JSON (string), se re-parsea
  // antes de rendir/chequear — así una plantilla mal guardada igual muestra sus secciones/campos.
  let dato = raw;
  for (let i = 0; i < 3 && typeof dato === 'string'; i++) {
    try {
      dato = JSON.parse(dato);
    } catch {
      return estructuraVacia();
    }
  }
  if (!dato || typeof dato !== 'object') return estructuraVacia();
  const o = dato as Record<string, unknown>;
  const secciones = Array.isArray(o.secciones)
    ? o.secciones.map((s, i) => normalizarSeccion(s, i)).filter((s): s is SeccionPlantilla => s !== null)
    : [];
  const est: EstructuraPlantilla = { secciones };
  if (typeof o.impresionDefecto === 'string' && o.impresionDefecto) est.impresionDefecto = o.impresionDefecto;
  return est;
}

/**
 * Valores INICIALES de un reporte recién creado a partir de la plantilla: copia el
 * `valorDefecto` de cada campo (Familia A · boilerplate). Los campos del encabezado van a
 * `datos_paciente`; los de hallazgos a `valores`.
 */
export function inicialesDesde(estructura: EstructuraPlantilla): {
  valores: Record<string, unknown>;
  datosPaciente: Record<string, string>;
} {
  const valores: Record<string, unknown> = {};
  const datosPaciente: Record<string, string> = {};
  for (const s of estructura.secciones) {
    for (const c of s.campos) {
      if (typeof c.valorDefecto !== 'string' || c.valorDefecto === '') continue;
      if (s.tipo === 'encabezado') datosPaciente[c.id] = c.valorDefecto;
      else valores[c.id] = c.valorDefecto;
    }
  }
  return { valores, datosPaciente };
}

/* ───────────────────── Valores del reporte (instancia del médico) ───────────────────── */

/** Referencia a un estudio DICOM del médico para un campo `imagen` de origen `dicom`. */
export type RefDicom = { casoId: string; tabla: 'bitacora_casos' | 'casos_biblioteca' };

/** Valor de una `tabla`: matriz filas × columnas de texto. */
export type ValorTabla = string[][];

/** Una imagen de una `galeria`: ref en object storage (redactada · §10) + pie opcional. */
export type ImagenGaleria = { ref: string; ext: string; pie?: string };

/** Lee el valor de una `galeria`: lista ordenada de imágenes. */
export function leerGaleria(v: unknown): ImagenGaleria[] {
  const arr = Array.isArray(v) ? v : v && typeof v === 'object' ? (v as { imagenes?: unknown }).imagenes : null;
  if (!Array.isArray(arr)) return [];
  const salida: ImagenGaleria[] = [];
  for (const x of arr) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.ref !== 'string' || !o.ref) continue;
    const item: ImagenGaleria = { ref: o.ref, ext: typeof o.ext === 'string' ? o.ext : 'jpg' };
    if (typeof o.pie === 'string') item.pie = o.pie;
    salida.push(item);
  }
  return salida;
}

/**
 * Valores que el médico captura, indexados por `campo.id`. El tipo real lo dicta el `tipo`
 * del campo; se guarda laxo y se lee con los helpers de abajo (persiste en
 * `lxp.reportes.contenido.valores`). Los campos del ENCABEZADO no viven aquí: van en
 * `datos_paciente` (§10).
 */
export type ValoresReporte = Record<string, unknown>;

export function leerTexto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
export function leerBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}
/** Valor de `multiseleccion`: SIEMPRE un array de strings no vacíos (tolera datos sueltos). */
export function leerMultiseleccion(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  if (typeof v === 'string' && v.trim() !== '') return [v];
  return [];
}

/**
 * Valor de `dimensiones`: SIEMPRE un array de largo `ejes`, con `number` por eje capturado o `''`
 * si falta. Tolera datos sueltos (rellena/recorta a `ejes`). No lanza.
 */
export function leerDimensiones(v: unknown, ejes: number): (number | '')[] {
  const src = Array.isArray(v) ? v : [];
  return Array.from({ length: ejes }, (_, i) => {
    const x = src[i];
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))) return Number(x);
    return '';
  });
}

/** Formatea las dimensiones capturadas: "12.3 × 45.6 × 7.8 mm" (respeta `decimales`). "" si vacío. */
export function formatearDimensiones(campo: CampoPlantilla, v: unknown): string {
  const ejes = campo.ejes === 2 ? 2 : 3;
  const arr = leerDimensiones(v, ejes);
  if (!arr.some((x) => typeof x === 'number')) return '';
  const dec = campo.decimales;
  const partes = arr.map((x) => (typeof x === 'number' ? (typeof dec === 'number' ? x.toFixed(dec) : String(x)) : '—'));
  return `${partes.join(' × ')}${campo.unidad ? ` ${campo.unidad}` : ''}`;
}
export function leerRefDicom(v: unknown): RefDicom | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.casoId !== 'string' || !o.casoId) return null;
  const tabla = o.tabla === 'casos_biblioteca' ? 'casos_biblioteca' : 'bitacora_casos';
  return { casoId: o.casoId, tabla };
}
export function leerTabla(v: unknown, filas: number, columnas: number): ValorTabla {
  const base: ValorTabla = Array.from({ length: filas }, () => Array.from({ length: columnas }, () => ''));
  if (!Array.isArray(v)) return base;
  for (let r = 0; r < filas; r++) {
    const fila = v[r];
    if (Array.isArray(fila)) {
      for (let c = 0; c < columnas; c++) base[r][c] = leerTexto(fila[c]);
    }
  }
  return base;
}

/** ¿El campo cuenta como "completo" para el checklist del reporte? — del registro. */
export function campoCompleto(campo: CampoPlantilla, valor: unknown): boolean {
  return REGISTRO_CAMPOS[campo.tipo].completo(campo, valor);
}

/**
 * ¿El campo es obligatorio para el gate de Finalizar? (1b-1) AUSENTE ⇒ requerido (igual que hoy;
 * las 33 plantillas no traen el flag). Solo un `obligatorio: false` explícito lo vuelve opcional.
 */
export function campoRequerido(campo: CampoPlantilla): boolean {
  return campo.obligatorio ?? true;
}

/** ¿El elemento (campo o sección) se muestra en el reporte? AUSENTE ⇒ sale (igual que hoy). */
export function saleEnInforme(x: { enInforme?: boolean }): boolean {
  return x.enInforme !== false;
}

/**
 * ¿El valor numérico está FUERA del rango sugerido? (1b-2) Usa `rangoNormalMin/Max` si existen; si
 * no, `min/max`. Devuelve `false` si no hay rango o el valor no es numérico → nada que marcar
 * (comportamiento actual). El render lo pinta en ÁMBAR (no bloquea, no es rojo · §5A).
 */
export function fueraDeRango(campo: CampoPlantilla, valor: unknown): boolean {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN;
  if (!Number.isFinite(n)) return false;
  const lo = campo.rangoNormalMin ?? campo.min;
  const hi = campo.rangoNormalMax ?? campo.max;
  if (typeof lo === 'number' && n < lo) return true;
  if (typeof hi === 'number' && n > hi) return true;
  return false;
}

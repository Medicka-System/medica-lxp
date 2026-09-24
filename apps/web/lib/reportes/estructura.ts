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
  | 'fecha' // selector de fecha
  | 'tabla' // rejilla filas × columnas (mediciones obstétrico/carótida)
  | 'sino' // checkbox / sí-no
  | 'opcion' // selección de una lista
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
};

export type SeccionPlantilla = {
  id: string;
  tipo: TipoSeccion;
  titulo: string;
  /** Ancho del grid de la sección (1–4 columnas). */
  columnas: number;
  campos: CampoPlantilla[];
};

export type EstructuraPlantilla = {
  secciones: SeccionPlantilla[];
};

export const TIPOS_CAMPO: TipoCampo[] = [
  'texto',
  'multitexto',
  'numero',
  'medida',
  'fecha',
  'tabla',
  'sino',
  'opcion',
  'imagen',
  'galeria',
  'guia',
  'titulo',
];

/** Tipos que el diseñador coloca dentro de una card de hallazgos. */
export const TIPOS_CAMPO_HALLAZGOS = TIPOS_CAMPO;

export const ETIQUETA_TIPO: Record<TipoCampo, string> = {
  texto: 'Texto',
  multitexto: 'Multitexto',
  numero: 'Número',
  medida: 'Medida',
  fecha: 'Fecha',
  tabla: 'Tabla',
  sino: 'Sí / No',
  opcion: 'Opción',
  imagen: 'Imagen',
  galeria: 'Galería',
  guia: 'Guía',
  titulo: 'Título',
};

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

/** ¿Es un campo de solo presentación (sin respuesta del médico)? */
export function esCampoEstatico(t: TipoCampo): boolean {
  return t === 'guia' || t === 'titulo';
}

/** Descripción corta del formato de la respuesta (para el chip del campo en el constructor). */
export function formatoCampo(c: CampoPlantilla): string {
  switch (c.tipo) {
    case 'texto':
      return c.bloqueado ? 'autollenado' : 'texto de una línea';
    case 'multitexto':
      return 'texto libre (párrafo)';
    case 'numero':
      return 'numérico';
    case 'medida':
      return `${c.unidad?.trim() || '—'} · numérico`;
    case 'fecha':
      return 'fecha';
    case 'tabla':
      return `tabla ${(c.filas?.length ?? 0)}×${(c.columnas?.length ?? 0)}`;
    case 'sino':
      return 'sí / no';
    case 'opcion':
      return (c.opciones ?? []).filter(Boolean).join(' / ') || 'sin opciones';
    case 'imagen':
      return c.origen === 'referencia' ? 'imagen de referencia (fija)' : 'imagen del estudio (DICOM)';
    case 'galeria':
      return 'galería · el médico sube varias imágenes';
    case 'guia':
      return 'guía de la plantilla';
    case 'titulo':
      return 'subtítulo';
  }
}

export function estructuraVacia(): EstructuraPlantilla {
  return { secciones: [] };
}

export function contarCampos(e: EstructuraPlantilla): number {
  return e.secciones.reduce((n, s) => n + s.campos.filter((c) => !esCampoEstatico(c.tipo)).length, 0);
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
  switch (tipo) {
    case 'medida':
      base.unidad = 'mm';
      base.span = 1;
      break;
    case 'numero':
    case 'fecha':
    case 'texto':
    case 'sino':
      base.span = 1;
      break;
    case 'opcion':
      base.span = 1;
      base.opciones = ['normal', 'anormal'];
      break;
    case 'imagen':
      base.origen = 'dicom';
      break;
    case 'tabla':
      base.columnas = ['Longitudinal', 'AP', 'Transverso'];
      base.filas = ['Derecho', 'Izquierdo'];
      break;
    case 'galeria':
      base.nombre = 'Imágenes del estudio';
      break;
    case 'guia':
      base.nombre = 'Aquí van los campos y sugerencias de esta sección.';
      break;
    default:
      break;
  }
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
  if (!esTipoCampo(o.tipo)) return null;
  const c: CampoPlantilla = { id: txt(o.id) || `c${i + 1}`, tipo: o.tipo, nombre: txt(o.nombre) };
  if (txt(o.guia)) c.guia = txt(o.guia);
  if (num(o.span) !== undefined) c.span = num(o.span);
  if (o.bloqueado === true) c.bloqueado = true;
  if (o.tipo === 'medida' && txt(o.unidad)) c.unidad = txt(o.unidad);
  if (o.tipo === 'opcion') c.opciones = listaTxt(o.opciones).filter(Boolean);
  if (o.tipo === 'imagen') {
    c.origen = o.origen === 'referencia' ? 'referencia' : 'dicom';
    if (c.origen === 'referencia' && txt(o.refUrl)) c.refUrl = txt(o.refUrl);
  }
  if (o.tipo === 'tabla') {
    c.columnas = listaTxt(o.columnas);
    c.filas = listaTxt(o.filas);
  }
  return c;
}

function normalizarSeccion(raw: unknown, i: number): SeccionPlantilla | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tipo: TipoSeccion = o.tipo === 'encabezado' ? 'encabezado' : 'hallazgos';
  const campos = Array.isArray(o.campos)
    ? o.campos.map((c, j) => normalizarCampo(c, j)).filter((c): c is CampoPlantilla => c !== null)
    : [];
  const columnas = Math.min(4, Math.max(1, num(o.columnas) ?? 1));
  return { id: txt(o.id) || `s${i + 1}`, tipo, titulo: txt(o.titulo) || `Sección ${i + 1}`, columnas, campos };
}

/** Parsea el jsonb persistido a una estructura completa (tolera plantillas viejas/parciales). */
export function normalizarEstructura(raw: unknown): EstructuraPlantilla {
  if (!raw || typeof raw !== 'object') return estructuraVacia();
  const o = raw as Record<string, unknown>;
  const secciones = Array.isArray(o.secciones)
    ? o.secciones.map((s, i) => normalizarSeccion(s, i)).filter((s): s is SeccionPlantilla => s !== null)
    : [];
  return { secciones };
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

/** ¿El campo cuenta como "completo" para el checklist del reporte? Los estáticos no cuentan. */
export function campoCompleto(campo: CampoPlantilla, valor: unknown): boolean {
  switch (campo.tipo) {
    case 'texto':
    case 'multitexto':
    case 'numero':
    case 'medida':
    case 'fecha':
    case 'opcion':
      return leerTexto(valor).trim() !== '';
    case 'sino':
      return leerBool(valor) !== null;
    case 'tabla':
      return Array.isArray(valor) && valor.some((f) => Array.isArray(f) && f.some((x) => leerTexto(x).trim() !== ''));
    case 'imagen':
      return campo.origen === 'referencia' ? true : leerRefDicom(valor) !== null;
    case 'galeria':
      return leerGaleria(valor).length > 0;
    case 'guia':
    case 'titulo':
      return true;
  }
}

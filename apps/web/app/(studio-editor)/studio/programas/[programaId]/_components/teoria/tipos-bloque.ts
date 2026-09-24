/**
 * Sub-tipos de BLOQUE del editor de Teoría (§5C · mig 0023).
 *
 * Una lección tipo `teoria` es una pila de BLOQUES ordenables (estilo Gutenberg): el
 * diseñador apila texto, imagen, galería, video, HTML, link, PDF, caso DICOM, H5P y
 * xAPI. Cada bloque es una fila de `lxp.bloques` con `tipo_bloque` (TEXT) + `config`
 * (jsonb) — el esquema NO conoce estos sub-tipos (por eso `tipo_bloque` es text · mig
 * 0023); ESTE módulo es su fuente de verdad en código.
 *
 * Módulo PURO (sin React ni server-only): lo importan el editor cliente y el selector
 * de bloques. La FORMA del `config` de cada tipo vive aquí (`ConfigBloque`), y el
 * `configInicial()` da el cuerpo vacío al crear un bloque nuevo.
 *
 * H5P y xAPI van aquí como BLOQUE (un elemento más dentro de la teoría), reusando los
 * componentes de `components/bloques/` — NO son tipos de lección propios (§5C: eso lo
 * resuelve otro editor). El bloque solo referencia el contenido; el servidor H5P y la
 * ingesta de paquetes son PENDIENTE DE API (ver `components/bloques/contratos.ts`).
 */

import type { FuenteVideoConfig } from '@/components/bloques/contratos';

/** Los 10 sub-tipos de bloque que ofrece el editor de teoría. */
export type TipoBloqueTeoria =
  | 'texto'
  | 'imagen'
  | 'galeria'
  | 'video'
  | 'html'
  | 'link'
  | 'pdf'
  | 'caso'
  | 'h5p'
  | 'xapi';

/** Orden canónico de presentación en el menú "Agregar bloque". */
export const TIPOS_BLOQUE_TEORIA: readonly TipoBloqueTeoria[] = [
  'texto',
  'imagen',
  'galeria',
  'video',
  'html',
  'link',
  'pdf',
  'caso',
  'h5p',
  'xapi',
] as const;

/* ─────────────────────────── Forma del `config` por tipo ─────────────────────────── */

/** Bloque de texto/teoría: HTML del editor rico (TipTap · KaTeX · tablas · Word). */
export type ConfigTexto = { html: string };

/**
 * Imagen única: por ENLACE (`src`) o SUBIDA (`ref` = clave de storage redactada §10, que
 * se firma para leer). Texto alternativo y pie. `revisionManual` marca que la imagen
 * subida quedó en revisión (el redactor no estuvo seguro de tapar la PII quemada · §10).
 */
export type ConfigImagen = {
  src: string;
  ref?: string;
  revisionManual?: boolean;
  alt: string;
  pie: string;
};

/** Galería: varias imágenes con su alt; el visor las muestra en rejilla. */
export type ConfigGaleria = { imagenes: { src: string; alt: string }[] };

/**
 * Video embebido — usa el MISMO contrato de fuente que la lección de video
 * (`FuenteVideoConfig`: subir a videoteca o enlace directo + hitos + transcripción), más
 * el título del bloque. El editor de autoría (`EditorVideoAutoria`) es el mismo en ambos.
 * `src`/`poster` se conservan por COMPATIBILIDAD con bloques viejos (fuente directa).
 */
export type ConfigVideo = FuenteVideoConfig & {
  titulo: string;
  poster?: string;
  /** Compat: bloques viejos guardaban la fuente directa aquí (se trata como enlace). */
  src?: string;
  /** Recurso de la Biblioteca del que se insertó (si vino del selector). */
  recursoId?: string;
};

/** HTML embebido (embeds, snippets). Se renderiza tal cual — sin sanitizar aquí. */
export type ConfigHtml = { html: string };

/** Enlace externo como tarjeta. */
export type ConfigLink = { url: string; titulo: string; descripcion: string };

/** PDF embebido: fuente + título. */
export type ConfigPdf = { src: string; titulo: string; recursoId?: string };

/** Caso DICOM del Banco: referencia + catalogación cacheada (para pintar sin re-leer). */
export type ConfigCaso = {
  casoId: string;
  titulo: string;
  organo?: string;
  /** Dominio I-AIM (string suelto: el reader lo mapea; no acopla al enum aquí). */
  dominio?: string;
};

/**
 * H5P embebido (reusa BloqueH5P): interactivo AUTORADO en el H5P server (`contentId`) o
 * embebido por ENLACE externo (`url` → iframe). El diseñador elige una vía u otra.
 */
export type ConfigH5p = { contentId: string; titulo: string; url?: string; recursoId?: string };

/**
 * Paquete xAPI/SCORM embebido (reusa BloquePaquete): paquete INGERIDO en el dominio
 * (`contenidoId` + `tipo` + `entryPoint`, misma forma que la lección xAPI) o lanzador por
 * ENLACE externo (`url` → iframe). `paqueteId` se conserva por compat con bloques viejos.
 */
export type ConfigXapi = {
  titulo: string;
  contenidoId?: string;
  tipo?: string;
  entryPoint?: string | null;
  url?: string;
  /** Compat: bloques viejos guardaban el id del paquete aquí. */
  paqueteId?: string;
  recursoId?: string;
};

/** Mapa tipo → forma de su `config` (contrato interno del editor de teoría). */
export type ConfigBloque = {
  texto: ConfigTexto;
  imagen: ConfigImagen;
  galeria: ConfigGaleria;
  video: ConfigVideo;
  html: ConfigHtml;
  link: ConfigLink;
  pdf: ConfigPdf;
  caso: ConfigCaso;
  h5p: ConfigH5p;
  xapi: ConfigXapi;
};

/* ─────────────────────────── Registro descriptivo ─────────────────────────── */

/** Familia para agrupar el menú (§5A: orden claro, no un muro de opciones). */
export type FamiliaBloque = 'contenido' | 'multimedia' | 'interactivo' | 'clinico';

export type InfoBloqueTeoria = {
  tipo: TipoBloqueTeoria;
  rotulo: string;
  descripcion: string;
  familia: FamiliaBloque;
  /** Nombre del ícono Lucide (el componente lo resuelve para no acoplar React aquí). */
  icono: string;
  /** ¿Se inserta desde el "Selector de recursos existentes" (Biblioteca/Banco)? */
  desdeRecurso: boolean;
};

export const INFO_BLOQUE_TEORIA: Record<TipoBloqueTeoria, InfoBloqueTeoria> = {
  texto: {
    tipo: 'texto',
    rotulo: 'Texto',
    descripcion: 'Editor rico: formato, listas, tablas, fórmulas KaTeX e importar Word.',
    familia: 'contenido',
    icono: 'Type',
    desdeRecurso: false,
  },
  imagen: {
    tipo: 'imagen',
    rotulo: 'Imagen',
    descripcion: 'Una imagen con texto alternativo y pie.',
    familia: 'contenido',
    icono: 'Image',
    desdeRecurso: false,
  },
  galeria: {
    tipo: 'galeria',
    rotulo: 'Galería',
    descripcion: 'Varias imágenes en rejilla.',
    familia: 'contenido',
    icono: 'Images',
    desdeRecurso: false,
  },
  video: {
    tipo: 'video',
    rotulo: 'Video',
    descripcion: 'Video con transcripción e hitos de consulta rápida.',
    familia: 'multimedia',
    icono: 'Video',
    desdeRecurso: true,
  },
  html: {
    tipo: 'html',
    rotulo: 'HTML',
    descripcion: 'Fragmento de HTML embebido (widgets, embeds).',
    familia: 'contenido',
    icono: 'Code',
    desdeRecurso: false,
  },
  link: {
    tipo: 'link',
    rotulo: 'Enlace',
    descripcion: 'Un enlace externo como tarjeta.',
    familia: 'contenido',
    icono: 'Link',
    desdeRecurso: false,
  },
  pdf: {
    tipo: 'pdf',
    rotulo: 'PDF',
    descripcion: 'Documento PDF embebido.',
    familia: 'multimedia',
    icono: 'FileText',
    desdeRecurso: true,
  },
  caso: {
    tipo: 'caso',
    rotulo: 'Caso',
    descripcion: 'Un caso DICOM curado del Banco de Casos (visor Cornerstone3D).',
    familia: 'clinico',
    icono: 'ScanLine',
    desdeRecurso: true,
  },
  h5p: {
    tipo: 'h5p',
    rotulo: 'H5P',
    descripcion: 'Interactivo H5P embebido (emite xAPI al LRS).',
    familia: 'interactivo',
    icono: 'SlidersHorizontal',
    desdeRecurso: true,
  },
  xapi: {
    tipo: 'xapi',
    rotulo: 'xAPI',
    descripcion: 'Paquete xAPI (Articulate) que reporta al LRS.',
    familia: 'interactivo',
    icono: 'Package',
    desdeRecurso: true,
  },
};

/* ─────────────────────────── Cuerpo inicial al crear ─────────────────────────── */

/** Fábricas del `config` inicial por tipo (cada una tipada contra su forma). */
const INICIALES: { [K in TipoBloqueTeoria]: () => ConfigBloque[K] } = {
  texto: () => ({ html: '' }),
  imagen: () => ({ src: '', alt: '', pie: '' }),
  galeria: () => ({ imagenes: [] }),
  video: () => ({ titulo: '', hitos: [] }),
  html: () => ({ html: '' }),
  link: () => ({ url: '', titulo: '', descripcion: '' }),
  pdf: () => ({ src: '', titulo: '' }),
  caso: () => ({ casoId: '', titulo: '' }),
  h5p: () => ({ contentId: '', titulo: '' }),
  xapi: () => ({ titulo: '' }),
};

/** `config` con el que nace un bloque de cada tipo (cuerpo vacío, listo para editar). */
export function configInicial<T extends TipoBloqueTeoria>(tipo: T): ConfigBloque[T] {
  return INICIALES[tipo]();
}

/** Type guard: normaliza un `tipo_bloque` crudo de BD al union (null si no lo conoce). */
export function comoTipoBloqueTeoria(v: unknown): TipoBloqueTeoria | null {
  return TIPOS_BLOQUE_TEORIA.includes(v as TipoBloqueTeoria) ? (v as TipoBloqueTeoria) : null;
}

/**
 * CONTRATO de los tipos de lección del constructor (§5C · mig 0023).
 *
 * Módulo PURO (sin React ni server-only): lo importan tanto las lecturas de servidor
 * (`datos.ts`) como el builder cliente. Es la fuente de verdad de:
 *   · qué tipos existen,
 *   · dónde vive el contenido de cada uno (tabla `bloques` vs columna `config`),
 *   · qué props recibe el editor de cada tipo.
 *
 * Los editores de cada tipo (agentes posteriores) se enganchan al registro de
 * `_components/editores-leccion.tsx` SIN tocar el modelo ni este contrato. Ver
 * `docs/constructor-lecciones-contrato.md`.
 */

/** Los 7 tipos de lección (== enum `lxp.leccion_tipo` · mig 0023). */
export type TipoLeccion =
  | 'teoria'
  | 'video'
  | 'autoevaluacion'
  | 'tarea'
  | 'foro'
  | 'h5p'
  | 'xapi';

/** Orden canónico de presentación (selector y placeholders). */
export const TIPOS_LECCION: readonly TipoLeccion[] = [
  'teoria',
  'video',
  'autoevaluacion',
  'tarea',
  'foro',
  'h5p',
  'xapi',
] as const;

/**
 * DÓNDE guarda su contenido cada tipo (modelo híbrido · mig 0023):
 *   · 'bloques' → filas ordenables en `lxp.bloques` (hoy solo `teoria`).
 *   · 'config'  → un único objeto jsonb en `lecciones.config`.
 */
export type AlmacenTipo = 'bloques' | 'config';

export type InfoTipoLeccion = {
  tipo: TipoLeccion;
  /** Rótulo corto para chips y encabezados. */
  rotulo: string;
  /** Descripción de una línea para el selector de tipo. */
  descripcion: string;
  /** Dónde persiste su contenido (contrato para el editor). */
  almacen: AlmacenTipo;
};

export const INFO_TIPO_LECCION: Record<TipoLeccion, InfoTipoLeccion> = {
  teoria: {
    tipo: 'teoria',
    rotulo: 'Teoría',
    descripcion: 'Lectura con bloques ordenables: texto, imágenes, fórmulas, cine-loops.',
    almacen: 'bloques',
  },
  video: {
    tipo: 'video',
    rotulo: 'Video',
    descripcion: 'Un video o cine-loop con transcripción e hitos de consulta rápida.',
    almacen: 'config',
  },
  autoevaluacion: {
    tipo: 'autoevaluacion',
    rotulo: 'Autoevaluación',
    descripcion: 'Reactivos autocalificables; Eco propone y el alumno recibe retro.',
    almacen: 'config',
  },
  tarea: {
    tipo: 'tarea',
    rotulo: 'Tarea',
    descripcion: 'Entrega evaluada con una rúbrica del catálogo + lineamientos.',
    almacen: 'config',
  },
  foro: {
    tipo: 'foro',
    rotulo: 'Foro',
    descripcion: 'Discusión cerrada del grupo (no confundir con el Ateneo · §1).',
    almacen: 'config',
  },
  h5p: {
    tipo: 'h5p',
    rotulo: 'H5P',
    descripcion: 'Contenido interactivo H5P (se autora y previsualiza en el Studio).',
    almacen: 'config',
  },
  xapi: {
    tipo: 'xapi',
    rotulo: 'xAPI',
    descripcion: 'Paquete xAPI (Articulate) que reporta al LRS directo.',
    almacen: 'config',
  },
};

/** Type guard: normaliza un `tipo` crudo de BD al union (fallback seguro a teoria). */
export function comoTipoLeccion(v: unknown): TipoLeccion {
  return TIPOS_LECCION.includes(v as TipoLeccion) ? (v as TipoLeccion) : 'teoria';
}

/* ─────────────────────────── Contrato del editor ─────────────────────────── */

/** Un bloque de teoría, tal como lo entrega el builder al editor (== fila `lxp.bloques`). */
export type BloqueTeoria = {
  id: string;
  orden: number;
  /** Sub-tipo definido por el editor de teoría (párrafo, imagen, katex…). */
  tipoBloque: string;
  /** Cuerpo del bloque; la forma la define el editor de teoría. */
  config: Record<string, unknown>;
};

/**
 * Props que el builder pasa al editor de CADA tipo. Un agente que construya el
 * editor de un tipo consume EXACTAMENTE esta forma y persiste con server actions
 * (CRUD directo web→Supabase bajo RLS · Regla de Oro §2 · NO NestJS):
 *
 *   · Tipos `almacen: 'config'` (video/autoevaluacion/tarea/foro/h5p/xapi):
 *     leen/escriben `config` (== `lecciones.config`). La forma del objeto la define
 *     el propio editor.
 *   · Tipo `almacen: 'bloques'` (teoria): lee/escribe `bloques` (== filas de
 *     `lxp.bloques`, ordenables). `config` llega vacío ({}).
 *
 * `correr` ejecuta una server action y refresca el indicador "guardado" del header
 * (mismo helper que ya usa el builder), para no duplicar el feedback de guardado.
 */
export type EditorLeccionProps = {
  programaId: string;
  leccionId: string;
  tipo: TipoLeccion;
  titulo: string;
  config: Record<string, unknown>;
  bloques: BloqueTeoria[];
  correr: (accion: () => Promise<void>) => void;
};

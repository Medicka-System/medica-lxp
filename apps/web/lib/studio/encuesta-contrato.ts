/**
 * CONTRATO de la ENCUESTA (§5C) — constructor de preguntas que RECOGE respuestas,
 * SIN calificar (distinto de autoevaluación). Módulo PURO (sin React ni server-only):
 * lo comparten el editor del Studio (lección y bloque de teoría), el lector del alumno
 * y las lecturas de servidor. La config vive en `lecciones.config` / `bloques.config`.
 *
 * NO hay respuesta correcta, ni puntaje, ni veredicto: una encuesta solo pregunta.
 */

/** Tipos de pregunta de encuesta. */
export type TipoPregunta = 'opcion_unica' | 'multiple' | 'escala' | 'texto';

export const PREGUNTA_TIPOS: readonly TipoPregunta[] = [
  'opcion_unica',
  'multiple',
  'escala',
  'texto',
] as const;

export const ROTULO_PREGUNTA: Record<TipoPregunta, string> = {
  opcion_unica: 'Opción (elige una)',
  multiple: 'Selección múltiple (varias)',
  escala: 'Escala (1–N)',
  texto: 'Texto abierto',
};

export type OpcionPregunta = { clave: string; texto: string };

export type PreguntaEncuesta = {
  id: string;
  tipo: TipoPregunta;
  enunciado: string;
  /** Para opcion_unica / multiple. */
  opciones: OpcionPregunta[];
  /** Para escala: valor máximo (1..escalaMax). Default 5. */
  escalaMax?: number;
  /** Etiquetas opcionales de los extremos de la escala. */
  escalaMinEtiqueta?: string;
  escalaMaxEtiqueta?: string;
  /** Si el alumno debe responderla para enviar. */
  obligatoria?: boolean;
};

export type EncuestaConfig = {
  preguntas: PreguntaEncuesta[];
  /** Instrucción/encabezado opcional para el alumno. */
  descripcion?: string;
};

export const CLAVES_OPCION = 'abcdefghijklmnopqrstuvwxyz';

export function nuevoId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fallthrough */
  }
  return `p_${Math.abs(Date.now() ^ Math.floor(Math.random() * 1e9)).toString(36)}`;
}

const TIPOS = new Set<TipoPregunta>(PREGUNTA_TIPOS);

/** Normaliza una pregunta cruda (jsonb) al tipo; `null` si no es utilizable. */
export function normalizarPregunta(raw: unknown): PreguntaEncuesta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && r.id ? r.id : nuevoId();
  const enunciado = typeof r.enunciado === 'string' ? r.enunciado : '';
  const tipo: TipoPregunta = TIPOS.has(r.tipo as TipoPregunta) ? (r.tipo as TipoPregunta) : 'opcion_unica';

  const opciones: OpcionPregunta[] = Array.isArray(r.opciones)
    ? (r.opciones as unknown[])
        .map((op) => {
          const o = (op ?? {}) as Record<string, unknown>;
          return { clave: String(o.clave ?? ''), texto: String(o.texto ?? '') };
        })
        .filter((o) => o.clave)
    : [];

  const escalaMaxRaw = Number(r.escalaMax);
  const escalaMax = Number.isFinite(escalaMaxRaw) ? Math.min(10, Math.max(2, Math.trunc(escalaMaxRaw))) : 5;

  const p: PreguntaEncuesta = {
    id,
    tipo,
    enunciado,
    opciones: tipo === 'opcion_unica' || tipo === 'multiple' ? opciones : [],
    obligatoria: r.obligatoria === true,
  };
  if (tipo === 'escala') {
    p.escalaMax = escalaMax;
    if (typeof r.escalaMinEtiqueta === 'string' && r.escalaMinEtiqueta.trim()) p.escalaMinEtiqueta = r.escalaMinEtiqueta.trim();
    if (typeof r.escalaMaxEtiqueta === 'string' && r.escalaMaxEtiqueta.trim()) p.escalaMaxEtiqueta = r.escalaMaxEtiqueta.trim();
  }
  return p;
}

/** Proyecta el `config` crudo (jsonb) a `EncuestaConfig` de forma defensiva. */
export function comoEncuestaConfig(raw: Record<string, unknown> | null | undefined): EncuestaConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const preguntas = Array.isArray(c.preguntas)
    ? (c.preguntas as unknown[]).map(normalizarPregunta).filter((p): p is PreguntaEncuesta => p !== null)
    : [];
  const descripcion = typeof c.descripcion === 'string' && c.descripcion.trim() ? c.descripcion.trim() : undefined;
  return { preguntas, descripcion };
}

/** Pregunta en blanco al agregar una nueva. */
export function preguntaEnBlanco(): PreguntaEncuesta {
  return {
    id: nuevoId(),
    tipo: 'opcion_unica',
    enunciado: '',
    opciones: [
      { clave: 'a', texto: '' },
      { clave: 'b', texto: '' },
    ],
    obligatoria: false,
  };
}

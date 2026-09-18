/**
 * Tool de AUTO-CALIFICACIÓN objetiva (§7A, paso 3: "auto-califica lo objetivo,
 * calcula lo determinista"). PURO, sin LLM ni infra: compara la respuesta del
 * alumno contra una clave (opción múltiple) y devuelve la nota. Esto es lo que
 * hace innecesario el LLM cuando la respuesta es objetiva — tools primero.
 */
import type { ClaveObjetiva, ItemEvaluable } from '../pipeline/tipos';

export interface ResultadoAutoCalificacion {
  nota: number; // 0..100
  aciertos: number;
  total: number;
  /** Detalle por pregunta para el feedback/traza. */
  porPregunta: Array<{ pregunta: string; correcta: boolean }>;
}

/** Respuesta objetiva del alumno: `{ preguntaId: opcion(es) }`. */
type RespuestaObjetiva = Record<string, string | string[]>;

/**
 * ¿El ítem es 100% auto-calificable? Solo autoevaluaciones con clave objetiva y
 * respuesta en forma de opciones. Si hay texto libre, NO lo es (irá al LLM).
 */
export function esAutoCalificable(item: ItemEvaluable): boolean {
  if (item.actividadTipo !== 'autoevaluacion') return false;
  if (!item.claveObjetiva || Object.keys(item.claveObjetiva.correctas).length === 0) {
    return false;
  }
  const r = extraerRespuestaObjetiva(item.respuesta);
  return r !== null && Object.keys(r).length > 0;
}

/** Califica opción múltiple contra la clave. Orden-insensible en multi-respuesta. */
export function autoCalificar(
  respuesta: unknown,
  clave: ClaveObjetiva,
): ResultadoAutoCalificacion {
  const r = extraerRespuestaObjetiva(respuesta) ?? {};
  const preguntas = Object.keys(clave.correctas);
  const porPregunta = preguntas.map((pregunta) => ({
    pregunta,
    correcta: coincide(r[pregunta], clave.correctas[pregunta]),
  }));
  const aciertos = porPregunta.filter((p) => p.correcta).length;
  const total = preguntas.length;
  const nota = total === 0 ? 0 : Math.round((aciertos / total) * 100);
  return { nota, aciertos, total, porPregunta };
}

/** Normaliza el jsonb de la entrega a `{ preguntaId: opcion }`. */
function extraerRespuestaObjetiva(respuesta: unknown): RespuestaObjetiva | null {
  if (!respuesta || typeof respuesta !== 'object') return null;
  const obj = respuesta as Record<string, unknown>;
  // La entrega guarda las opciones bajo `respuestas` o directo en la raíz.
  const fuente = (obj.respuestas ?? obj) as Record<string, unknown>;
  const out: RespuestaObjetiva = {};
  for (const [k, v] of Object.entries(fuente)) {
    if (typeof v === 'string') out[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[k] = v as string[];
  }
  return out;
}

function coincide(
  dada: string | string[] | undefined,
  correcta: string | string[],
): boolean {
  if (dada == null) return false;
  const a = normalizar(dada);
  const b = normalizar(correcta);
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

function normalizar(v: string | string[]): string[] {
  return (Array.isArray(v) ? v : [v]).map((x) => x.trim().toLowerCase()).sort();
}

/**
 * Tipos del pipeline de evaluación de Eco (§7A). Separan las CAPAS: los tools
 * construyen un `ItemEvaluable` (datos), el pipeline produce una `PropuestaEco`
 * (juicio) y el humano la confirma. La `PropuestaEco` es un BORRADOR — nunca una
 * nota asentada.
 */
import { z } from 'zod';

/** Rúbrica normalizada (criterios con peso) que Eco compara contra la respuesta. */
export interface CriterioRubrica {
  criterio: string;
  descripcion?: string;
  peso?: number;
}

/**
 * Ítem que el pipeline evalúa, ya recopilado por los tools (SQL + RAG). Es la
 * frontera limpia: el pipeline no sabe de tablas ni de pgvector, solo de esto.
 */
export interface ItemEvaluable {
  tipo: 'entrega' | 'caso';
  id: string;
  alumnoId?: string;
  grupoId?: string;
  /** Tipo de actividad (autoevaluacion es auto-calificable · tools-first). */
  actividadTipo?: 'tarea' | 'autoevaluacion' | 'foro';
  /** Respuesta del alumno tal como vino (jsonb/texto). */
  respuesta: unknown;
  /** Clave de respuesta objetiva, si la hay (autoevaluación). */
  claveObjetiva?: ClaveObjetiva | null;
  /** Verdad estructurada del caso recuperada por RAG (hallazgos, dx, etc.). */
  verdad?: unknown;
  /** Criterios de la rúbrica aplicable. */
  rubrica?: CriterioRubrica[];
  /** Chunks que el RAG recuperó (para trazar de dónde salió la verdad). */
  contextoRag?: Array<{ fuenteTipo: string; fuenteId: string | null; chunk: string }>;
}

/** Clave de respuesta para auto-calificación objetiva (opción múltiple). */
export interface ClaveObjetiva {
  /** Respuestas correctas por id de pregunta. */
  correctas: Record<string, string | string[]>;
}

/** Salida esperada del LLM de juicio (Sonnet). Validada con zod al parsear. */
export const juicioSchema = z.object({
  nota_sugerida: z.number().min(0).max(100),
  confianza: z.number().min(0).max(1),
  feedback_borrador: z.string(),
  criterios: z
    .array(
      z.object({
        criterio: z.string(),
        puntaje: z.number(),
        comentario: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  omisiones: z.array(z.string()).optional().default([]),
});
export type Juicio = z.infer<typeof juicioSchema>;

/** Clasificación de la bandeja por confianza (§7A). */
export type Clasificacion = 'listo' | 'requiere_criterio';

/**
 * Propuesta que Eco deja en la bandeja. BORRADOR: `notaSugerida`/`feedbackBorrador`
 * son sugerencias; se asientan SOLO si el docente confirma (§7A). `detalle` traza
 * qué pasos corrieron (auto-calificación, Haiku, Sonnet) y con qué modelo.
 */
export interface PropuestaEco {
  objetoTipo: 'entrega' | 'caso';
  objetoId: string;
  alumnoId?: string;
  grupoId?: string;
  notaSugerida: number | null;
  feedbackBorrador: string;
  confianza: number;
  clasificacion: Clasificacion;
  detalle: {
    pasos: string[];
    proveedor?: string;
    modelo?: string;
    autoCalificado: boolean;
    normalizadoConHaiku: boolean;
    criterios?: Juicio['criterios'];
    omisiones?: string[];
    fuentesRag?: Array<{ fuenteTipo: string; fuenteId: string | null }>;
    /** Si el LLM devolvió algo no parseable, se guarda para depurar. */
    juicioCrudo?: string;
  };
}

/**
 * Tipos de la SESIÓN de simulador (§7A · Sprint 7). El simulador reusa el pipeline
 * de Eco (juicio contra la verdad del caso); estos tipos son la frontera limpia
 * entre lo que entra (respuesta del alumno) y lo que sale (feedback formativo).
 *
 * Es PRÁCTICA, no evaluación oficial: el feedback es un borrador de entrenamiento —
 * Eco propone, nada se asienta en el expediente (§7A).
 */
import type { CriterioRubrica } from '../pipeline/tipos';

export type TipoSimulador = 'interpretacion' | 'reporte';

/** Verdad estructurada del caso curado (§7A) tal como la lee el simulador. */
export interface CasoVerdad {
  id: string;
  titulo: string;
  organo: string | null;
  dominioIaim: string | null;
  hallazgosClave: string[];
  diagnosticoCorrecto: string | null;
  puntosAprendizaje: string[];
  erroresComunes: string[];
}

/** Respuesta del alumno en una sesión de INTERPRETACIÓN. */
export interface RespuestaInterpretacion {
  hallazgos: string;
  impresion: string;
  /** Autoconfianza declarada (§ mock: Poco/Algo/Mucho). Informativo. */
  seguridad?: string;
}

/** Una sección del reporte redactada por el alumno. */
export interface SeccionReporte {
  titulo: string;
  texto: string;
}

/** Respuesta del alumno en una sesión de REPORTE. */
export interface RespuestaReporte {
  secciones: SeccionReporte[];
}

/** Ítem de feedback (acierto / omisión / precisión). */
export interface FeedbackItem {
  titulo: string;
  detalle: string;
}

/**
 * Feedback formativo que el tutor (Eco) devuelve al alumno tras una sesión. Mapea la
 * `PropuestaEco` del pipeline a un lenguaje de ENTRENAMIENTO (no de calificación):
 * aciertos, omisiones, precisiones y la lectura "de referencia" del caso.
 */
export interface SimuladorFeedback {
  tipo: TipoSimulador;
  puntaje: number | null;
  /** Confianza del propio tutor en su evaluación (0..1). */
  confianza: number;
  titular: string;
  resumen: string;
  aciertos: FeedbackItem[];
  omisiones: FeedbackItem[];
  precisiones: FeedbackItem[];
  /** Lectura de referencia (hallazgos clave del caso) — "cómo lo leería tu docente". */
  lecturaDocente: string;
  /** Diagnóstico correcto del caso (se revela SOLO tras responder · § mock). */
  diagnostico: string | null;
  puntosAprendizaje: string[];
  /** Traza de qué produjo el feedback (proveedor/modelo/pasos + si corrió en MOCK). */
  eco: {
    proveedor?: string;
    modelo?: string;
    mock: boolean;
    pasos: string[];
  };
}

/** Resultado completo de evaluar una sesión: feedback + registro + repaso agendado. */
export interface ResultadoSesion {
  sesionId: string;
  feedback: SimuladorFeedback;
  /** Dominio I-AIM sobre el que se practicó (para competencia/repaso). */
  dominioIaim: string | null;
  /** Id del job `programar-repaso` encolado (null si el caso no trae dominio). */
  repasoJobId: string | null;
}

/**
 * Rúbricas PLACEHOLDER de los simuladores (§7A · Sprint 7). El detalle clínico fino
 * (criterios, pesos, guía por tipo de estudio) SE LEVANTA CON MANNY después — aquí
 * van criterios genéricos para que el pipeline tenga contra qué contrastar. NO son la
 * verdad clínica final.
 */
export const RUBRICA_INTERPRETACION: CriterioRubrica[] = [
  { criterio: 'Identificación de hallazgos', descripcion: 'Reconoce los hallazgos clave', peso: 40 },
  { criterio: 'Impresión diagnóstica', descripcion: 'Concluye acorde a los hallazgos', peso: 40 },
  { criterio: 'Técnica y precisión', descripcion: 'Plano, medida y lado; evita sobreinterpretar', peso: 20 },
];

export const RUBRICA_REPORTE: CriterioRubrica[] = [
  { criterio: 'Estructura', descripcion: 'Todas las secciones presentes', peso: 25 },
  { criterio: 'Mediciones', descripcion: 'Con unidad, plano y lado', peso: 25 },
  { criterio: 'Omisiones', descripcion: 'Lo que no mencionó', peso: 20 },
  { criterio: 'Redacción', descripcion: 'Claridad y orden', peso: 15 },
  { criterio: 'Impresión diagnóstica', descripcion: 'Cierra la conducta', peso: 15 },
];

/** Umbral (0..100) sobre el que la práctica se considera "aprobada" para xAPI. */
export const UMBRAL_APROBACION_SIMULADOR = 60;

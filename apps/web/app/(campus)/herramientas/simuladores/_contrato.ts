/**
 * Contrato de los Simuladores IA del alumno (§7A · Sprint 7). Tipos compartidos por
 * los datos (RLS), las acciones (llaman al `api`) y las vistas cliente. La forma del
 * FEEDBACK espeja la salida del `api` (`ResultadoSesion` en `src/ai/simuladores`) — el
 * web se ajusta al api (§13).
 *
 * NOTA (placeholder · §7A/§13): el detalle clínico fino (viñeta curada, plantillas de
 * reporte por estudio, dificultad real, piezas DICOM) SE LEVANTA CON MANNY. Aquí la
 * dificultad y las secciones de reporte son provisionales, derivadas de lo disponible.
 */
import { DOMINIO_LABEL, type DominioIaim } from '@/lib/campus/bitacora-contrato';

export type TipoSim = 'interpretacion' | 'reporte';
export type Dificultad = 'Básico' | 'Intermedio' | 'Avanzado';

/** Caso practicable del banco curado (`casos_biblioteca`), sin revelar la verdad. */
export type CasoSim = {
  id: string;
  titulo: string;
  area: string;
  dominio: DominioIaim | null;
  dificultad: Dificultad;
  /** Historial del alumno con este caso ("Practicado 2 veces · mejor 82" | "Sin practicar"). */
  historial: string;
  /** Mejor puntaje previo (para "sugerido"/repaso). null si sin practicar. */
  mejor: number | null;
  sugerido: boolean;
};

/** Repaso pendiente (de `competencia_dominios.proximo_repaso`). */
export type Repaso = { dominio: DominioIaim; tema: string; cuando: string; hoy: boolean };

/** Barra de desempeño del hero. */
export type Desempeno = { etiqueta: string; valor: string; pct: number; tono: 'bien' | 'aviso' | 'neutro' };

export type SimuladoresData = {
  practicados: number;
  ultimaSesion: string;
  desempeno: Desempeno[];
  repasos: Repaso[];
  disponibles: number;
  areas: string[];
  casos: CasoSim[];
};

// ── Feedback (espeja el `api`) ───────────────────────────────────────────────
export type FeedbackItem = { titulo: string; detalle: string };

export type SimuladorFeedback = {
  tipo: TipoSim;
  puntaje: number | null;
  confianza: number;
  titular: string;
  resumen: string;
  aciertos: FeedbackItem[];
  omisiones: FeedbackItem[];
  precisiones: FeedbackItem[];
  lecturaDocente: string;
  diagnostico: string | null;
  puntosAprendizaje: string[];
  eco: { proveedor?: string; modelo?: string; mock: boolean; pasos: string[] };
};

export type ResultadoSesion = {
  sesionId: string;
  feedback: SimuladorFeedback;
  dominioIaim: string | null;
  repasoJobId: string | null;
};

/** Una sección de reporte que el alumno envía a revisión. */
export type SeccionEnvio = { titulo: string; texto: string };

/** Resultado de un envío de sesión para la UI (feedback o error legible). */
export type ResultadoEnvio =
  | { ok: true; resultado: ResultadoSesion }
  | { ok: false; error: string };

// ── Presentación del caso (sin verdad) para arrancar la sesión ───────────────
export type CasoPresentacion = {
  id: string;
  titulo: string;
  area: string;
  dominio: DominioIaim | null;
  dificultad: Dificultad;
  /** Contexto clínico mostrado antes de responder (placeholder hasta curación). */
  vineta: string;
};

/**
 * Secciones por defecto del simulador de REPORTE (placeholder · §7A). El esqueleto
 * real por tipo de estudio se levanta con Manny (se apoyará en `plantillas_reporte`).
 */
export const SECCIONES_REPORTE_DEFAULT = [
  'Técnica y calidad del estudio',
  'Hallazgos',
  'Mediciones',
  'Impresión diagnóstica',
] as const;

/** Qué evalúa el tutor en el reporte (espejo de la rúbrica placeholder del `api`). */
export const CRITERIOS_REPORTE: [string, string][] = [
  ['Estructura', 'que estén todas las secciones'],
  ['Mediciones', 'con unidad, plano y lado'],
  ['Omisiones', 'lo que no mencionó'],
  ['Redacción', 'claridad y orden'],
  ['Impresión', 'que cierre la conducta'],
];

/**
 * Dificultad PROVISIONAL derivada del dominio I-AIM (§7A: dato fino pendiente). No es
 * una medida clínica real — solo da estructura al catálogo hasta que Manny defina la
 * metadata de dificultad del banco.
 */
export function dificultadDeDominio(dominio: DominioIaim | null): Dificultad {
  switch (dominio) {
    case 'indicacion':
      return 'Básico';
    case 'adquisicion':
      return 'Básico';
    case 'interpretacion':
      return 'Intermedio';
    case 'decision_medica':
      return 'Avanzado';
    default:
      return 'Intermedio';
  }
}

export function labelDominio(dominio: DominioIaim | null): string {
  return dominio ? DOMINIO_LABEL[dominio] : 'General';
}

export { type DominioIaim };

/**
 * Mapea la `PropuestaEco` del pipeline (§7A) al FEEDBACK formativo del simulador.
 * Puro y determinista (sin efectos, sin LLM): fácil de testear. Traduce el lenguaje
 * de "evaluación" (nota/criterios) al de "entrenamiento" (aciertos/omisiones/
 * precisiones) y revela la verdad de referencia del caso.
 */
import type { PropuestaEco } from '../pipeline/tipos';
import type { CasoVerdad, SimuladorFeedback, TipoSimulador, FeedbackItem } from './simulador.tipos';

/** Corte para clasificar un criterio como acierto (≥) o precisión-por-mejorar (<). */
const UMBRAL_ACIERTO = 70;
const UMBRAL_PRECISION = 40;

export function mapearFeedback(
  propuesta: PropuestaEco,
  caso: CasoVerdad,
  tipo: TipoSimulador,
): SimuladorFeedback {
  const criterios = propuesta.detalle.criterios ?? [];
  const puntaje = propuesta.notaSugerida;

  const aciertos: FeedbackItem[] = criterios
    .filter((c) => c.puntaje >= UMBRAL_ACIERTO)
    .map((c) => ({ titulo: c.criterio, detalle: c.comentario ?? '' }));

  const precisiones: FeedbackItem[] = criterios
    .filter((c) => c.puntaje >= UMBRAL_PRECISION && c.puntaje < UMBRAL_ACIERTO)
    .map((c) => ({ titulo: c.criterio, detalle: c.comentario ?? '' }));

  // Omisiones = las que reportó Eco + los criterios claramente flojos (< precisión).
  const omisiones: FeedbackItem[] = [
    ...(propuesta.detalle.omisiones ?? []).map((o) => ({ titulo: o, detalle: '' })),
    ...criterios
      .filter((c) => c.puntaje < UMBRAL_PRECISION)
      .map((c) => ({ titulo: c.criterio, detalle: c.comentario ?? '' })),
  ];

  const modelo = propuesta.detalle.modelo;
  const proveedor = propuesta.detalle.proveedor;
  const mock =
    proveedor === 'mock' ||
    (typeof modelo === 'string' && modelo.toLowerCase().includes('mock')) ||
    propuesta.feedbackBorrador.includes('· MOCK]');

  return {
    tipo,
    puntaje,
    confianza: propuesta.confianza,
    titular: titularDe(puntaje),
    resumen: propuesta.feedbackBorrador.trim(),
    aciertos,
    omisiones,
    precisiones,
    lecturaDocente: lecturaDe(caso),
    diagnostico: caso.diagnosticoCorrecto,
    puntosAprendizaje: caso.puntosAprendizaje,
    eco: {
      proveedor,
      modelo,
      mock,
      pasos: propuesta.detalle.pasos ?? [],
    },
  };
}

/** Titular formativo (mentor, no examen) según el puntaje. */
export function titularDe(puntaje: number | null): string {
  if (puntaje === null) return 'Eco no pudo cerrar la evaluación; revísalo con tu docente.';
  if (puntaje >= 85) return 'Lectura sólida: cubriste lo esencial del caso.';
  if (puntaje >= 70) return 'Buena lectura, con algunos detalles por cerrar.';
  if (puntaje >= 50) return 'Vas encaminado; revisa lo que el tutor señaló.';
  return 'Conviene repasar este caso con calma.';
}

/** "Cómo lo leería tu docente": la referencia de hallazgos del caso curado. */
export function lecturaDe(caso: CasoVerdad): string {
  if (caso.hallazgosClave.length) return caso.hallazgosClave.join('. ') + '.';
  return caso.diagnosticoCorrecto ?? 'Sin lectura de referencia curada para este caso.';
}

/**
 * Motor de AUTOCALIFICACIÓN de la autoevaluación (§7A · "tools primero, LLM al final").
 *
 * Data PURA, sin IO ni LLM: es exactamente el paso 3 del pipeline de Eco —
 * «Tool (lógica): auto-califica lo objetivo, calcula lo determinista». Compara la
 * respuesta del alumno contra la clave correcta del reactivo y produce un veredicto
 * por reactivo + el puntaje objetivo agregado. Lo ABIERTO no se autocalifica (queda
 * `pendiente` → lo revisa el docente después · §5B/§7A).
 *
 * Se comparte entre `api` (que lo ejecuta al recibir las respuestas) y sus tests,
 * igual que `calcularCompetencia`. La forma completa del reactivo (con enunciado,
 * imagen, opciones…) vive en el editor del diseñador; aquí solo entra lo GRADABLE.
 */

/** Tipos de reactivo (== enum `lxp.reactivo_tipo` · mig 0018 · autoeval-contrato web). */
export type TipoReactivoGradable =
  | 'opcion_multiple'
  | 'multi'
  | 'verdadero_falso'
  | 'abierta';

/** Lo mínimo que el motor necesita de un reactivo para calificarlo. */
export interface ReactivoGradable {
  id: string;
  tipo: TipoReactivoGradable;
  /** Clave(s) correcta(s); `null` en abiertas (no autocalificables). */
  correcta: string | string[] | null;
  /** Puntos que vale el reactivo (objetivo). */
  puntaje: number;
  /** Dominio I-AIM opcional (para proyectar la señal de competencia al LRS · §1/§7). */
  dominio?: string;
  /** Retroalimentación mostrada tras responder. */
  retro?: string;
}

/** Respuesta del alumno a un reactivo (clave, claves o texto libre). */
export type RespuestaAlumno = string | string[] | null | undefined;

/** Mapa reactivoId → respuesta del alumno. */
export type RespuestasAutoeval = Record<string, RespuestaAlumno>;

/**
 * Veredicto por reactivo:
 *   · correcto / incorrecto   → objetivas contestadas
 *   · sin_responder           → objetiva sin respuesta (cuenta como 0)
 *   · pendiente               → abierta (la revisa el docente)
 */
export type VeredictoReactivo =
  | 'correcto'
  | 'incorrecto'
  | 'sin_responder'
  | 'pendiente';

/** Resultado de calificar un reactivo. */
export interface ResultadoReactivo {
  reactivoId: string;
  tipo: TipoReactivoGradable;
  veredicto: VeredictoReactivo;
  /** Puntos posibles (0 para abiertas: no entran al objetivo). */
  puntaje: number;
  /** Puntos obtenidos. */
  obtenido: number;
  /** Clave(s) correcta(s) — se revela solo DESPUÉS de calificar. */
  correcta: string | string[] | null;
  /** Retroalimentación del reactivo (si el diseñador la definió). */
  retro?: string;
}

/** Resultado agregado de una autoevaluación. */
export interface ResultadoAutoeval {
  resultados: ResultadoReactivo[];
  totalReactivos: number;
  /** Reactivos autocalificables (no abiertos). */
  objetivas: number;
  /** Objetivas acertadas. */
  correctas: number;
  /** Reactivos abiertos (→ revisión docente). */
  abiertas: number;
  /** Suma de puntajes objetivos posibles. */
  puntajeMax: number;
  /** Suma de puntajes objetivos obtenidos. */
  puntajeObtenido: number;
  /** Fracción 0..1 (`puntajeObtenido / puntajeMax`) o `null` si no hay objetivas. */
  escalado: number | null;
  /** `true` si el escalado alcanza el umbral (solo cuando hay objetivas). */
  aprobado: boolean;
}

/** Umbral de aprobación por defecto de una autoevaluación (fracción del objetivo). */
export const UMBRAL_APROBACION_AUTOEVAL = 0.6;

/** Normaliza a lista de claves comparables (minúsculas, sin vacíos, únicas, ordenadas). */
function clavesNormalizadas(v: RespuestaAlumno): string[] {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  const limpias = arr
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => s.length > 0);
  return Array.from(new Set(limpias)).sort();
}

/** ¿Dos conjuntos de claves son iguales (sin importar orden ni repetición)? */
function mismasClaves(a: RespuestaAlumno, b: RespuestaAlumno): boolean {
  const na = clavesNormalizadas(a);
  const nb = clavesNormalizadas(b);
  return na.length === nb.length && na.every((x, i) => x === nb[i]);
}

/**
 * Autocalifica una autoevaluación: objetivas contra la clave; abiertas → `pendiente`.
 * Determinista y sin efectos. El umbral rige solo la bandera `aprobado`.
 */
export function calificarAutoevaluacion(
  reactivos: ReactivoGradable[],
  respuestas: RespuestasAutoeval,
  umbral: number = UMBRAL_APROBACION_AUTOEVAL,
): ResultadoAutoeval {
  const resultados: ResultadoReactivo[] = reactivos.map((r) => {
    const resp = respuestas[r.id];

    // Abierta: no se autocalifica (la juzga el docente · §7A).
    if (r.tipo === 'abierta') {
      return {
        reactivoId: r.id,
        tipo: r.tipo,
        veredicto: 'pendiente',
        puntaje: 0,
        obtenido: 0,
        correcta: null,
        retro: r.retro,
      };
    }

    // Objetiva sin respuesta: cuenta como incorrecta (0), pero se distingue.
    if (clavesNormalizadas(resp).length === 0) {
      return {
        reactivoId: r.id,
        tipo: r.tipo,
        veredicto: 'sin_responder',
        puntaje: r.puntaje,
        obtenido: 0,
        correcta: r.correcta,
        retro: r.retro,
      };
    }

    const acierto = mismasClaves(resp, r.correcta);
    return {
      reactivoId: r.id,
      tipo: r.tipo,
      veredicto: acierto ? 'correcto' : 'incorrecto',
      puntaje: r.puntaje,
      obtenido: acierto ? r.puntaje : 0,
      correcta: r.correcta,
      retro: r.retro,
    };
  });

  const objetivas = resultados.filter((x) => x.tipo !== 'abierta');
  const puntajeMax = objetivas.reduce((s, x) => s + x.puntaje, 0);
  const puntajeObtenido = objetivas.reduce((s, x) => s + x.obtenido, 0);
  const escalado = puntajeMax > 0 ? puntajeObtenido / puntajeMax : null;

  return {
    resultados,
    totalReactivos: reactivos.length,
    objetivas: objetivas.length,
    correctas: objetivas.filter((x) => x.veredicto === 'correcto').length,
    abiertas: resultados.length - objetivas.length,
    puntajeMax,
    puntajeObtenido,
    escalado,
    aprobado: escalado !== null && escalado >= umbral,
  };
}

/** Puntaje objetivo agregado por dominio I-AIM. */
export interface ScoreDominioAutoeval {
  dominio: string;
  obtenido: number;
  max: number;
  /** Fracción 0..1 del dominio. */
  escalado: number;
}

/**
 * Agrega el puntaje objetivo por dominio I-AIM — la SEÑAL de competencia que la
 * autoevaluación aporta al LRS (§7: xAPI `experimentó` por dominio, igual que el
 * worker `calculo-competencia`). Ignora abiertas y reactivos sin dominio.
 */
export function scorePorDominioAutoeval(
  reactivos: ReactivoGradable[],
  resultados: ResultadoReactivo[],
): ScoreDominioAutoeval[] {
  const porId = new Map(reactivos.map((r) => [r.id, r]));
  const acc = new Map<string, { obtenido: number; max: number }>();

  for (const res of resultados) {
    if (res.tipo === 'abierta') continue;
    const dominio = porId.get(res.reactivoId)?.dominio;
    if (!dominio) continue;
    const cur = acc.get(dominio) ?? { obtenido: 0, max: 0 };
    cur.obtenido += res.obtenido;
    cur.max += res.puntaje;
    acc.set(dominio, cur);
  }

  return Array.from(acc.entries())
    .filter(([, v]) => v.max > 0)
    .map(([dominio, v]) => ({
      dominio,
      obtenido: v.obtenido,
      max: v.max,
      escalado: v.obtenido / v.max,
    }));
}

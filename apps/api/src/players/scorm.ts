/**
 * Interpretación del runtime SCORM (§7 · Sprint 6). PURO y sin dependencias: traduce
 * el modelo CMI (SCORM 1.2 y 2004) a un veredicto de progreso comparable para
 * persistir y para decidir qué verbo xAPI emitir al LRS. El player captura el CMI; el
 * LXP no reimplementa la spec, solo lo resume.
 */

/** Modelo CMI aplanado tal como lo envía un runtime SCORM (claves con o sin `cmi.`). */
export type Cmi = Record<string, unknown>;

export interface VeredictoScorm {
  completado: boolean;
  /** true = aprobó, false = reprobó, null = sin veredicto de éxito. */
  aprobado: boolean | null;
  porcentaje: number; // 0–100
  /** Score escalado 0–1 (para xAPI result.score.scaled), null si no hay score. */
  scaled: number | null;
}

/** Lee una clave admitiendo prefijo `cmi.` y sin él. */
function leer(cmi: Cmi, ...claves: string[]): string | undefined {
  for (const k of claves) {
    const v = cmi[k] ?? cmi[`cmi.${k}`];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return undefined;
}

function aNumero(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Resume el CMI en un veredicto de progreso (SCORM 1.2 + 2004). */
export function interpretarCmi(cmi: Cmi): VeredictoScorm {
  // SCORM 1.2: cmi.core.lesson_status ∈ passed|completed|failed|incomplete|browsed|...
  const lessonStatus = (
    leer(cmi, 'core.lesson_status', 'lesson_status') ?? ''
  ).toLowerCase();
  // SCORM 2004: completion_status ∈ completed|incomplete; success_status ∈ passed|failed
  const completionStatus = (leer(cmi, 'completion_status') ?? '').toLowerCase();
  const successStatus = (leer(cmi, 'success_status') ?? '').toLowerCase();

  const completado =
    completionStatus === 'completed' ||
    lessonStatus === 'completed' ||
    lessonStatus === 'passed';

  let aprobado: boolean | null = null;
  if (successStatus === 'passed' || lessonStatus === 'passed') aprobado = true;
  else if (successStatus === 'failed' || lessonStatus === 'failed') aprobado = false;

  // Score: 2004 `score.scaled` (0–1) preferente; si no, raw/max (1.2).
  const scaledRaw = aNumero(leer(cmi, 'score.scaled'));
  const raw = aNumero(leer(cmi, 'core.score.raw', 'score.raw'));
  const max = aNumero(leer(cmi, 'core.score.max', 'score.max')) ?? 100;

  let scaled: number | null = null;
  if (scaledRaw !== undefined) scaled = Math.max(-1, Math.min(1, scaledRaw));
  else if (raw !== undefined && max > 0) scaled = Math.max(0, Math.min(1, raw / max));

  const porcentaje = scaled !== null ? Math.round(scaled * 100) : completado ? 100 : 0;

  return { completado, aprobado, porcentaje, scaled };
}

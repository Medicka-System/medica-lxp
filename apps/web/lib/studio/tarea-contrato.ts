/**
 * CONTRATO del editor de lección tipo `tarea` (§5C · mig 0023).
 *
 * Módulo PURO (sin React ni 'use server'): lo comparten el editor cliente y las
 * server actions. La tarea es un tipo `config-backed`: su configuración vive en
 * `lxp.lecciones.config`. La rúbrica NO es inline: se SELECCIONA del catálogo
 * reutilizable (`lxp.rubricas`, familia `tareas` · §5C) y la tarea solo guarda su
 * `rubricaId` + lineamientos + valor. La define el diseñador (§5B).
 */

/** El objeto único que guarda la lección `tarea` en `lecciones.config`. */
export type TareaConfig = {
  /** Rúbrica seleccionada del catálogo (`lxp.rubricas`). null = sin rúbrica aún. */
  rubricaId?: string | null;
  /** Lineamientos de la entrega (HTML del EditorRico). */
  lineamientos?: string;
  /** Valor/peso de la tarea (puntos). */
  valor?: number;
  /** Formato de entrega esperado. */
  entrega?: 'archivo' | 'texto' | 'ambos';
};

export const ENTREGA_ROTULO: Record<NonNullable<TareaConfig['entrega']>, string> = {
  archivo: 'Archivo adjunto',
  texto: 'Texto en línea',
  ambos: 'Archivo y/o texto',
};

/** Una rúbrica del catálogo, tal como la lee el editor (web→Supabase · §2). */
export type RubricaCatalogo = {
  id: string;
  nombre: string;
  tipo: 'estudios_reportes' | 'tareas';
  descripcion: string | null;
  publicado: boolean;
  criterios: { criterio?: string; descripcion?: string; peso?: number }[];
};

/** Normaliza el `config` crudo de la lección a `TareaConfig` (defaults seguros). */
export function comoTareaConfig(raw: Record<string, unknown> | null | undefined): TareaConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const entrega = c.entrega;
  return {
    rubricaId: typeof c.rubricaId === 'string' && c.rubricaId ? c.rubricaId : null,
    lineamientos: typeof c.lineamientos === 'string' ? c.lineamientos : '',
    valor: typeof c.valor === 'number' && c.valor >= 0 ? c.valor : undefined,
    entrega: entrega === 'archivo' || entrega === 'texto' || entrega === 'ambos' ? entrega : 'archivo',
  };
}

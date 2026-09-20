/**
 * CONTRATO del editor de lección tipo `autoevaluacion` (§5C · mig 0023).
 *
 * Módulo PURO (sin React ni 'use server'): lo comparten el editor cliente y las
 * server actions. La autoevaluación es un tipo `config-backed`: TODO su contenido
 * vive en `lxp.lecciones.config` (la fuente de verdad), con esta forma.
 *
 * ¿Por qué el banco vive en `config` y no en `lxp.reactivos`?  El contrato del
 * constructor deja que cada editor decida cómo puentea datos viejos. La
 * autoevaluación como LECCIÓN (nuevo modelo) guarda su examen en `config`: así
 * soporta imagen por reactivo y edición libre sin tocar el esquema. El endpoint
 * `/reactivos/importar` del `api` (que sí escribe en `lxp.reactivos`) se reutiliza
 * SOLO para su parseo server-side de CSV/Excel: la server action de import lo llama
 * contra una actividad-puente de scratch, lee los reactivos ya parseados y los
 * pliega a `config`. Eco (`/ai/proponer-examen`) devuelve reactivos en el cuerpo y
 * también se pliegan a `config`.
 */

/** Tipos de reactivo (== enum `lxp.reactivo_tipo` · mig 0018). */
export type ReactivoTipo = 'opcion_multiple' | 'multi' | 'verdadero_falso' | 'abierta';

export const REACTIVO_TIPOS: readonly ReactivoTipo[] = [
  'opcion_multiple',
  'multi',
  'verdadero_falso',
  'abierta',
] as const;

export const ROTULO_REACTIVO: Record<ReactivoTipo, string> = {
  opcion_multiple: 'Opción múltiple',
  multi: 'Selección múltiple',
  verdadero_falso: 'Verdadero / Falso',
  abierta: 'Respuesta abierta',
};

/** Una opción de un reactivo. */
export type OpcionReactivo = { clave: string; texto: string };

/**
 * Un reactivo tal como vive en `lecciones.config.reactivos`. `id` es un id estable
 * del cliente (para keys/reorden); `correcta` es la(s) clave(s) correcta(s) (null
 * en abiertas). `imagen` es opcional (URL) para reactivos con apoyo visual.
 */
export type ReactivoConfig = {
  id: string;
  tipo: ReactivoTipo;
  enunciado: string;
  imagen?: string;
  opciones: OpcionReactivo[];
  correcta: string | string[] | null;
  puntaje: number;
  /** Dominio I-AIM opcional (para proyectar a competencia · §1). */
  dominio?: string;
  /** Retroalimentación mostrada tras responder. */
  retro?: string;
  origen?: 'manual' | 'import' | 'eco';
};

/** El objeto único que guarda la lección `autoevaluacion` en `lecciones.config`. */
export type AutoevalConfig = {
  reactivos: ReactivoConfig[];
  /** Instrucciones/introducción para el alumno. */
  descripcion?: string;
  /** Intentos permitidos (0 = ilimitados). */
  intentos?: number;
  /** Barajar el orden de los reactivos al presentarlos. */
  barajar?: boolean;
  /** Mostrar la retroalimentación tras responder. */
  mostrarRetro?: boolean;
  /**
   * Actividad-puente de scratch (`lxp.actividades`) que usa `/reactivos/importar`
   * para su parseo. La crea la server action al primer import y la reutiliza.
   */
  actividadId?: string;
};

/** Normaliza el `config` crudo de la lección a `AutoevalConfig` (defaults seguros). */
export function comoAutoevalConfig(raw: Record<string, unknown> | null | undefined): AutoevalConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const reactivos = Array.isArray(c.reactivos)
    ? (c.reactivos as unknown[]).map(normalizarReactivo).filter((r): r is ReactivoConfig => r !== null)
    : [];
  return {
    reactivos,
    descripcion: typeof c.descripcion === 'string' ? c.descripcion : undefined,
    intentos: typeof c.intentos === 'number' && c.intentos >= 0 ? c.intentos : undefined,
    barajar: c.barajar === true,
    mostrarRetro: c.mostrarRetro !== false, // por defecto se muestra
    actividadId: typeof c.actividadId === 'string' ? c.actividadId : undefined,
  };
}

const TIPOS = new Set<ReactivoTipo>(REACTIVO_TIPOS);

/** Normaliza un reactivo crudo (de config, Eco o import) al tipo del contrato. */
export function normalizarReactivo(raw: unknown): ReactivoConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const enunciado = typeof r.enunciado === 'string' ? r.enunciado.trim() : '';
  if (!enunciado) return null;
  const tipo: ReactivoTipo = TIPOS.has(r.tipo as ReactivoTipo)
    ? (r.tipo as ReactivoTipo)
    : 'opcion_multiple';
  const opciones: OpcionReactivo[] = Array.isArray(r.opciones)
    ? (r.opciones as unknown[])
        .map((o) => {
          const oo = (o ?? {}) as Record<string, unknown>;
          return { clave: String(oo.clave ?? ''), texto: String(oo.texto ?? '') };
        })
        .filter((o) => o.clave || o.texto)
    : [];
  const correctaRaw = r.correcta;
  const correcta: string | string[] | null =
    tipo === 'abierta'
      ? null
      : Array.isArray(correctaRaw)
        ? correctaRaw.map(String)
        : correctaRaw != null
          ? String(correctaRaw)
          : null;
  const puntajeRaw = Number(r.puntaje);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : nuevoId(),
    tipo,
    enunciado,
    imagen: typeof r.imagen === 'string' && r.imagen.trim() ? r.imagen.trim() : undefined,
    opciones,
    correcta,
    puntaje: Number.isFinite(puntajeRaw) && puntajeRaw > 0 ? puntajeRaw : 1,
    dominio: typeof r.dominio === 'string' && r.dominio ? r.dominio : undefined,
    retro: typeof r.retro === 'string' && r.retro.trim() ? r.retro.trim() : undefined,
    origen:
      r.origen === 'import' || r.origen === 'eco' || r.origen === 'manual'
        ? (r.origen as ReactivoConfig['origen'])
        : 'manual',
  };
}

/** Id estable para reactivos/opciones (no depende de crypto para SSR: prefijo + azar). */
export function nuevoId(): string {
  return 'r-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Claves a,b,c… para nuevas opciones. */
export const CLAVES_OPCION = 'abcdefghijklmnopqrstuvwxyz';

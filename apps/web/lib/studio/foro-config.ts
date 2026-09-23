/**
 * CONTRATO de la config de una lección tipo `foro` (§5C · mig 0023).
 *
 * Módulo PURO (sin React ni server-only): lo comparten el EDITOR del diseñador
 * (cliente), la SERVER ACTION que persiste (`acciones.ts`) y el MOTOR del alumno
 * (`lib/campus/foro-datos.ts`). Es la forma canónica de lo que el diseñador
 * configura y de lo único que el alumno lee para su discusión.
 *
 * El foro es una DISCUSIÓN CERRADA DEL GRUPO (§1), no el Ateneo. El diseñador la
 * configura desde la lección; los mensajes (posts + comentarios) viven en el motor
 * que YA existe (`lxp.foro_mensajes`, Sprint 5), anclado a una actividad foro de
 * respaldo. Aquí NO se guarda ni un mensaje: solo la configuración de la discusión.
 *
 * Fuente de verdad = `lxp.lecciones.config`. Todo lo que el motor muestra al alumno
 * (instrucciones, reglas, ventana, valor) sale de aquí, no de `actividades`.
 */

/** Modalidad de la discusión: en vivo (síncrona) o a lo largo del tiempo (asíncrona). */
export type ModalidadForo = 'sincrono' | 'asincrono';

/** Cómo cuenta la participación para la calificación (§5B — valor de la actividad). */
export type ParticipacionForo = {
  /** ¿La participación en el foro cuenta para la calificación? */
  califica: boolean;
  /** Valor/puntos de la participación (solo si `califica`). null = sin fijar. */
  puntos: number | null;
  /** Mínimo de temas propios para acreditar la participación. */
  minPosts: number;
  /** Mínimo de comentarios (respuestas a otros) para acreditar. */
  minComentarios: number;
};

/**
 * Config de la lección tipo `foro` (== objeto en `lxp.lecciones.config`).
 * `actividadId` es el ancla al motor (`foro_mensajes.actividad_id`): lo fija la
 * server action al guardar (no el diseñador). null hasta que se guarda por 1ª vez.
 */
export type ConfigForo = {
  /** Pregunta/tema del foro (el H1 que ve el alumno). Vacío = usa el nombre de la lección. */
  tema: string;
  /** Consigna del foro en HTML (EditorRico). Lo que el alumno lee arriba del hilo. */
  instrucciones: string;
  /** Reglas de participación (una por línea/ítem). Texto plano. */
  reglas: string[];
  modalidad: ModalidadForo;
  /** Apertura (datetime-local, p. ej. "2026-09-20T09:00"). null = sin fecha de inicio. */
  aperturaEn: string | null;
  /** Cierre. null = sin fecha de cierre (siempre abierto una vez iniciado). */
  cierreEn: string | null;
  participacion: ParticipacionForo;
  /**
   * Rúbrica de participación del CATÁLOGO (`lxp.rubricas`, tipo `tareas`) — como en la
   * tarea: la actividad SELECCIONA la rúbrica, no la redacta. null = sin rúbrica.
   */
  rubricaId: string | null;
  /** Ancla al motor: la actividad foro de respaldo que agrupa los mensajes. */
  actividadId: string | null;
};

/** Config por defecto de un foro recién creado (antes de que el diseñador lo toque). */
export const CONFIG_FORO_DEFAULT: ConfigForo = {
  tema: '',
  instrucciones: '',
  reglas: [],
  modalidad: 'asincrono',
  aperturaEn: null,
  cierreEn: null,
  participacion: { califica: false, puntos: null, minPosts: 1, minComentarios: 0 },
  rubricaId: null,
  actividadId: null,
};

/* ─────────────────────────── Normalización defensiva ─────────────────────────── */

function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function comoLista(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
}

function comoEnteroNoNeg(v: unknown, def: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

function comoFechaOpc(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function comoModalidad(v: unknown): ModalidadForo {
  return v === 'sincrono' ? 'sincrono' : 'asincrono';
}

function comoParticipacion(v: unknown): ParticipacionForo {
  const o = (v ?? {}) as Record<string, unknown>;
  const puntosRaw = o.puntos;
  const puntos =
    typeof puntosRaw === 'number' && Number.isFinite(puntosRaw) && puntosRaw >= 0
      ? puntosRaw
      : null;
  return {
    califica: o.califica === true,
    puntos,
    minPosts: comoEnteroNoNeg(o.minPosts, 1),
    minComentarios: comoEnteroNoNeg(o.minComentarios, 0),
  };
}

/**
 * Normaliza el `config` crudo de la BD (jsonb, forma no garantizada) al `ConfigForo`.
 * Nunca lanza: rellena con defaults. Úsalo en el borde (editor, acción, motor).
 */
export function comoConfigForo(v: unknown): ConfigForo {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    tema: comoTexto(o.tema),
    instrucciones: comoTexto(o.instrucciones),
    reglas: comoLista(o.reglas),
    modalidad: comoModalidad(o.modalidad),
    aperturaEn: comoFechaOpc(o.aperturaEn),
    cierreEn: comoFechaOpc(o.cierreEn),
    participacion: comoParticipacion(o.participacion),
    rubricaId: typeof o.rubricaId === 'string' && o.rubricaId ? o.rubricaId : null,
    actividadId: typeof o.actividadId === 'string' && o.actividadId ? o.actividadId : null,
  };
}

/* ─────────────────────────── Ventana de apertura ─────────────────────────── */

/** Estado de la ventana del foro respecto a una fecha de referencia. */
export type EstadoVentanaForo = 'siempre' | 'programado' | 'abierto' | 'cerrado';

export type VentanaForo = {
  estado: EstadoVentanaForo;
  /** ¿Se puede publicar ahora (según las fechas)? El acceso/grupo se validan aparte. */
  abierto: boolean;
};

/**
 * Calcula el estado de la ventana del foro según apertura/cierre y una fecha `ahora`
 * (pásala explícita para que sea testeable). Fechas inválidas se ignoran (como si
 * no existieran) para no cerrar un foro por un dato mal escrito.
 */
export function estadoVentanaForo(config: ConfigForo, ahora: Date): VentanaForo {
  const apertura = fechaValida(config.aperturaEn);
  const cierre = fechaValida(config.cierreEn);

  if (apertura && ahora < apertura) return { estado: 'programado', abierto: false };
  if (cierre && ahora > cierre) return { estado: 'cerrado', abierto: false };
  if (apertura || cierre) return { estado: 'abierto', abierto: true };
  return { estado: 'siempre', abierto: true };
}

function fechaValida(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Contratos de la consola del DOCENTE (§5B). Tipos compartidos entre las lecturas
 * (`datos.ts`), las acciones (`acciones.ts`) y las pantallas. Nombres de dominio en
 * español (§5).
 *
 * ── Reparto REAL vs PENDIENTE ────────────────────────────────────────────────
 * REAL (web → Supabase con RLS, Regla de Oro §2): la cola de casos por validar, las
 * entregas, las consultas 1:1, los grupos del docente, sus recursos y la moderación
 * del Ateneo. La decisión de validar/calificar se ASIENTA aquí (insert/update bajo
 * RLS `es_docente_o_mas`).
 *
 * CONECTADO A ECO (§7A · Sprint 5.3): la bandeja pre-analizada la LEE el web directo
 * de `lxp.eco_propuestas` bajo RLS (`es_docente_o_mas`) — ver `PropuestaEcoResumen`.
 * Disparar el análisis y el cierre humano pasan por `apps/api` (`_lib/eco.server.ts`),
 * que es dominio/orquestación (permitido en `api` · §2), no proxy de CRUD.
 *
 * PENDIENTE DE API (dominio / worker · §2/§8), marcado en cada punto:
 *   • Al aprobar un caso → encolar `calculo-competencia` + xAPI `validó` (§8.4/§7).
 *   • Nº de alumnos y avance por grupo → cruzar inscripción de CORA (Sprint 11) +
 *     proyección de competencia (worker · §3).
 *   • Próxima clase / iniciar clase → integración Zoom (Sprint 6, §9).
 *   • Borrador de respuesta de consulta / Eco conversacional → NO hay endpoint aún en
 *     `apps/api` (solo lote/confirmar/descartar/indexar/config). Ver `consultas`.
 */

import type { EstudioDicom } from '@/components/dicom';

export type DominioIaim = 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';

// ── Propuesta de Eco (bandeja pre-analizada · §7A) ──────────────────────────────
/** Confianza con que Eco separa la bandeja (§7A): apto para lote vs uno a uno. */
export type ClasificacionEco = 'listo' | 'requiere_criterio';

/**
 * Resumen de la propuesta que Eco dejó para un objeto (caso/entrega), leído de
 * `lxp.eco_propuestas` (§7A). Es un BORRADOR: `notaSugerida`/`feedbackBorrador` son
 * sugerencias; nada se asienta sin que el docente confirme. `notaSugerida` viene en
 * escala 0–100 (contrato del `api`); la UI de entregas la muestra también sobre 10.
 */
export type PropuestaEcoResumen = {
  propuestaId: string;
  notaSugerida: number | null;
  feedbackBorrador: string | null;
  /** 0..1 — qué tan segura está Eco de su propia evaluación. */
  confianza: number;
  clasificacion: ClasificacionEco;
  /** Desglose por criterio de la rúbrica (de `detalle.criterios`). */
  criterios: { criterio: string; puntaje: number; comentario?: string }[];
  /** Omisiones que Eco detectó (de `detalle.omisiones`). */
  omisiones: string[];
  /** Modelo que emitió el juicio (traza · de `detalle.modelo`). */
  modelo: string | null;
};

export const DOMINIO_LABEL: Record<DominioIaim, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión médica',
};

// ── Cabecera del docente (para el shell) ────────────────────────────────────────
export type CabeceraDocente = { nombre: string; casosEnCola: number };

// ── Dashboard (bandeja) ─────────────────────────────────────────────────────────
export type PendientesResumen = {
  casos: number;
  entregas: number;
  /** Foros con actividad sin respuesta del docente — PENDIENTE (hilos sin responder). */
  foros: number;
};

export type GrupoSeguimiento = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: 'sincrono' | 'asincrono';
  fechaInicio: Date | null;
  fechaFin: Date | null;
  /** PENDIENTE (Sprint 11): nº de inscritos vive en CORA; null hasta cruzarlo. */
  alumnos: number | null;
  /** PENDIENTE (worker): avance del programa = proyección de competencia; null. */
  avance: number | null;
};

export type PostAteneoResumen = {
  id: string;
  autor: string;
  iniciales: string;
  tipo: 'caso' | 'encuesta' | 'anuncio_comunidad';
  titulo: string;
  extracto: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  comentarios: number;
  creadoEn: Date;
};

export type DocenteDashboard = {
  pendientes: PendientesResumen;
  totalGrupos: number;
  grupos: GrupoSeguimiento[];
  ateneo: PostAteneoResumen[];
};

// ── Validación de casos (la cola clínica) ───────────────────────────────────────
export type CasoValidacion = {
  id: string;
  /** Grupo del caso (para disparar el análisis de Eco por grupo · §7A). */
  grupoId: string | null;
  alumno: string;
  iniciales: string;
  organo: string | null;
  dominio: DominioIaim | null;
  modulo: string | null;
  hallazgos: string | null;
  presuntivo: string | null;
  horas: number;
  creadoEn: Date;
  /** Horas en cola (para marcar lo que urge: >72 h). */
  horasEnCola: number;
  /** Estudio DICOM: piezas/serie + si trae cine-loop (pipeline 4.7). */
  tieneDicom: boolean;
  series: number;
  cineLoop: boolean;
  /**
   * Estudio DICOM ya parseado/anonimizado para el visor real (Cornerstone3D). `null`
   * cuando el caso aún no tiene estudio anonimizado (pipeline `procesar-dicom` · §8).
   */
  estudio: EstudioDicom | null;
  /** Propuesta pre-analizada por Eco (bandeja · §7A); `null` si no se ha analizado. */
  eco: PropuestaEcoResumen | null;
};

// ── Entregas por revisar ────────────────────────────────────────────────────────
export type TipoActividad = 'tarea' | 'autoevaluacion' | 'foro';
export type EstadoEntrega = 'pendiente' | 'enviada' | 'calificada' | 'devuelta';

export type EntregaRevision = {
  id: string;
  /** Grupo de la entrega (para disparar el análisis de Eco por grupo · §7A). */
  grupoId: string | null;
  alumno: string;
  iniciales: string;
  actividad: string;
  /** Ancla por actividad (modelo viejo, aún vivo); '' si la entrega es puro modelo nuevo. */
  actividadId: string;
  /** Ancla por lección (modelo nuevo · mig 0026); null en entregas viejas. */
  leccionId: string | null;
  tipoActividad: TipoActividad;
  leccion: string | null;
  modulo: string | null;
  estado: EstadoEntrega;
  nota: number | null;
  /** Nota provino de una sugerencia de Eco (§7A). */
  ecoSugerida: boolean;
  notaAlumno: string | null;
  creadoEn: Date;
  /** Propuesta pre-analizada por Eco (bandeja · §7A); `null` si no se ha analizado. */
  eco: PropuestaEcoResumen | null;
};

// ── Consultas 1:1 ───────────────────────────────────────────────────────────────
export type MensajeConsulta = {
  id: string;
  autor: 'docente' | 'alumno';
  autorNombre: string;
  cuerpo: string;
  creadoEn: Date;
};

export type ConsultaHilo = {
  id: string;
  alumno: string;
  iniciales: string;
  asunto: string;
  estado: 'abierta' | 'cerrada';
  actualizado: Date;
  ultimoMensaje: string | null;
  mensajes: number;
};

export type ConsultaDetalle = {
  id: string;
  alumno: string;
  iniciales: string;
  asunto: string;
  estado: 'abierta' | 'cerrada';
  mensajes: MensajeConsulta[];
};

// ── Mis recursos (almacén personal) ─────────────────────────────────────────────
export type RecursoDocente = {
  id: string;
  titulo: string;
  tipo: string | null;
  ref: string | null;
  creadoEn: Date;
};

// ── Clases (Zoom · PENDIENTE Sprint 6) ──────────────────────────────────────────
export type ClaseAgenda = {
  grupoId: string;
  grupo: string;
  programa: string;
  modalidad: 'sincrono' | 'asincrono';
};

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
 * PENDIENTE DE API (dominio / worker · §2/§8), marcado en cada punto:
 *   • Al aprobar un caso → encolar `calculo-competencia` + xAPI `validó` (§8.4/§7).
 *   • Eco (bandeja por confianza, nota sugerida, borradores de feedback) → §7A.
 *   • Nº de alumnos y avance por grupo → cruzar inscripción de CORA (Sprint 11) +
 *     proyección de competencia (worker · §3).
 *   • Próxima clase / iniciar clase → integración Zoom (Sprint 6, §9).
 */

export type DominioIaim = 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';

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
};

// ── Entregas por revisar ────────────────────────────────────────────────────────
export type TipoActividad = 'tarea' | 'autoevaluacion' | 'foro';
export type EstadoEntrega = 'pendiente' | 'enviada' | 'calificada' | 'devuelta';

export type EntregaRevision = {
  id: string;
  alumno: string;
  iniciales: string;
  actividad: string;
  tipoActividad: TipoActividad;
  leccion: string | null;
  modulo: string | null;
  estado: EstadoEntrega;
  nota: number | null;
  /** Nota provino de una sugerencia de Eco (§7A). */
  ecoSugerida: boolean;
  notaAlumno: string | null;
  creadoEn: Date;
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

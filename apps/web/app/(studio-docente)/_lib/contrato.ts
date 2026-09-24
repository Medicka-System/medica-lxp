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
/** Estado clínico del caso (espejo de `lxp.estado_validacion`). */
export type EstadoCasoValidacion = 'pendiente' | 'aprobado' | 'rechazado';

export type CasoValidacion = {
  id: string;
  /** Grupo del caso (para disparar el análisis de Eco por grupo · §7A). */
  grupoId: string | null;
  /** Alumno dueño del caso (para agrupar la bandeja y cargar sus estudios). */
  alumnoId: string;
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
  /** Estado clínico. La cola por validar es siempre `pendiente`; al abrir un estudio ya
   *  aprobado/devuelto desde la rejilla del alumno, el detalle se muestra de solo lectura. */
  estado: EstadoCasoValidacion;
  /** Devolución del docente ya asentada (aprobado/rechazado); `null` si sigue pendiente. */
  notaValidacion: string | null;
};

// ── Estudios del alumno (rejilla de Validación · mock (studio-docente)/validacion/alumno) ──
/** Estado del estudio en la rejilla del alumno. `devuelto` = `rechazado` del dominio. */
export type EstadoEstudio = 'pendiente' | 'aprobado' | 'devuelto';

/**
 * Pre-análisis de Eco para un estudio pendiente. **PLACEHOLDER** en esta fase: Eco NO
 * está conectado a la rejilla; el chip se alimenta de un stub del cliente. El día que se
 * conecte, este objeto vendrá del pipeline (`lxp.eco_propuestas` · §7A). Eco propone, el
 * docente firma.
 */
export type SugerenciaEco = { veredicto: 'confirmar' | 'criterio'; confianza: number };

/**
 * Un estudio de la bitácora del alumno visto por el docente (todos los estados). La imagen
 * (primer frame) la RENDERIZA el cliente desde el DICOM anonimizado (no hay miniatura de
 * servidor): el card monta `MiniaturaEstudio` por `id`, que mide la proporción nativa.
 */
export type EstudioAlumno = {
  id: string;
  /** Diagnóstico presuntivo del alumno (título del card). */
  titulo: string;
  /** Código corto del módulo, p. ej. "M04"; "—" si el caso no tiene módulo. */
  modulo: string;
  organo: string;
  fechaEnvio: string; // ISO
  /** 1 = imagen(es) fija(s); > 1 = cine loop (frames del `.dcm` multi-frame). */
  frames: number;
  /** Nº de imágenes/series del estudio. */
  imagenes: number;
  estado: EstadoEstudio;
  /** Acreditables (pendiente/devuelto) o acreditadas (aprobado). */
  horas: number;
  /** Horas en cola; solo en pendientes. */
  horasEsperando?: number;
  /** Sugerencia de Eco (PLACEHOLDER · solo pendientes · la pone el cliente). */
  eco?: SugerenciaEco;
  /** aprobado: comentario del docente · devuelto: feedback con lo que debe corregir. */
  nota?: string;
};

/** Cabecera del alumno en la rejilla de Validación (identidad + cifras). */
export type ResumenAlumno = {
  id: string;
  ini: string;
  nombre: string;
  especialidad: string;
  grupo: string;
  leccionActual: string;
  horasAcumuladas: number;
  competenciaInterpretacion: number;
};

/** Payload que consume la rejilla: identidad del alumno + todos sus estudios. */
export type EstudiosAlumnoData = { alumno: ResumenAlumno; estudios: EstudioAlumno[] };

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

// ── Vista de Entregas (bandeja fiel al mock · §5B) ───────────────────────────────
/**
 * Contrato de la pantalla `/docente/entregas` reconstruida fiel al mock aprobado
 * (`campus-lxp-mocks/studio/docente/entregas`). A diferencia de `EntregaRevision`
 * (lista plana), aquí la vista se organiza por GRUPO × ACTIVIDAD: la lección de tipo
 * `tarea`/`autoevaluacion` es la "actividad". Todo esto se LEE de BD real (RLS
 * `es_staff` / roster de CORA); las superficies de Eco (pre-análisis, chat, lote) son
 * PLACEHOLDER — no hay pipeline conectado aquí (§7A · se enchufa al final).
 *
 * Estado de la fila en la bandeja (vocabulario del mock + `calificada` para tareas ya
 * asentadas, que el mock no cubría explícitamente):
 *   · `auto`             → autoevaluación (la califica el sistema al enviarse).
 *   · `requiere-lectura` → tarea abierta sin calificar (espera al docente · ÁMBAR).
 *   · `sugerida`         → tarea con nota sugerida por Eco (PLACEHOLDER · VIOLETA).
 *   · `calificada`       → tarea ya asentada por el docente.
 *   · `sin-entregar`     → alumno del roster sin entrega (bloque aparte).
 */
export type EstadoVistaEntrega =
  | 'auto'
  | 'sugerida'
  | 'requiere-lectura'
  | 'calificada'
  | 'sin-entregar';

/** Tipo de entrega en la vista: la `tarea` del dominio se muestra como "abierta". */
export type TipoVistaEntrega = 'abierta' | 'autoevaluacion';

/** Alumno mínimo para avatar + nombre (roster o autor de la entrega). */
export type AlumnoRef = { id: string; ini: string; nombre: string };

/** Referencia a la actividad (lección `tarea`/`autoevaluacion`) del selector. */
export type ActividadRef = {
  /** `leccion_id` — ancla de la vista. */
  id: string;
  /** Clave corta tipo `M02 · L3` (orden de módulo · orden de lección). */
  clave: string;
  titulo: string;
  tipo: TipoVistaEntrega;
  /** Consigna (lineamientos de la tarea, texto plano); null en autoevaluación. */
  consigna: string | null;
};

/** Un criterio de la rúbrica del catálogo, tal como se muestra en el detalle. */
export type CriterioRubricaVista = {
  id: string;
  texto: string;
  /** Peso en % (0–100). */
  peso: number;
  descripcion: string | null;
};

/**
 * Pre-análisis de Eco — PLACEHOLDER. La estructura y el espacio están listos; los
 * datos son de EJEMPLO y no provienen de ningún pipeline. Se enchufa al final (§7A).
 */
export type PreAnalisisEcoPlaceholder = {
  notaSugerida: number;
  confianza: 'alta' | 'media' | 'baja';
  sustento: { clase: 'ok' | 'falta'; texto: string }[];
  comentario: string;
  /** Marca explícita: estos datos NO son reales. */
  esPlaceholder: true;
};

/** Una entrega en la bandeja de la vista (datos reales de `lxp.entregas`). */
export type EntregaVista = {
  id: string;
  alumno: AlumnoRef;
  tipo: TipoVistaEntrega;
  estado: EstadoVistaEntrega;
  creadoEn: Date;
  nota: number | null;
  /** Texto de la respuesta del alumno partido en párrafos (tarea); null en autoeval. */
  respuesta: string[] | null;
  /** Rúbrica del diseñador (catálogo) contra la que se juzga; null si la actividad no tiene. */
  rubrica: CriterioRubricaVista[] | null;
  /** Nota informada por una sugerencia de Eco (hoy siempre placeholder). */
  ecoSugerida: boolean;
};

/** Acierto del grupo en una pregunta objetiva de la autoevaluación. */
export type PreguntaAcierto = {
  n: string;
  texto: string;
  aciertoPct: number;
  aciertos: string;
};

/** Auditoría de una autoevaluación (se califica sola; el docente solo observa). */
export type AuditoriaAutoeval = {
  contestada: string;
  estadisticas: { promedio: number; mediana: number; masBaja: number; masAlta: number } | null;
  preguntas: PreguntaAcierto[];
};

/** Todo lo que necesita la pantalla para una selección grupo × actividad. */
export type EntregasVista = {
  grupo: { id: string; nombre: string } | null;
  grupos: { id: string; nombre: string }[];
  actividad: ActividadRef | null;
  actividades: ActividadRef[];
  resumen: {
    entregadas: number;
    delGrupo: number;
    autoCalificadas: number;
    porConfirmar: number;
    promedio: number | null;
    sinEntregar: number;
    vencio: string;
  };
  entregas: EntregaVista[];
  sinEntregar: AlumnoRef[];
  /** PLACEHOLDER (Eco): nº de entregas que Eco confirmaría en lote. Hoy de ejemplo. */
  altaConfianza: number;
  /** Presente solo cuando la actividad es autoevaluación. */
  auditoria: AuditoriaAutoeval | null;
};

// ── Consultas 1:1 (docente) — chat entre PERSONAS (§5B) ──────────────────────────
// Contraparte de la consola del alumno (`app/(campus)/consultas`). El docente ve las
// consultas que le abren sus ALUMNOS y el STAFF (contacto_id/id_docente = él) y responde.
// El estado 'abierta|cerrada' se ALMACENA; "sin-responder/respondida" se DERIVA de la
// dirección del último mensaje (mismo criterio que el lado alumno · mig 0034).
// Eco es MOCK/placeholder aquí: no hay endpoint conversacional todavía (§7A).

/** El estado que pinta la bandeja: quién debe la próxima respuesta. */
export type EstadoConsultaDoc = 'sin-responder' | 'respondida' | 'cerrada';

/** La otra parte del hilo, desde la óptica del docente: un alumno o un miembro del staff. */
export type TipoContraparte = 'alumno' | 'staff';

export type ContraparteConsulta = {
  id: string;
  ini: string;
  nombre: string;
  tipo: TipoContraparte;
  /** Contexto académico (solo alumno); `null` para staff. */
  grupo: string | null;
  moduloEnCurso: string | null;
  horas: number | null;
  /** Línea corta de contexto: «Grupo B · Nov 2026» o «Staff · Constancias». */
  contexto: string;
};

export type AdjuntoConsultaDoc = {
  id: string;
  tipo: 'loop' | 'imagen' | 'video' | 'archivo';
  nombre: string;
  meta: string;
  url?: string;
};

export type MensajeConsultaDoc = {
  id: string;
  de: 'contraparte' | 'docente';
  texto: string;
  hora: string;
  dia?: string;
  adjunto?: AdjuntoConsultaDoc;
  /** Solo mensajes del docente: leído por la contraparte (deriva de `alumno_leido_en`). */
  leido?: boolean;
};

/** Material que Eco propone enlazar (lección / caso de biblioteca). */
export type RecursoEnlazable = { clave: string; titulo: string; meta: string; href?: string };

/**
 * Sugerencia de Eco para el hilo. `resumen`, `metaHilo`, `patron` y `recursos` se
 * DERIVAN de datos reales (tools-first · §7A). `borrador`/`cita` son PLACEHOLDER: la
 * redacción por LLM espera el endpoint conversacional de `apps/api` (§7A/§13).
 */
export type SugerenciaEcoConsulta = {
  disponible: boolean;
  resumen: string;
  metaHilo: string;
  patron: { cuantos: number; inis: string[]; texto: string } | null;
  recursos: RecursoEnlazable[];
  /** Borrador redactado por Eco — PENDIENTE de endpoint (§7A). `null` mientras no exista. */
  borrador: string | null;
  cita: string | null;
  ajustes: string[];
};

/** Fila de la bandeja (columna 1). Ligera: sin mensajes ni Eco. */
export type ConsultaResumen = {
  id: string;
  contraparte: ContraparteConsulta;
  estado: EstadoConsultaDoc;
  /** Tiempo que lleva esperando respuesta (solo `sin-responder`), p.ej. «2 h». */
  esperando?: string;
  hora: string;
  ultimoMensaje: string;
};

/** El hilo abierto (columnas 2 y 3): resumen + mensajes + Eco. */
export type ConsultaDetalleDoc = ConsultaResumen & {
  origen: { etiqueta: string; href: string } | null;
  mensajes: MensajeConsultaDoc[];
  eco: SugerenciaEcoConsulta;
};

export type ConsultasDocenteData = {
  docente: { nombre: string };
  grupos: string[];
  conversaciones: ConsultaResumen[];
  sinResponder: number;
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

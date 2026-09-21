/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Lección / Lectura inmersiva (§ Sprint 8, §5A). Qué es REAL (web→Supabase RLS) y
 * qué es PENDIENTE (media firmada / H5P / paquetes / xAPI · dominio).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL:
 *   • Contenido de la lección: lxp.contenidos ordenados (texto/video/h5p/scorm/xapi/
 *     quiz) — policy contenidos_read (0010, using true). El texto rico se renderiza
 *     con ContenidoRico (visor del EditorRico); hereda el modo lectura del contenedor.
 *   • Navegación lección anterior/siguiente dentro del programa (orden módulo/lección).
 *   • Progreso del alumno: lxp.reproduccion_progreso (0017) — marcar completado es un
 *     CRUD del alumno bajo RLS (alumno = auth.uid() + acceso_activo).
 *
 * PENDIENTE DE API (fuera de apps/web — los bloques se degradan con dignidad · §2):
 *   • Media firmada (video/audio): GET /media/url?ref= → los bloques Video/Audio
 *     reciben `src=null` y muestran "media pendiente".
 *   • H5P: servidor self-host (@lumieducation/h5p-server en api) — el bloque muestra
 *     su marco sin `servidorBase`.
 *   • Paquetes SCORM/xAPI: ingesta + player en api — el bloque muestra "reproducción
 *     pendiente" hasta tener `lanzadorUrl`.
 *   • xAPI `experimentó`/`completó` al LRS: se emite por la cola `envio-xapi` (§7/§8).
 *     Al marcar completada la lección aquí solo se persiste el progreso local (CRUD);
 *     la emisión xAPI la hace el dominio (contrato: encolar statement por contenido).
 */

/** Tipo de bloque de contenido (enum lxp.contenido_tipo · 0002). */
export type ContenidoTipo = 'video' | 'h5p' | 'scorm' | 'xapi' | 'texto' | 'quiz';

/** Un bloque de contenido de la lección, listo para render. */
export type BloqueContenido = {
  id: string;
  tipo: ContenidoTipo;
  titulo: string;
  /** Cuerpo (HTML del EditorRico para `texto`; null en los demás). */
  cuerpo: string | null;
  /** Referencia al recurso en object storage / paquete (null si no aplica). */
  recursoRef: string | null;
  /** El alumno ya completó este bloque (reproduccion_progreso). */
  completado: boolean;
};

/** Tipo de la lección en el modelo NUEVO (enum lxp.leccion_tipo · mig 0023). */
export type TipoLeccionAlumno =
  | 'teoria'
  | 'video'
  | 'autoevaluacion'
  | 'tarea'
  | 'foro'
  | 'h5p'
  | 'xapi';

/** Tipo de reactivo (== enum lxp.reactivo_tipo · autoeval-contrato del diseñador). */
export type TipoReactivoAlumno =
  | 'opcion_multiple'
  | 'multi'
  | 'verdadero_falso'
  | 'abierta';

/**
 * Un reactivo tal como lo VE el alumno: SIN la clave correcta ni la retroalimentación.
 * La verdad (correcta/retro) nunca se envía al cliente antes de responder — la
 * autocalificación es server-authoritative (§7A · api /autoevaluacion/calificar).
 */
export type ReactivoAlumno = {
  id: string;
  tipo: TipoReactivoAlumno;
  enunciado: string;
  imagen?: string;
  opciones: { clave: string; texto: string }[];
};

/** Autoevaluación lista para el alumno (modelo nuevo · lxp.lecciones.config · mig 0023). */
export type AutoevalAlumno = {
  descripcion?: string;
  reactivos: ReactivoAlumno[];
  /** El alumno ya envió un intento (existe entrega anclada a la lección · mig 0026). */
  yaRespondida: boolean;
};

/** Enlace a una lección vecina (anterior/siguiente) dentro del programa. */
export type LeccionVecina = { id: string; nombre: string };

/** Contexto de navegación: dónde vive la lección. */
export type LeccionContexto = {
  programaId: string;
  programa: string;
  moduloId: string;
  modulo: string;
};

/** Todo lo que la pantalla de lección necesita. */
export type LeccionCompleta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Tipo de la lección (modelo nuevo · mig 0023): decide qué motor la renderiza. */
  tipo: TipoLeccionAlumno;
  contexto: LeccionContexto;
  bloques: BloqueContenido[];
  /** Presente solo cuando `tipo === 'autoevaluacion'` (se lee de lecciones.config). */
  autoeval: AutoevalAlumno | null;
  anterior: LeccionVecina | null;
  siguiente: LeccionVecina | null;
  /** Todos los bloques con progreso están completos (o no hay bloques). */
  completada: boolean;
};

/** Rótulos legibles de cada tipo de bloque. */
export const TIPO_LABEL: Record<ContenidoTipo, string> = {
  texto: 'Lectura',
  video: 'Video',
  h5p: 'Interactivo',
  scorm: 'Paquete SCORM',
  xapi: 'Paquete xAPI',
  quiz: 'Autoevaluación',
};

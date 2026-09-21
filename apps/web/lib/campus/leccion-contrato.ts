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

import type { TipoLeccion } from '@/lib/studio/leccion-tipos';
import type { TipoBloqueTeoria } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/tipos-bloque';

/**
 * Un bloque de teoría tal como lo VE el alumno (modelo NUEVO · `lxp.bloques` · mig
 * 0023): sub-tipo + su `config` crudo (jsonb). El render (`BloqueTeoriaLector`) lee de
 * `config` lo que cada sub-tipo necesita, de forma defensiva. Fuente de verdad de los
 * sub-tipos: `teoria/tipos-bloque.ts` (módulo puro).
 */
export type BloqueTeoriaVista = {
  id: string;
  tipoBloque: TipoBloqueTeoria;
  config: Record<string, unknown>;
};

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

/**
 * Config de una lección de tipo interactivo (modelo NUEVO · mig 0023, §5C). La FORMA
 * la define el editor de cada tipo; aquí se leen los punteros que el render del alumno
 * necesita:
 *   · h5p  → { contentId }                         (H5P server self-host · §7)
 *   · xapi → { contenidoId, tipo, titulo, entryPoint? } | { paqueteRef, tipo, titulo }
 */
export type ConfigLeccion = {
  contentId?: string;
  contenidoId?: string;
  paqueteRef?: string;
  tipo?: string;
  titulo?: string;
  entryPoint?: string | null;
};

/** Todo lo que la pantalla de lección necesita. */
export type LeccionCompleta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Tipo de la lección (modelo NUEVO · mig 0023). Enruta el render del alumno. */
  tipo: TipoLeccion;
  /** Config del tipo interactivo (h5p/xapi · mig 0023). `{}` para tipos de bloques. */
  config: ConfigLeccion;
  /**
   * Ancla de progreso para las lecciones interactivas (h5p/xapi): id de la fila
   * `lxp.contenidos` compat que la ingesta crea (uuid · FK de reproduccion_progreso).
   * El player nuevo reporta al LRS contra este id (POST /players/progreso). `null` si
   * la lección aún no tiene contenido ingerido.
   */
  contenidoId: string | null;
  contexto: LeccionContexto;
  /** Bloques del modelo VIEJO (lxp.contenidos) — para tipos aún no migrados al nuevo. */
  bloques: BloqueContenido[];
  /**
   * Bloques de TEORÍA del modelo NUEVO (lxp.bloques · mig 0023), ordenados. Presente
   * solo cuando `tipo === 'teoria'`; es lo que el lector renderiza para esas lecciones.
   */
  bloquesTeoria: BloqueTeoriaVista[];
  /** Presente solo cuando `tipo === 'autoevaluacion'` (se lee de lecciones.config). */
  autoeval: AutoevalAlumno | null;
  anterior: LeccionVecina | null;
  siguiente: LeccionVecina | null;
  /** Todos los bloques con progreso están completos (o no hay bloques). */
  completada: boolean;
};

/** Las lecciones cuyo contenido se reproduce (H5P / paquete xAPI · §5C · §7). */
export function esLeccionInteractiva(tipo: TipoLeccion): tipo is 'h5p' | 'xapi' {
  return tipo === 'h5p' || tipo === 'xapi';
}

/** Rótulos legibles de cada tipo de bloque. */
export const TIPO_LABEL: Record<ContenidoTipo, string> = {
  texto: 'Lectura',
  video: 'Video',
  h5p: 'Interactivo',
  scorm: 'Paquete SCORM',
  xapi: 'Paquete xAPI',
  quiz: 'Autoevaluación',
};

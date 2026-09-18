/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Ateneo — comunidad abierta y transversal (§1/§6). Interconsulta de casos.
 * Qué es REAL (web→Supabase bajo RLS) y qué es PENDIENTE (dominio / esquema).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (lxp.posts_ateneo + lxp.comentarios_ateneo, policies posts_ateneo_* /
 * comentarios_ateneo_* de 0010):
 *   • Feed de posts APROBADOS + los PROPIOS del alumno (aunque estén pendientes de
 *     moderación). Tipos: caso | encuesta | anuncio_comunidad.
 *   • Comentarios de cada post, con `upvotes` (contador) y la FLAG de validación del
 *     docente (`validado_por` → nombre del docente que validó clínicamente la
 *     respuesta · §5B).
 *   • "Presentar caso / preguntar": inserta un post `pendiente` (modera el docente).
 *   • "Comentar": inserta un comentario (autor = alumno, si acceso_activo).
 *   • Se MUESTRA el contador `upvotes` de cada comentario (columna real).
 *
 * PENDIENTE DE API / DB (fuera de apps/web — NO se implementa aquí):
 *   • Reacciones a nivel de POST (Útil / Buen ojo / Sugerir diagnóstico): no hay
 *     tabla de reacciones en el esquema → se muestran los contadores como 0 y los
 *     botones informan que llegan luego. Contrato esperado: tabla
 *     lxp.reacciones_ateneo (post_id, autor_id, tipo) + endpoint/toggle.
 *   • Upvote de comentario ("Me es útil"): la policy comentarios_ateneo_update solo
 *     deja editar el comentario PROPIO (autor_id = auth.uid()), así que el alumno no
 *     puede sumar upvotes a otros; además `upvotes` no registra quién votó. Necesita
 *     una tabla de votos + policy (PENDIENTE DE DB) — el botón queda deshabilitado.
 *   • Encuestas (opciones/porcentajes/votos), seguir colegas, "en vivo", agenda,
 *     sugerencias y temas: sin respaldo en el esquema → no se fabrican datos.
 *   • Rol/insignia "Docente" de un autor arbitrario: la RLS de lxp.perfiles solo
 *     deja leer el propio + staff, así que el alumno no puede leer el `rol` de otros;
 *     por eso NO se pinta la insignia de rol (sí la validación del docente, que es
 *     real vía `validado_por`). Se resolverá con una función pública de rol (Sprint 9).
 *   • DICOM: visor Cornerstone3D real (Sprint 4.7); aquí, placeholder desde `dicom_ref`.
 *   • xAPI (`experimentó`/`subió`/`comentó`) vía cola `envio-xapi` (dominio · §7).
 */

export type PostTipo = 'caso' | 'encuesta' | 'anuncio_comunidad';

export type ComentarioAteneo = {
  id: string;
  autor: string;
  cuerpo: string;
  upvotes: number;
  /** Docente que validó clínicamente esta respuesta (nombre) · null si ninguno. */
  validadoPor: string | null;
  cuando: Date;
};

export type PostAteneo = {
  id: string;
  tipo: PostTipo;
  autor: string;
  titulo: string;
  vineta: string | null;
  cuerpo: string | null;
  dicomRef: string | null;
  /** true si el post es del propio alumno y aún está pendiente de moderación. */
  esMioPendiente: boolean;
  cuando: Date;
  comentarios: ComentarioAteneo[];
  totalComentarios: number;
};

export type AteneoData = {
  yo: { nombre: string; ini: string; casos: number; aportes: number };
  posts: PostAteneo[];
};

export const ETIQUETA_TIPO: Record<PostTipo, string> = {
  caso: 'Caso',
  encuesta: 'Encuesta',
  anuncio_comunidad: 'Anuncio',
};

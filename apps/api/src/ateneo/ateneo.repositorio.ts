/**
 * Lecturas/escrituras del dominio del Ateneo (§5B/§6 · Sprint 5). Solo lo que
 * dispara side-effects (sello de autoridad → xAPI) o requiere garantía de dominio
 * (publicar un caso validado de forma idempotente y anonimizada). El feed y los
 * comentarios simples van directo `web → Supabase` con RLS (Regla de Oro §2).
 */
import type { Sql } from '@campus/db';

export type ModeracionDecision = 'aprobado' | 'rechazado';

/** Comentario del Ateneo visto por el flujo de sello. */
export interface ComentarioAteneo {
  id: string;
  post_id: string;
  autor_id: string;
  validado_por: string | null;
}

/** Post del Ateneo visto por el flujo de moderación. */
export interface PostAteneo {
  id: string;
  tipo: string;
  estado: string;
  autor_id: string;
}

/** Caso de bitácora candidato a publicarse en el Ateneo. */
export interface CasoPublicable {
  id: string;
  id_alumno: string;
  estado_validacion: string;
  estudio_dicom_ref: string | null;
  anonimizado_en: string | null;
  organo: string | null;
  dominio_iaim: string | null;
  hallazgos: string | null;
  diagnostico_presuntivo: string | null;
}

export async function cargarComentario(
  sql: Sql,
  comentarioId: string,
): Promise<ComentarioAteneo | null> {
  const rows = await sql<ComentarioAteneo[]>`
    select id, post_id, autor_id, validado_por
    from lxp.comentarios_ateneo
    where id = ${comentarioId}`;
  return rows[0] ?? null;
}

/** Marca (o desmarca) el sello clínico del docente sobre un comentario. */
export async function fijarSelloComentario(
  sql: Sql,
  comentarioId: string,
  docenteId: string | null,
): Promise<void> {
  await sql`
    update lxp.comentarios_ateneo
    set validado_por = ${docenteId}
    where id = ${comentarioId}`;
}

export async function cargarPost(sql: Sql, postId: string): Promise<PostAteneo | null> {
  const rows = await sql<PostAteneo[]>`
    select id, tipo::text as tipo, estado::text as estado, autor_id
    from lxp.posts_ateneo
    where id = ${postId}`;
  return rows[0] ?? null;
}

/** Fija el estado de moderación del post (aprobado/rechazado). */
export async function moderarPost(
  sql: Sql,
  postId: string,
  decision: ModeracionDecision,
): Promise<void> {
  await sql`
    update lxp.posts_ateneo
    set estado = ${decision}::lxp.estado_validacion
    where id = ${postId}`;
}

export async function cargarCasoPublicable(
  sql: Sql,
  casoId: string,
): Promise<CasoPublicable | null> {
  const rows = await sql<CasoPublicable[]>`
    select id,
           id_alumno,
           estado_validacion::text as estado_validacion,
           estudio_dicom_ref,
           anonimizado_en,
           organo,
           dominio_iaim::text as dominio_iaim,
           hallazgos,
           diagnostico_presuntivo
    from lxp.bitacora_casos
    where id = ${casoId}`;
  return rows[0] ?? null;
}

/**
 * Inserta el post del caso de forma IDEMPOTENTE: el índice parcial único sobre
 * `caso_origen_id` (0015) garantiza que un caso genera a lo sumo un post. Si ya
 * existía, no crea otro y devuelve el id existente (`creado=false`). El post entra
 * ya `aprobado`: el caso fue validado clínicamente por el docente (no re-modera).
 */
export async function publicarPostDeCaso(
  sql: Sql,
  caso: CasoPublicable,
  titulo: string,
  vineta: string | null,
): Promise<{ postId: string; creado: boolean }> {
  const insertado = await sql<{ id: string }[]>`
    insert into lxp.posts_ateneo
      (autor_id, tipo, titulo, vineta, dicom_ref, estado, visibilidad, caso_origen_id)
    values (
      ${caso.id_alumno},
      'caso'::lxp.post_ateneo_tipo,
      ${titulo},
      ${vineta},
      ${caso.estudio_dicom_ref},
      'aprobado'::lxp.estado_validacion,
      'inscritos',
      ${caso.id}
    )
    on conflict (caso_origen_id) where caso_origen_id is not null
      do nothing
    returning id`;

  if (insertado.length > 0) return { postId: insertado[0].id, creado: true };

  const existente = await sql<{ id: string }[]>`
    select id from lxp.posts_ateneo where caso_origen_id = ${caso.id}`;
  return { postId: existente[0].id, creado: false };
}

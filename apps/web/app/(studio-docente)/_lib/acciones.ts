'use server';

import { revalidatePath } from 'next/cache';
import { comoStaff } from '@/lib/db.server';
import { encolarNotificacion } from '@/lib/campus/notificaciones-cliente';
import { requireDocente } from './session';
import { getCasoValidacion, getEstudiosAlumno } from './datos';
import { DOMINIO_LABEL, type CasoValidacion, type CifrasAprobacion, type DominioIaim, type EstudiosAlumnoData } from './contrato';

/** Meta de horas del programa (hito final · §6). Referencia para "lleva N / meta h". */
const HORAS_PROGRAMA = 1000;

/**
 * Server actions de la consola del DOCENTE (§5B). El CRUD simple (calificar entrega,
 * consultas, moderar, recursos) va `web → Supabase` bajo RLS (Regla de Oro §2 — NO pasa
 * por NestJS): corre con `comoStaff`, así que las policies (`lxp.es_docente_o_mas`) son el
 * segundo candado. La VALIDACIÓN de casos SÍ pasa por `apps/api` porque asentarla dispara
 * side-effects de DOMINIO (recálculo de competencia, xAPI, promoción al banco, notificación)
 * que solo pueden vivir ahí (§2/§7/§8). Eco propone; el docente decide — nada se asienta sin
 * su confirmación (§7A).
 */

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

/** Base del `api` de dominio (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/**
 * Asienta la decisión clínica del docente vía la API de DOMINIO (§2):
 * `POST /validacion/casos/:casoId/{aprobar|rechazar}`. El `api` registra validación + estado
 * atómicamente y dispara lo que NO puede vivir en el web: recálculo de `competencia_dominios`
 * (§8.4), statements xAPI (`validó`/`aprobó`/`falló` · §7), promoción al banco curado (§5B) y
 * la notificación al alumno (§8.12). El docenteId viaja en el cuerpo (en Sprint 9 saldrá del JWT).
 */
async function decidirCasoApi(
  casoId: string,
  accion: 'aprobar' | 'rechazar',
  docenteId: string,
  feedback?: string,
): Promise<ResultadoAccion> {
  try {
    const res = await fetch(`${apiBase()}/validacion/casos/${encodeURIComponent(casoId)}/${accion}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ docenteId, feedback: feedback?.trim() || undefined }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `No se pudo ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} el caso (HTTP ${res.status}).`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo contactar la API de validación (apps/api). ¿Está levantada?' };
  }
}

/**
 * Marca un caso como VISTO por el docente (§5B · validación reactiva): apaga el puntito verde de
 * "nuevo/sin analizar" al ABRIR el caso. CRUD simple `web → Supabase` bajo RLS (`bitacora_update`
 * exige `es_docente_o_mas` · §2). Idempotente (`and not visto_docente`). NO revalida: el cliente
 * actualiza optimista y el refetch periódico reconcilia; la persistencia evita que reaparezca al
 * recargar.
 */
export async function marcarCasoVisto(casoId: string): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    await comoStaff(userId, (sql) =>
      sql`update lxp.bitacora_casos set visto_docente = true where id = ${casoId} and not visto_docente`,
    );
    return { ok: true };
  } catch (e) {
    console.error('[marcarCasoVisto] fallo:', e);
    return { ok: false, error: 'No se pudo marcar el caso como visto.' };
  }
}

// ── Validación de casos ─────────────────────────────────────────────────────────
/**
 * Aprueba o rechaza un caso de la bitácora VÍA la API de dominio (§2 · `decidirCasoApi`):
 * el `api` asienta validación + estado y encola competencia/xAPI/notificación. El feedback
 * es obligatorio al rechazar (se lo explicamos al alumno).
 */
export async function validarCaso(input: {
  casoId: string;
  decision: 'aprobado' | 'rechazado';
  feedback: string;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  const feedback = input.feedback.trim();
  if (input.decision === 'rechazado' && !feedback) {
    return { ok: false, error: 'Explica al alumno por qué se rechaza el caso.' };
  }
  const r = await decidirCasoApi(
    input.casoId,
    input.decision === 'aprobado' ? 'aprobar' : 'rechazar',
    userId,
    feedback,
  );
  if (!r.ok) return r;
  revalidatePath('/docente/validacion');
  revalidatePath('/docente');
  return { ok: true };
}

/**
 * Aprueba en LOTE los casos "listos para confirmar" de la bandeja (§7A · pie de la bandeja).
 * El docente CONFIRMA el lote tras revisar el resumen — no se asienta nada sin ese paso
 * (Eco propone, el humano firma). Cada aprobación va por la API de dominio (§2) y acredita las
 * horas + recalcula competencia. Devuelve cuántas se asentaron realmente.
 */
export async function aprobarCasosLote(
  casoIds: string[],
): Promise<ResultadoAccion & { aprobados?: number }> {
  const { userId } = await requireDocente();
  const ids = [...new Set(casoIds)].filter(Boolean);
  if (!ids.length) return { ok: false, error: 'No hay casos listos que aprobar.' };
  let aprobados = 0;
  for (const casoId of ids) {
    const r = await decidirCasoApi(casoId, 'aprobar', userId);
    if (r.ok) aprobados++;
  }
  if (aprobados === 0) {
    return { ok: false, error: 'No se pudo aprobar el lote. Inténtalo de nuevo.' };
  }
  revalidatePath('/docente/validacion');
  revalidatePath('/docente');
  return { ok: true, aprobados };
}

/**
 * Aprueba UN caso y devuelve las cifras REALES para el modal de confirmación (§ spec: el
 * impacto se confirma con números, no con toast). El asiento (validación + estado + competencia
 * + xAPI + promoción + notificación) lo hace la API de dominio (§2 · `decidirCasoApi`); luego se
 * LEE (RLS, solo lectura) horas que acredita este caso, total acumulado del alumno tras la firma,
 * meta del programa, dominio afectado y casos que quedan en la cola. La competencia I-AIM se
 * recalcula en el worker (§8) — aquí solo se comunica. Eco propone; el docente firma (§7A).
 */
export async function aprobarCaso(input: {
  casoId: string;
  feedback: string;
}): Promise<ResultadoAccion & { cifras?: CifrasAprobacion }> {
  const { userId } = await requireDocente();
  const r = await decidirCasoApi(input.casoId, 'aprobar', userId, input.feedback);
  if (!r.ok) return r;
  // Cifras del modal (lectura RLS, solo lectura): el caso YA quedó 'aprobado' en el api, así que
  // el total del alumno ya lo incluye y los pendientes ya lo excluyen. Si falla la lectura, el
  // asiento clínico igual está firme → el modal cae a su fallback (cierra sin cifras).
  let cifras: CifrasAprobacion | undefined;
  try {
    cifras = await comoStaff(userId, async (sql) => {
      const [caso] = await sql<{ id_alumno: string; horas: number; dominio: DominioIaim | null }[]>`
        select id_alumno, horas_estimadas::float8 as horas, dominio_iaim as dominio
        from lxp.bitacora_casos where id = ${input.casoId} limit 1`;
      if (!caso) throw new Error('caso no encontrado');
      const [tot] = await sql<{ h: number }[]>`
        select coalesce(sum(horas_estimadas), 0)::float8 as h
        from lxp.bitacora_casos
        where id_alumno = ${caso.id_alumno} and estado_validacion = 'aprobado'`;
      const [rest] = await sql<{ n: number }[]>`
        select count(*)::int as n from lxp.bitacora_casos where estado_validacion = 'pendiente'`;
      return {
        horasAcreditadas: caso.horas,
        horasTotales: tot?.h ?? caso.horas,
        horasPrograma: HORAS_PROGRAMA,
        dominioLabel: caso.dominio ? DOMINIO_LABEL[caso.dominio] : null,
        casosRestantes: rest?.n ?? 0,
      } satisfies CifrasAprobacion;
    });
  } catch {
    cifras = undefined;
  }
  revalidatePath('/docente/validacion');
  revalidatePath('/docente');
  return { ok: true, cifras };
}

/**
 * Agrega el caso a la Biblioteca curada BAJO DEMANDA (§5B · botón "Agregar a Biblioteca"),
 * sin re-asentar la validación. Es DOMINIO (§2): `POST /validacion/casos/:casoId/biblioteca`
 * copia la verdad estructurada + estudio anonimizado al banco "por curar". Idempotente: si el
 * caso ya estaba en el acervo, lo indica (`yaExistia`). El caso ya está anonimizado en ingesta
 * (§10); la promoción es curaduría clínica del docente, sin gate de consentimiento.
 */
export async function agregarCasoABiblioteca(
  casoId: string,
): Promise<ResultadoAccion & { yaExistia?: boolean }> {
  const { userId } = await requireDocente();
  try {
    const res = await fetch(`${apiBase()}/validacion/casos/${encodeURIComponent(casoId)}/biblioteca`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ docenteId: userId }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, error: `No se pudo agregar el caso a la Biblioteca (HTTP ${res.status}).` };
    }
    const d = (await res.json()) as { casoBancoId: string; creado: boolean };
    revalidatePath('/docente/validacion');
    return { ok: true, yaExistia: !d.creado };
  } catch {
    return { ok: false, error: 'No se pudo contactar la API de validación (apps/api). ¿Está levantada?' };
  }
}

/**
 * Carga bajo demanda todos los estudios de un alumno (rejilla de Validación) con RLS
 * `comoStaff`. Lectura simple para el cliente: no muta nada. `null` si el alumno no existe
 * o el docente no puede verlo.
 */
export async function cargarEstudiosAlumno(alumnoId: string): Promise<EstudiosAlumnoData | null> {
  const { userId } = await requireDocente();
  return getEstudiosAlumno(userId, alumnoId);
}

/**
 * Carga un caso concreto para el detalle (cualquier estado). Se usa al abrir desde la
 * rejilla un estudio ya aprobado/devuelto (la cola solo trae pendientes). Solo lectura.
 */
export async function cargarCasoValidacion(casoId: string): Promise<CasoValidacion | null> {
  const { userId } = await requireDocente();
  return getCasoValidacion(userId, casoId);
}

// ── Calificación de entregas ────────────────────────────────────────────────────
/**
 * Asienta la nota y el feedback de una entrega (tarea/autoevaluación). El docente
 * CONFIRMA — la nota puede venir de una sugerencia de Eco (`ecoSugerida`), pero solo
 * se asienta con esta acción (§7A). RLS: `entregas_update` (id_alumno o docente).
 *
 * PENDIENTE DE API (§7A/§7): si la nota corrige una sugerencia de Eco, registrar el
 * delta en `eco_correcciones` (loop de mejora) y emitir xAPI `aprobó`/`falló`.
 */
export async function calificarEntrega(input: {
  entregaId: string;
  nota: number;
  feedback: string;
  ecoSugerida: boolean;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  if (Number.isNaN(input.nota) || input.nota < 0 || input.nota > 10) {
    return { ok: false, error: 'La nota debe ir de 0 a 10.' };
  }
  try {
    await comoStaff(userId, async (sql) => {
      await sql`
        update lxp.entregas
        set nota = ${input.nota}, feedback = ${input.feedback.trim() || null},
            estado = 'calificada'::lxp.entrega_estado, eco_sugerida = ${input.ecoSugerida}
        where id = ${input.entregaId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo calificar la entrega. Inténtalo de nuevo.' };
  }
  // PENDIENTE DE API: eco_correcciones (si corrigió a Eco) + xAPI (§7A/§7).
  revalidatePath('/docente/entregas');
  revalidatePath('/docente');
  return { ok: true };
}

// ── Consultas 1:1 ───────────────────────────────────────────────────────────────
/**
 * Responde una consulta del alumno. Inserta el mensaje del docente (RLS:
 * `consulta_mensajes_insert` exige autor = uid). El `updated_at` de la consulta lo
 * refresca su trigger. Eco puede REDACTAR el borrador (PENDIENTE · §7A), pero el
 * texto que se envía es el que el docente confirma.
 */
export async function responderConsulta(input: {
  consultaId: string;
  cuerpo: string;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  const cuerpo = input.cuerpo.trim();
  if (!cuerpo) return { ok: false, error: 'Escribe una respuesta antes de enviar.' };
  let alumnoId = '';
  let asunto = '';
  try {
    ({ alumnoId, asunto } = await comoStaff(userId, async (sql) => {
      // `comoStaff` YA abre la transacción (sql.begin con claims+rol para RLS); aquí se
      // opera directo sobre ese `sql`. Anidar otro `sql.begin` fallaba con
      // "tx.begin is not a function" (el objeto de transacción no expone .begin).
      await sql`
        insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo)
        values (${input.consultaId}, ${userId}, ${cuerpo})`;
      // Tomar la consulta si aún no tiene docente asignado (canal 1:1).
      const rows = await sql<{ id_alumno: string; asunto: string }[]>`
        update lxp.consultas
        set id_docente = coalesce(id_docente, ${userId})
        where id = ${input.consultaId}
        returning id_alumno, asunto`;
      return { alumnoId: rows[0]?.id_alumno ?? '', asunto: rows[0]?.asunto ?? '' };
    }));
  } catch {
    return { ok: false, error: 'No se pudo enviar la respuesta. Inténtalo de nuevo.' };
  }
  // Avisa al alumno que su consulta tiene respuesta (motor §8 job #12, best-effort).
  if (alumnoId) {
    await encolarNotificacion({
      userId: alumnoId,
      tipo: 'respuesta_consulta',
      entidadTipo: 'consulta',
      entidadId: input.consultaId,
      datos: { asunto },
    });
  }
  revalidatePath('/docente/consultas');
  revalidatePath(`/docente/consultas/${input.consultaId}`);
  return { ok: true };
}

/** Cierra (o reabre) una consulta. RLS: `consultas_update` (docente asignado o más). */
export async function cambiarEstadoConsulta(input: {
  consultaId: string;
  estado: 'abierta' | 'cerrada';
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    await comoStaff(userId, async (sql) => {
      await sql`update lxp.consultas set estado = ${input.estado} where id = ${input.consultaId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo actualizar la consulta.' };
  }
  revalidatePath('/docente/consultas');
  revalidatePath(`/docente/consultas/${input.consultaId}`);
  return { ok: true };
}

/**
 * El docente INICIA una consulta (reusa el modal, sin paso de tema). El docente es la parte
 * "contacto" (contacto_id/id_docente) y el destinatario es id_alumno — así el otro lado la ve
 * por id_alumno y el docente por su bandeja (contacto_id/id_docente). Reutiliza si ya existe.
 * El primer mensaje lo escribe el docente en el composer (como en el flujo del alumno).
 */
export async function iniciarConsultaDocente(
  contactoId: string,
): Promise<ResultadoAccion & { consultaId?: string }> {
  const { userId } = await requireDocente();
  try {
    const consultaId = await comoStaff(userId, async (sql) => {
      // El contacto debe estar en el set permitido (alumno de sus grupos / staff / colega).
      const permitido = (await sql<{ user_id: string }[]>`
        select user_id from lxp.contactos_consulta_docente(${userId}) where user_id = ${contactoId} limit 1`)[0];
      if (!permitido) throw new Error('no-permitido');
      // ¿Ya existe un hilo docente↔contacto? (el docente es contacto_id/id_docente).
      const ex = (await sql<{ id: string }[]>`
        select id from lxp.consultas
        where id_alumno = ${contactoId} and (contacto_id = ${userId} or id_docente = ${userId})
        order by created_at desc limit 1`)[0];
      if (ex) return ex.id;
      const nombre = (await sql<{ n: string | null }[]>`select lxp.nombre_de(${contactoId}) as n`)[0]?.n ?? 'contacto';
      const fila = (await sql<{ id: string }[]>`
        insert into lxp.consultas (id_alumno, contacto_id, tipo_contacto, id_docente, asunto, estado)
        values (${contactoId}, ${userId}, 'docente'::lxp.consulta_tipo_contacto, ${userId}, ${`Consulta con ${nombre}`}, 'abierta')
        returning id`)[0]!;
      return fila.id;
    });
    revalidatePath('/docente/consultas');
    return { ok: true, consultaId };
  } catch {
    return { ok: false, error: 'No se pudo iniciar la conversación. Inténtalo de nuevo.' };
  }
}

// ── Moderación del Ateneo (verdad clínica = docente · §5B) ───────────────────────
/** Aprueba o rechaza un post del Ateneo (moderación clínica). RLS: `posts_ateneo_update`. */
export async function moderarPost(input: {
  postId: string;
  estado: 'aprobado' | 'rechazado';
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    await comoStaff(userId, async (sql) => {
      await sql`
        update lxp.posts_ateneo
        set estado = ${input.estado}::lxp.estado_validacion
        where id = ${input.postId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo moderar el post.' };
  }
  revalidatePath('/docente');
  return { ok: true };
}

// ── Mis recursos (almacén personal) ─────────────────────────────────────────────
/** Registra un recurso personal del docente. RLS: `recursos_docente_write` (id = uid). */
export async function agregarRecurso(input: {
  titulo: string;
  tipo: string;
  ref: string;
}): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  const titulo = input.titulo.trim();
  if (!titulo) return { ok: false, error: 'Ponle un título al recurso.' };
  try {
    await comoStaff(userId, async (sql) => {
      await sql`
        insert into lxp.recursos_docente (id_docente, titulo, tipo, recurso_ref)
        values (${userId}, ${titulo}, ${input.tipo.trim() || null}, ${input.ref.trim() || null})`;
    });
  } catch {
    return { ok: false, error: 'No se pudo guardar el recurso. Inténtalo de nuevo.' };
  }
  revalidatePath('/docente/recursos');
  return { ok: true };
}

/** Elimina un recurso personal. RLS: `recursos_docente_write` (id = uid). */
export async function eliminarRecurso(recursoId: string): Promise<ResultadoAccion> {
  const { userId } = await requireDocente();
  try {
    await comoStaff(userId, async (sql) => {
      await sql`delete from lxp.recursos_docente where id = ${recursoId} and id_docente = ${userId}`;
    });
  } catch {
    return { ok: false, error: 'No se pudo eliminar el recurso.' };
  }
  revalidatePath('/docente/recursos');
  return { ok: true };
}

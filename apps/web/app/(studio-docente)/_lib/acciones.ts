'use server';

import { revalidatePath } from 'next/cache';
import { comoStaff } from '@/lib/db.server';
import { encolarNotificacion } from '@/lib/campus/notificaciones-cliente';
import { requireDocente } from './session';

/**
 * Server actions de la consola del DOCENTE (§5B). CRUD simple `web → Supabase` bajo
 * RLS (Regla de Oro §2 — NO pasan por NestJS): cada acción corre con `comoStaff`, así
 * que las policies (`lxp.es_docente_o_mas`) son el segundo candado. Eco propone; el
 * docente decide — nada se asienta sin su confirmación (§7A). Aquí se ASIENTA su
 * decisión (validar/calificar/responder); el cálculo de dominio es aparte (PENDIENTE).
 */

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

// ── Validación de casos ─────────────────────────────────────────────────────────
/**
 * Aprueba o rechaza un caso de la bitácora. Escribe la decisión clínica en
 * `validaciones` y refleja el estado en `bitacora_casos` — ambas cosas bajo RLS
 * (`validaciones_write` / `bitacora_update` exigen `es_docente_o_mas`).
 *
 * PENDIENTE DE API (dominio · §2/§8): al APROBAR hay que encolar en BullMQ:
 *   • `calculo-competencia` → recalcula `competencia_dominios` del alumno (§8.4).
 *   • `envio-xapi` → statement `validó` al LRS (§7).
 *   • `notificaciones` → avisar al alumno (§8.12).
 * Contrato exacto (apps/api): POST /validaciones/{casoId}/aprobar → encola los tres.
 * El worker es quien toca la proyección de competencia (read-only desde web · §6).
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
  try {
    await comoStaff(userId, async (sql) => {
      await sql.begin(async (tx) => {
        await tx`
          insert into lxp.validaciones (caso_id, id_docente, decision, feedback)
          values (
            ${input.casoId}, ${userId},
            ${input.decision}::lxp.decision_validacion,
            ${feedback || null}
          )`;
        await tx`
          update lxp.bitacora_casos
          set estado_validacion = ${input.decision}::lxp.estado_validacion
          where id = ${input.casoId}`;
      });
    });
  } catch {
    return { ok: false, error: 'No se pudo registrar la validación. Inténtalo de nuevo.' };
  }
  // PENDIENTE DE API: encolar calculo-competencia + xAPI `validó` + notificación (§8/§7).
  revalidatePath('/docente/validacion');
  revalidatePath('/docente');
  return { ok: true };
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
      return sql.begin(async (tx) => {
        await tx`
          insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo)
          values (${input.consultaId}, ${userId}, ${cuerpo})`;
        // Tomar la consulta si aún no tiene docente asignado (canal 1:1).
        const rows = await tx<{ id_alumno: string; asunto: string }[]>`
          update lxp.consultas
          set id_docente = coalesce(id_docente, ${userId})
          where id = ${input.consultaId}
          returning id_alumno, asunto`;
        return { alumnoId: rows[0]?.id_alumno ?? '', asunto: rows[0]?.asunto ?? '' };
      }) as Promise<{ alumnoId: string; asunto: string }>;
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

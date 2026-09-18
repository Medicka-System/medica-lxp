'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';
import type { PostTipo } from './ateneo-contrato';

/**
 * Server actions del Ateneo. CRUD simple `web → Supabase` bajo RLS (Regla de Oro §2):
 * corren con `comoAlumno`, así que las policies posts_ateneo_insert /
 * comentarios_ateneo_insert (autor_id = auth.uid() + acceso_activo) son el segundo
 * candado. Reacciones/encuestas/seguir son PENDIENTE DE DB (ver ateneo-contrato).
 */

/** Presenta un caso o pregunta al Ateneo. Nace `pendiente` (lo modera el docente). */
export async function crearPostAteneo(datos: {
  tipo: Extract<PostTipo, 'caso'>;
  titulo: string;
  cuerpo: string;
}): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const titulo = datos.titulo.trim();
  if (!titulo) return { ok: false, error: 'Escribe de qué trata tu caso o pregunta.' };

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, estado, visibilidad)
        values (
          ${alumno.userId}, ${datos.tipo}::lxp.post_ateneo_tipo, ${titulo},
          ${datos.cuerpo.trim() || null},
          'pendiente'::lxp.estado_validacion, 'inscritos'
        )`;
    });
  } catch {
    return { ok: false, error: 'No se pudo publicar. Inténtalo de nuevo.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Comenta (interconsulta) en un post del Ateneo. */
export async function comentarAteneo(postId: string, cuerpo: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const texto = cuerpo.trim();
  if (!texto) return { ok: false, error: 'Escribe un comentario.' };

  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`
        insert into lxp.comentarios_ateneo (post_id, autor_id, cuerpo)
        values (${postId}, ${alumno.userId}, ${texto})`;
    });
  } catch {
    return { ok: false, error: 'No se pudo comentar. Inténtalo de nuevo.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

// NOTA: "Me es útil" (upvote de comentario ajeno) NO se implementa: la policy
// comentarios_ateneo_update solo permite editar el comentario PROPIO
// (autor_id = auth.uid()), así que un alumno no puede sumar upvotes a otros. El voto
// por usuario necesita una tabla de votos + policy → PENDIENTE DE DB (ver contrato).

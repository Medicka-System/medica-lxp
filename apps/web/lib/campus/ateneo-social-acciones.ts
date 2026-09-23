'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { ResultadoAccion } from './resultado';
import type { BorradorPost } from '@/app/(campus)/ateneo/_components/Composer';
import type { Comentario, PerfilResumen, TipoReaccion } from '@/app/(campus)/ateneo/_components/tipos';

/**
 * ATENEO — server actions (§1/§2). CRUD del alumno bajo RLS (`comoAlumno`): las policies
 * de 0010/0015/0032 son el segundo candado. Los posts se auto-aprueban (red social); la
 * validación docente vive en el CASO de origen (bitácora), no en el post. Reacción y
 * voto son idempotentes (una fila por usuario, cambiable).
 */

const TIPOS_REACCION = new Set<TipoReaccion>(['util', 'ojo', 'aclara', 'bien', 'duda', 'gracias']);
const REL = 86_400_000;

function tituloDesde(texto: string, fallback = 'Publicación'): string {
  const t = texto.trim().replace(/\s+/g, ' ');
  if (!t) return fallback;
  return t.length <= 70 ? t : `${t.slice(0, 70)}…`;
}

/** Publica un post del Ateneo (5 modos · unión discriminada del composer). */
export async function publicarPostAteneo(b: BorradorPost): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  // Audiencia → visibilidad del post: toda la comunidad ('inscritos') o solo mis colegas.
  const vis = b.audiencia === 'colegas' ? 'colegas' : 'inscritos';
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      if (b.modo === 'texto') {
        const t = b.texto.trim();
        if (!t) throw new Error('vacio');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, estado, visibilidad)
          values (${alumno.userId}, 'texto', ${tituloDesde(t)}, ${t}, 'aprobado', ${vis})`;
      } else if (b.modo === 'caso') {
        // El caso debe ser del alumno y estar anonimizado (RLS de bitácora ya lo aísla).
        const caso = (await sql<{ id: string }[]>`
          select id from lxp.bitacora_casos
          where id = ${b.casoId} and id_alumno = ${alumno.userId} and anonimizado_en is not null`)[0];
        if (!caso) throw new Error('caso');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, dicom_ref, caso_origen_id, estado, visibilidad)
          values (${alumno.userId}, 'caso', ${tituloDesde(b.texto, 'Caso presentado')}, ${b.texto.trim()},
                  null, ${b.casoId}, 'aprobado', ${vis})
          on conflict (caso_origen_id) where caso_origen_id is not null do nothing`;
      } else if (b.modo === 'pregunta') {
        const q = b.pregunta.trim();
        if (!q) throw new Error('vacio');
        const temas = b.temas.map((t) => t.trim()).filter(Boolean).slice(0, 8);
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, temas, estado, visibilidad)
          values (${alumno.userId}, 'pregunta', ${q}, ${b.contexto.trim() || null}, ${sql.json(temas)}, 'aprobado', ${vis})`;
      } else if (b.modo === 'media') {
        // Subida real de archivos: PENDIENTE (§ declarado). Se publica el texto sin media.
        const t = b.texto.trim();
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, estado, visibilidad)
          values (${alumno.userId}, 'media', ${tituloDesde(t, 'Imágenes')}, ${t}, 'aprobado', ${vis})`;
      } else if (b.modo === 'encuesta') {
        const q = b.pregunta.trim();
        const opciones = b.opciones.map((o) => o.trim()).filter(Boolean).slice(0, 4);
        if (!q || opciones.length < 2) throw new Error('encuesta');
        const cierre = new Date(Date.now() + Math.max(1, b.cierraEnDias) * REL);
        const post = (await sql<{ id: string }[]>`
          insert into lxp.posts_ateneo (autor_id, tipo, titulo, cierra_en, estado, visibilidad)
          values (${alumno.userId}, 'encuesta', ${q}, ${cierre}, 'aprobado', ${vis})
          returning id`)[0]!;
        for (let i = 0; i < opciones.length; i++) {
          await sql`insert into lxp.encuesta_opciones (post_id, orden, texto) values (${post.id}, ${i}, ${opciones[i]})`;
        }
      }
    });
  } catch {
    return { ok: false, error: 'No se pudo publicar. Revisa los campos e inténtalo de nuevo.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Reacciona a un post (6 tipos, una por usuario, cambiable). `null` la quita. */
export async function reaccionarAteneo(postId: string, tipo: TipoReaccion | null): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  if (tipo !== null && !TIPOS_REACCION.has(tipo)) return { ok: false, error: 'Reacción no válida.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      if (tipo === null) {
        await sql`delete from lxp.reacciones_ateneo where post_id = ${postId} and usuario_id = ${alumno.userId}`;
      } else {
        await sql`insert into lxp.reacciones_ateneo (post_id, usuario_id, tipo)
          values (${postId}, ${alumno.userId}, ${tipo}::lxp.reaccion_ateneo_tipo)
          on conflict (post_id, usuario_id) do update set tipo = excluded.tipo`;
      }
    });
  } catch {
    return { ok: false, error: 'No se pudo registrar tu reacción.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Comenta un post (con `parentId` opcional → hilo de 2 niveles). */
export async function comentarAteneoSocial(postId: string, texto: string, parentId?: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  const t = texto.trim();
  if (!t) return { ok: false, error: 'Escribe tu comentario.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`insert into lxp.comentarios_ateneo (post_id, autor_id, cuerpo, parent_id)
        values (${postId}, ${alumno.userId}, ${t}, ${parentId ?? null})`;
    });
  } catch {
    return { ok: false, error: 'No se pudo publicar tu comentario.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Vota una opción de la encuesta (uno por usuario, cambiable). */
export async function votarEncuesta(postId: string, opcionId: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`insert into lxp.encuesta_votos (post_id, usuario_id, opcion_id)
        values (${postId}, ${alumno.userId}, ${opcionId})
        on conflict (post_id, usuario_id) do update set opcion_id = excluded.opcion_id`;
    });
  } catch {
    return { ok: false, error: 'No se pudo registrar tu voto.' };
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Comparte un post (contador). Best-effort: persiste para el autor; siempre no bloquea. */
export async function compartirAteneo(postId: string): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      await sql`update lxp.posts_ateneo set compartidos = compartidos + 1 where id = ${postId}`;
    });
  } catch {
    /* RLS: solo el autor puede incrementar su contador · el resto es no-op (§ stub) */
  }
  revalidatePath('/ateneo');
  return { ok: true };
}

/** Conecta con un colega: solicita (ninguna→pendiente) o acepta (pendiente recibida→colegas). */
export async function conectarColega(otroId: string): Promise<ResultadoAccion & { estado?: 'pendiente' | 'colegas' }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  if (otroId === alumno.userId) return { ok: false, error: 'No puedes conectarte contigo.' };
  let estado: 'pendiente' | 'colegas' = 'pendiente';
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      const ex = (await sql<{ solicitante_id: string; receptor_id: string; estado: string }[]>`
        select solicitante_id, receptor_id, estado::text as estado from lxp.conexiones_ateneo
        where (solicitante_id = ${alumno.userId} and receptor_id = ${otroId})
           or (solicitante_id = ${otroId} and receptor_id = ${alumno.userId})
        limit 1`)[0];
      if (!ex) {
        await sql`insert into lxp.conexiones_ateneo (solicitante_id, receptor_id, estado)
          values (${alumno.userId}, ${otroId}, 'pendiente')`;
        estado = 'pendiente';
      } else if (ex.estado === 'pendiente' && ex.receptor_id === alumno.userId) {
        await sql`update lxp.conexiones_ateneo set estado = 'colegas'
          where solicitante_id = ${otroId} and receptor_id = ${alumno.userId}`;
        estado = 'colegas';
      } else {
        estado = ex.estado === 'colegas' ? 'colegas' : 'pendiente';
      }
    });
  } catch {
    return { ok: false, error: 'No se pudo enviar la solicitud.' };
  }
  revalidatePath('/ateneo');
  return { ok: true, estado };
}

/** Busca colegas por nombre, especialidad o sede. */
export async function buscarColegas(q: string): Promise<(PerfilResumen & { motivo: string })[]> {
  const alumno = await getSesionAlumno();
  const term = `%${q.trim()}%`;
  return comoAlumno(alumno.userId, async (sql) => {
    const filas = await sql<{ user_id: string; nombre: string; rol: string; esp: string | null; sede: string | null; estado: string | null; casos: number }[]>`
      select pf.user_id, pf.nombre, pf.rol::text as rol, pf.especialidad as esp, pf.sede,
             (select estado::text from lxp.conexiones_ateneo cx
                where (cx.solicitante_id = ${alumno.userId} and cx.receptor_id = pf.user_id)
                   or (cx.receptor_id = ${alumno.userId} and cx.solicitante_id = pf.user_id) limit 1) as estado,
             (select count(*)::int from lxp.bitacora_casos b where b.id_alumno = pf.user_id) as casos
      from lxp.perfiles pf
      where pf.user_id <> ${alumno.userId} and pf.rol in ('alumno','docente')
        and (${q.trim() === ''} or pf.nombre ilike ${term} or coalesce(pf.especialidad,'') ilike ${term} or coalesce(pf.sede,'') ilike ${term})
      order by pf.nombre limit 12`;
    return filas.map((s) => ({
      id: s.user_id,
      ini: inic(s.nombre),
      nombre: s.nombre,
      rol: (s.rol === 'alumno' ? 'alumno' : 'docente') as 'alumno' | 'docente',
      meta: [s.esp, s.sede].filter(Boolean).join(' · ') || 'Campus Médica',
      colegas: 0,
      casos: s.casos,
      aportes: 0,
      motivo: s.rol === 'docente' ? 'docente del campus' : 'del diplomado',
      estadoConexion: s.estado === 'colegas' ? 'colegas' : s.estado === 'pendiente' ? 'pendiente' : 'ninguna',
    }));
  });
}

/** Hilo completo de un post (plano, con parentId) para el DetallePost. */
export async function getHiloAteneo(postId: string): Promise<Comentario[]> {
  const alumno = await getSesionAlumno();
  return comoAlumno(alumno.userId, async (sql) => {
    const filas = await sql<{ id: string; parent_id: string | null; autor_id: string; autor: string | null; rol: string | null; cuerpo: string; created_at: Date }[]>`
      select c.id, c.parent_id, c.autor_id, lxp.nombre_de(c.autor_id) as autor,
             (select rol::text from lxp.perfiles pf where pf.user_id = c.autor_id) as rol,
             c.cuerpo, c.created_at
      from lxp.comentarios_ateneo c where c.post_id = ${postId}
      order by c.created_at asc`;
    return filas.map((c) => ({
      id: c.id,
      parentId: c.parent_id ?? undefined,
      autor: {
        id: c.autor_id,
        ini: inic(c.autor ?? 'Colega'),
        nombre: c.autor ?? 'Colega',
        rol: (c.rol && c.rol !== 'alumno' ? 'docente' : 'alumno') as 'alumno' | 'docente',
        meta: '',
      },
      texto: c.cuerpo,
      cuando: rel(c.created_at),
    }));
  });
}

function inic(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter((x) => !/^(dr|dra)\.?$/i.test(x));
  const base = p.length ? p : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((x) => x[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}
function rel(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 90) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
}

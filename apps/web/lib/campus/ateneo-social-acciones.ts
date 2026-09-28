'use server';

import { revalidatePath } from 'next/cache';
import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import { cargarFeedAteneo, type CursorFeed, type FeedAteneo, type LoteFeed } from './ateneo-social';
import type { ResultadoAccion } from './resultado';
import type { BorradorPost } from '@/app/(campus)/ateneo/_components/Composer';
import type { CasoBitacora, Comentario, EnlacePreview, GifItem, ItemAporte, ListaPerfilData, PerfilColegaData, Persona, PerfilResumen, TipoReaccion } from '@/app/(campus)/ateneo/_components/tipos';

/**
 * ATENEO — server actions (§1/§2). CRUD del alumno bajo RLS (`comoAlumno`): las policies
 * de 0010/0015/0032 son el segundo candado. Los posts se auto-aprueban (red social); la
 * validación docente vive en el CASO de origen (bitácora), no en el post. Reacción y
 * voto son idempotentes (una fila por usuario, cambiable).
 */

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/**
 * Firma la subida DIRECTA de un medio del Ateneo (imagen/video) a object storage,
 * REUSANDO el uploader público de media de contenido (`/media/imagenes/firmar-subida`):
 * mismo patrón que reportes/media (signed URL contra STORAGE_ENDPOINT_PUBLICO, SigV4 al
 * host público · §2 web→storage directo, sin proxy). El Ateneo NO tiene anonimizador: son
 * imagen/video, no DICOM/paciente (§10). El navegador hace el PUT del binario a `urlSubida`.
 */
export async function firmarSubidaMediaAteneo(
  ext: string,
): Promise<{ ok: true; ref: string; urlSubida: string } | { ok: false; error: string }> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  try {
    const res = await fetch(`${apiBase()}/media/imagenes/firmar-subida`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ext }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `El servicio de media rechazó la solicitud (HTTP ${res.status}).` };
    const d = (await res.json()) as { ref: string; urlSubida: string };
    return { ok: true, ref: d.ref, urlSubida: d.urlSubida };
  } catch (e) {
    console.error('[firmarSubidaMediaAteneo] fallo:', e);
    return { ok: false, error: 'No se pudo contactar el servicio de media (apps/api).' };
  }
}

/** GIFs de Giphy vía el proxy del `api` (la key vive en el api, nunca en el cliente · §3). */
async function pedirGifs(path: string): Promise<GifItem[]> {
  try {
    const res = await fetch(`${apiBase()}${path}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const d = (await res.json()) as { gifs?: GifItem[] };
    return d.gifs ?? [];
  } catch (e) {
    console.error('[gifs] fallo:', e);
    return [];
  }
}

/** GIFs en tendencia (al abrir el picker). */
export async function gifsTrending(): Promise<GifItem[]> {
  return pedirGifs('/media/gifs/trending');
}

/** Busca GIFs por término (q vacío → tendencias, resuelto en el api). */
export async function gifsBuscar(q: string): Promise<GifItem[]> {
  return pedirGifs(`/media/gifs/buscar?q=${encodeURIComponent(q.trim())}`);
}

/**
 * Previsualización de un ENLACE pegado en el composer. El fetch OG va SERVER-SIDE con guard
 * SSRF en el `api` (`/enlaces/unfurl`) — el cliente nunca sale a la red del stack. Falla suave:
 * null → el composer no muestra tarjeta (nunca rompe la publicación).
 */
export async function unfurlEnlace(url: string): Promise<EnlacePreview | null> {
  const u = (url ?? '').trim();
  if (!/^https?:\/\//i.test(u)) return null;
  try {
    const res = await fetch(`${apiBase()}/enlaces/unfurl?url=${encodeURIComponent(u)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const d = (await res.json()) as { enlace?: EnlacePreview | null };
    return d.enlace ?? null;
  } catch (e) {
    console.error('[unfurlEnlace] fallo:', e);
    return null;
  }
}

const TIPOS_REACCION = new Set<TipoReaccion>(['util', 'ojo', 'aclara', 'bien', 'duda', 'gracias']);
const REL = 86_400_000;

function tituloDesde(texto: string, fallback = 'Publicación'): string {
  const t = texto.trim().replace(/\s+/g, ' ');
  if (!t) return fallback;
  return t.length <= 70 ? t : `${t.slice(0, 70)}…`;
}

/**
 * Sanea el snapshot de enlace ANTES de persistir (defensa en profundidad; el `api` ya validó):
 * url http(s), imagen SOLO https (se renderiza con <img>), campos acotados. null → sin tarjeta.
 */
function sanearEnlace(e: EnlacePreview | null | undefined): EnlacePreview | null {
  if (!e || typeof e.url !== 'string' || !/^https?:\/\//i.test(e.url)) return null;
  const txt = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
  return {
    url: e.url.slice(0, 2048),
    titulo: txt(e.titulo, 200),
    descripcion: txt(e.descripcion, 300),
    imagen: typeof e.imagen === 'string' && /^https:\/\//i.test(e.imagen) ? e.imagen.slice(0, 2048) : null,
    sitio: txt(e.sitio, 100),
  };
}

/** Publica un post del Ateneo (5 modos · unión discriminada del composer). */
export async function publicarPostAteneo(b: BorradorPost): Promise<ResultadoAccion> {
  const alumno = await getSesionAlumno();
  if (!alumno.accesoActivo) return { ok: false, error: 'Tu acceso está en pausa.' };
  // Audiencia → visibilidad del post: toda la comunidad ('inscritos') o solo mis colegas.
  const vis = b.audiencia === 'colegas' ? 'colegas' : 'inscritos';
  // Snapshot de enlace (OG) — se congela con el post; NO se re-fetchea en lectura.
  const enlace = sanearEnlace(b.enlace);
  try {
    await comoAlumno(alumno.userId, async (sql) => {
      const enlaceJson = enlace ? sql.json(enlace) : null;
      if (b.modo === 'texto') {
        const t = b.texto.trim();
        if (!t) throw new Error('vacio');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, enlace, estado, visibilidad)
          values (${alumno.userId}, 'texto', ${tituloDesde(t)}, ${t}, ${enlaceJson}, 'aprobado', ${vis})`;
      } else if (b.modo === 'caso') {
        // El caso debe ser del alumno y estar anonimizado (RLS de bitácora ya lo aísla).
        const caso = (await sql<{ id: string }[]>`
          select id from lxp.bitacora_casos
          where id = ${b.casoId} and id_alumno = ${alumno.userId} and anonimizado_en is not null`)[0];
        if (!caso) throw new Error('caso');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, dicom_ref, caso_origen_id, enlace, estado, visibilidad)
          values (${alumno.userId}, 'caso', ${tituloDesde(b.texto, 'Caso presentado')}, ${b.texto.trim()},
                  null, ${b.casoId}, ${enlaceJson}, 'aprobado', ${vis})
          on conflict (caso_origen_id) where caso_origen_id is not null do nothing`;
      } else if (b.modo === 'pregunta') {
        const q = b.pregunta.trim();
        if (!q) throw new Error('vacio');
        const temas = b.temas.map((t) => t.trim()).filter(Boolean).slice(0, 8);
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, temas, enlace, estado, visibilidad)
          values (${alumno.userId}, 'pregunta', ${q}, ${b.contexto.trim() || null}, ${sql.json(temas)}, ${enlaceJson}, 'aprobado', ${vis})`;
      } else if (b.modo === 'media') {
        // Media YA subida por el composer (imagen/video · media/imagenes/*, público, SIN
        // anonimizador). Se persiste la ref en posts_ateneo.media con la forma {tipo,url}
        // que lee ensamblarPosts (allí `url`=ref se firma a URL de lectura). Máx 8.
        const t = b.texto.trim();
        const media = (b.media ?? [])
          .filter((m) => m && typeof m.ref === 'string' && m.ref.startsWith('media/imagenes/'))
          .slice(0, 8)
          .map((m) => ({ tipo: m.tipo === 'video' ? 'video' : 'imagen', url: m.ref }));
        if (media.length === 0 && !t) throw new Error('vacio');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, media, enlace, estado, visibilidad)
          values (${alumno.userId}, 'media', ${tituloDesde(t, 'Imágenes')}, ${t}, ${sql.json(media)}, ${enlaceJson}, 'aprobado', ${vis})`;
      } else if (b.modo === 'gif') {
        // GIF de Giphy: HOTLINK al CDN (su ToS exige hotlink, no re-hospedar) → se guarda la
        // URL externa tal cual en posts_ateneo.media {tipo:'gif',url}. Se acota a hosts giphy.com
        // (no se persiste una URL arbitraria). ensamblarPosts la sirve sin firmar (es externa).
        const t = b.texto.trim();
        const url = (b.gif?.url ?? '').trim();
        let host = '';
        try { host = new URL(url).hostname; } catch { host = ''; }
        if (!/^https:\/\//i.test(url) || !host.endsWith('giphy.com')) throw new Error('gif');
        await sql`insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, media, enlace, estado, visibilidad)
          values (${alumno.userId}, 'media', ${tituloDesde(t, 'GIF')}, ${t}, ${sql.json([{ tipo: 'gif', url }])}, ${enlaceJson}, 'aprobado', ${vis})`;
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

/** Un LOTE del feed (global/colegas/grupo) por cursor keyset — infinite scroll (§ prod). */
export async function getFeedAteneo(feed: FeedAteneo, cursor: CursorFeed | null): Promise<LoteFeed> {
  const alumno = await getSesionAlumno();
  return cargarFeedAteneo(alumno.userId, feed, cursor);
}

const DOM_LABEL: Record<string, string> = {
  indicacion: 'Indicación', adquisicion: 'Adquisición', interpretacion: 'Interpretación', decision_medica: 'Decisión médica',
};
function aCasoDeBitacora(c: { id: string; organo: string | null; dominio_iaim: string | null; hallazgos: string | null; estado: string; estudio_series: unknown; created_at: Date }): CasoBitacora {
  const series = Array.isArray(c.estudio_series) ? (c.estudio_series as { frames?: unknown[] }[]) : [];
  return {
    id: c.id,
    titulo: c.hallazgos?.slice(0, 80) || 'Estudio de la bitácora',
    area: c.organo ?? 'Ultrasonido',
    organo: c.organo ?? '—',
    dominio: c.dominio_iaim ? DOM_LABEL[c.dominio_iaim] ?? c.dominio_iaim : '—',
    piezas: series.length,
    loops: series.filter((s) => Array.isArray(s.frames) && s.frames.length > 1).length,
    fecha: `${c.created_at.getUTCDate()}`,
    validado: c.estado === 'aprobado',
  };
}

/** Lista completa de una cifra del perfil PROPIO (A): casos / colegas / aportes. */
export async function getListaPerfil(tipo: 'casos' | 'colegas' | 'aportes'): Promise<ListaPerfilData> {
  const alumno = await getSesionAlumno();
  const uid = alumno.userId;
  return comoAlumno(uid, async (sql) => {
    if (tipo === 'colegas') {
      // Nombres vía nombre_de (SECURITY DEFINER): perfiles_select oculta el perfil ajeno.
      const filas = await sql<{ id: string; nombre: string | null }[]>`
        select cn.otro as id, lxp.nombre_de(cn.otro) as nombre
        from (
          select case when solicitante_id = ${uid} then receptor_id else solicitante_id end as otro
          from lxp.conexiones_ateneo
          where estado = 'colegas' and (solicitante_id = ${uid} or receptor_id = ${uid})
        ) cn
        order by nombre`;
      const colegas: Persona[] = filas.map((f) => {
        const n = f.nombre ?? 'Colega';
        return { id: f.id, ini: inic(n), nombre: n, rol: 'alumno', meta: 'Colega del Ateneo' };
      });
      return { tipo, colegas };
    }
    if (tipo === 'aportes') {
      const filas = await sql<{ id: string; clase: string; texto: string | null; created_at: Date; post_id: string }[]>`
        select id, 'publicación' as clase, coalesce(cuerpo, vineta, titulo) as texto, created_at, id as post_id
        from lxp.posts_ateneo where autor_id = ${uid}
        union all
        select c.id, 'comentario' as clase, c.cuerpo as texto, c.created_at, c.post_id
        from lxp.comentarios_ateneo c where c.autor_id = ${uid}
        order by created_at desc limit 60`;
      const aportes: ItemAporte[] = filas.map((f) => ({
        id: f.id,
        clase: (f.clase === 'comentario' ? 'comentario' : 'publicación') as ItemAporte['clase'],
        texto: (f.texto ?? '').slice(0, 160),
        cuando: rel(f.created_at),
        postId: f.post_id,
      }));
      return { tipo, aportes };
    }
    // casos: mis casos de bitácora (RLS: propios).
    const filas = await sql<{ id: string; organo: string | null; dominio_iaim: string | null; hallazgos: string | null; estado: string; estudio_series: unknown; created_at: Date }[]>`
      select id, organo, dominio_iaim, hallazgos, estado_validacion::text as estado, estudio_series, created_at
      from lxp.bitacora_casos where id_alumno = ${uid} order by created_at desc limit 60`;
    return { tipo, casos: filas.map(aCasoDeBitacora) };
  });
}

/** Perfil de un colega (C): resumen con contadores reales + sus casos presentados visibles. */
export async function getPerfilColega(userId: string): Promise<PerfilColegaData | null> {
  const alumno = await getSesionAlumno();
  const uid = alumno.userId;
  return comoAlumno(uid, async (sql) => {
    const base = (await sql<{ nombre: string | null; estado: string | null; colegas: number; casos: number; aportes: number }[]>`
      select lxp.nombre_de(${userId}) as nombre,
             (select estado::text from lxp.conexiones_ateneo cx
                where (cx.solicitante_id = ${uid} and cx.receptor_id = ${userId})
                   or (cx.receptor_id = ${uid} and cx.solicitante_id = ${userId}) limit 1) as estado,
             st.colegas, st.casos, st.aportes
      from lxp.ateneo_perfil_stats(${userId}) st`)[0];
    if (!base || !base.nombre) return null;
    // Casos PRESENTADOS visibles: sus posts tipo caso (la RLS de posts aplica la visibilidad).
    const postsCaso = await sql<{ id: string; titulo: string; cuerpo: string | null; caso_origen_id: string | null; created_at: Date }[]>`
      select id, titulo, cuerpo, caso_origen_id, created_at
      from lxp.posts_ateneo where autor_id = ${userId} and tipo = 'caso'
      order by created_at desc limit 40`;
    const casos: CasoBitacora[] = postsCaso.map((p) => ({
      id: p.caso_origen_id ?? p.id,
      titulo: (p.titulo || p.cuerpo || 'Caso presentado').slice(0, 80),
      area: 'Ateneo', organo: '—', dominio: '—', piezas: 0, loops: 0, fecha: '', validado: false,
    }));
    const estadoConexion = (base.estado === 'colegas' ? 'colegas' : base.estado === 'pendiente' ? 'pendiente' : 'ninguna') as PerfilResumen['estadoConexion'];
    return {
      perfil: {
        id: userId, ini: inic(base.nombre), nombre: base.nombre, rol: 'alumno' as const,
        meta: 'Colega del Ateneo', colegas: base.colegas, casos: base.casos, aportes: base.aportes,
        estadoConexion, motivo: '',
      },
      casos,
    };
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

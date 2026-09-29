import 'server-only';
import { comoAlumno, privacidadDeVarios } from '@/lib/db.server';
import type { Sql } from '@/lib/db.server';
import { firmarLecturaImagenes } from '@/lib/media/firmar-imagenes.server';
import type {
  AteneoData,
  CasoBitacora,
  Comentario,
  EnlacePreview,
  Persona,
  Post,
  Reacciones,
  TipoReaccion,
} from '@/app/(campus)/ateneo/_components/tipos';

/**
 * ATENEO — data layer del alumno (§1). Recablea el motor (posts_ateneo/comentarios_ateneo/
 * reacciones/encuestas/colegas · 0005/0015/0032/0033) a la forma `AteneoData`, con RLS
 * (`comoAlumno`): solo posts visibles (aprobados + propios + de colegas si visibilidad='colegas').
 *
 * Feed PAGINADO por CURSOR (keyset created_at+id, no offset → sin saltos/duplicados al
 * llegar posts nuevos). 3 feeds server-side: global / colegas / grupo (mig 0055 roster).
 */

export const LOTE_FEED = 20;

export type FeedAteneo = 'global' | 'colegas' | 'grupo';
export type CursorFeed = { createdAt: string; id: string };
export type LoteFeed = { posts: Post[]; siguienteCursor: CursorFeed | null };

const REL = { hora: 3600, dia: 86400 };
function haceCuanto(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 90) return 'ahora';
  if (s < REL.hora) return `hace ${Math.floor(s / 60)} min`;
  if (s < REL.dia) return `hace ${Math.floor(s / REL.hora)} h`;
  if (s < 2 * REL.dia) return 'ayer';
  return `hace ${Math.floor(s / REL.dia)} días`;
}
function enDias(d: Date | null): string {
  if (!d) return 'sin cierre';
  const n = Math.ceil((d.getTime() - Date.now()) / (REL.dia * 1000));
  if (n <= 0) return 'cerrada';
  return `cierra en ${n} ${n === 1 ? 'día' : 'días'}`;
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDia(d: Date): string {
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()] ?? ''}`;
}
function ini(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter((x) => !/^(dr|dra)\.?$/i.test(x));
  const base = p.length ? p : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((x) => x[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}
const DOM_LABEL: Record<string, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión médica',
};
const STAFF_ROLES = new Set(['docente', 'admin', 'super_admin', 'disenador_instruccional']);

type FilaPost = {
  id: string;
  tipo: string;
  autor_id: string;
  autor: string | null;
  autor_rol: string | null;
  autor_esp: string | null;
  autor_sede: string | null;
  titulo: string;
  vineta: string | null;
  cuerpo: string | null;
  temas: unknown;
  media: unknown;
  enlace: unknown;
  cierra_en: Date | null;
  compartidos: number;
  created_at: Date;
  caso_origen_id: string | null;
  n_comentarios: number;
  reac_total: number;
  mi_reaccion: string | null;
};

function persona(
  f: {
    autor_id: string;
    autor: string | null;
    autor_rol: string | null;
    autor_esp: string | null;
    autor_sede: string | null;
  },
  avatarUrl: string | null = null,
): Persona {
  const nombre = f.autor ?? 'Colega';
  const rol = f.autor_rol && STAFF_ROLES.has(f.autor_rol) ? 'docente' : 'alumno';
  const meta = [f.autor_esp, f.autor_sede].filter(Boolean).join(' · ') || 'Campus Médica';
  return { id: f.autor_id, ini: ini(nombre), nombre, rol, meta, avatarUrl };
}

/**
 * Fotos de perfil (avatarUrl FIRMADO) por user_id, cross-user y RESPETANDO privacidad: se
 * resuelven con `lxp.perfil_publico_de` (SECURITY DEFINER · §10) — un alumno no puede leer el
 * `avatar_url` ajeno bajo la RLS own-or-staff de `lxp.perfiles`. El `avatar_url` es NULL para
 * perfiles ocultos (perfilVisible=false) → cae a iniciales. Las refs `media/imagenes/*` se
 * firman a URL de lectura (patrón del feed). Devuelve `id → url|null`.
 */
export async function avataresDe(sql: Sql, ids: string[]): Promise<Map<string, string | null>> {
  const m = new Map<string, string | null>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return m;
  const filas = await sql<{ id: string; avatar_url: string | null }[]>`
    select id, avatar_url from lxp.perfil_publico_de(${uniq}::uuid[])`;
  const refs = filas.map((f) => f.avatar_url).filter((r): r is string => !!r);
  const urls = refs.length ? await firmarLecturaImagenes(refs) : {};
  for (const f of filas) m.set(f.id, f.avatar_url ? urls[f.avatar_url] ?? null : null);
  return m;
}

function aCasoVacio(titulo: string): CasoBitacora {
  return { id: '', titulo: titulo || 'Estudio', area: 'Ultrasonido', organo: '—', dominio: '—', piezas: 0, loops: 0, fecha: '', validado: false };
}

/** Colegas (conexiones aceptadas) del usuario — bajo la RLS del propio usuario. */
async function colegasDe(sql: Sql, userId: string): Promise<string[]> {
  const filas = await sql<{ otro: string }[]>`
    select case when solicitante_id = ${userId} then receptor_id else solicitante_id end as otro
    from lxp.conexiones_ateneo
    where estado = 'colegas' and (solicitante_id = ${userId} or receptor_id = ${userId})`;
  return filas.map((c) => c.otro);
}

/**
 * Ensambla los `Post[]` a partir de las filas base (reacciones top, preview de comentarios,
 * casos referenciados y encuestas). Toma `sql` (no abre transacción) para reusarse en el
 * primer lote (getAteneoSocial) y en los lotes siguientes (cargarFeed) sin anidar comoAlumno.
 */
async function ensamblarPosts(sql: Sql, filas: FilaPost[], userId: string): Promise<Post[]> {
  const ids = filas.map((f) => f.id);
  if (ids.length === 0) return [];
  const idsCaso = filas.map((f) => f.caso_origen_id).filter((x): x is string => !!x);

  // Media (imagen/video): las refs `media/imagenes/*` guardadas se firman a URLs de lectura
  // (públicas, vida corta) para el grid de PostCard. Los GIF (hotlink Giphy) se EXCLUYEN: son
  // URLs externas que se sirven tal cual (no se firman). Reusa el firmante del dominio (§2).
  const mediaRefs = filas
    .filter((f) => f.tipo === 'media')
    .flatMap((f) => (Array.isArray(f.media) ? (f.media as { tipo?: string; url?: string }[]) : [])
      .filter((m) => m.tipo !== 'gif')
      .map((m) => m.url)
      .filter((u): u is string => !!u));
  const urlPorRef = mediaRefs.length ? await firmarLecturaImagenes(mediaRefs) : {};

  const reacTipos = await sql<{ post_id: string; tipo: string; n: number }[]>`
    select post_id, tipo::text as tipo, count(*)::int as n
    from lxp.reacciones_ateneo where post_id = any(${ids})
    group by post_id, tipo order by n desc`;
  const topPorPost = new Map<string, TipoReaccion[]>();
  for (const r of reacTipos) {
    const arr = topPorPost.get(r.post_id) ?? [];
    if (arr.length < 3) arr.push(r.tipo as TipoReaccion);
    topPorPost.set(r.post_id, arr);
  }

  const coms = await sql<{ id: string; post_id: string; autor_id: string; autor: string | null; autor_rol: string | null; cuerpo: string; created_at: Date }[]>`
    select c.id, c.post_id, c.autor_id, lxp.nombre_de(c.autor_id) as autor,
           (select rol::text from lxp.perfiles pf where pf.user_id = c.autor_id) as autor_rol,
           c.cuerpo, c.created_at
    from lxp.comentarios_ateneo c
    where c.post_id = any(${ids}) and c.parent_id is null
    order by c.created_at desc`;

  // Fotos cross-user (autores de post + de los comentarios en preview) · perfil_publico_de (§10).
  const avatarPorId = await avataresDe(sql, [
    ...filas.map((f) => f.autor_id),
    ...coms.map((c) => c.autor_id),
  ]);

  const previewPorPost = new Map<string, Comentario[]>();
  for (const c of coms) {
    const arr = previewPorPost.get(c.post_id) ?? [];
    if (arr.length < 2) {
      arr.push({
        id: c.id,
        autor: persona(
          { autor_id: c.autor_id, autor: c.autor, autor_rol: c.autor_rol, autor_esp: null, autor_sede: null },
          avatarPorId.get(c.autor_id) ?? null,
        ),
        texto: c.cuerpo,
        cuando: haceCuanto(c.created_at),
      });
    }
    previewPorPost.set(c.post_id, arr);
  }

  const casos = idsCaso.length
    ? await sql<{ id: string; organo: string | null; dominio_iaim: string | null; hallazgos: string | null; estado: string; estudio_series: unknown; created_at: Date }[]>`
        select id, organo, dominio_iaim, hallazgos,
               estado_validacion::text as estado, estudio_series, created_at
        from lxp.bitacora_casos where id = any(${idsCaso})`
    : [];
  const casoPorId = new Map<string, (typeof casos)[number]>();
  for (const c of casos) casoPorId.set(c.id, c);
  const aCaso = (id: string, tituloPost: string): CasoBitacora | null => {
    const c = casoPorId.get(id);
    if (!c) return null;
    const series = Array.isArray(c.estudio_series) ? (c.estudio_series as { frames?: unknown[] }[]) : [];
    const loops = series.filter((s) => Array.isArray(s.frames) && s.frames.length > 1).length;
    return {
      id: c.id,
      titulo: c.hallazgos?.slice(0, 80) || tituloPost || 'Estudio de la bitácora',
      area: c.organo ?? 'Ultrasonido',
      organo: c.organo ?? '—',
      dominio: c.dominio_iaim ? DOM_LABEL[c.dominio_iaim] ?? c.dominio_iaim : '—',
      piezas: series.length,
      loops,
      fecha: fmtDia(c.created_at),
      validado: c.estado === 'aprobado',
    };
  };

  const opts = await sql<{ id: string; post_id: string; texto: string; orden: number; votos: number }[]>`
    select o.id, o.post_id, o.texto, o.orden,
           (select count(*)::int from lxp.encuesta_votos v where v.opcion_id = o.id) as votos
    from lxp.encuesta_opciones o where o.post_id = any(${ids})
    order by o.orden`;
  const misVotos = await sql<{ post_id: string; opcion_id: string }[]>`
    select post_id, opcion_id from lxp.encuesta_votos
    where post_id = any(${ids}) and usuario_id = ${userId}`;
  const opcionesPorPost = new Map<string, { id: string; texto: string; votos: number }[]>();
  for (const o of opts) {
    const arr = opcionesPorPost.get(o.post_id) ?? [];
    arr.push({ id: o.id, texto: o.texto, votos: o.votos });
    opcionesPorPost.set(o.post_id, arr);
  }
  const votoPorPost = new Map<string, string>();
  for (const v of misVotos) votoPorPost.set(v.post_id, v.opcion_id);

  return filas.map((f) => {
    const base = {
      id: f.id,
      autor: persona(f, avatarPorId.get(f.autor_id) ?? null),
      cuando: haceCuanto(f.created_at),
      reacciones: {
        top: topPorPost.get(f.id) ?? [],
        total: f.reac_total,
        mia: (f.mi_reaccion as TipoReaccion | null) ?? undefined,
      } as Reacciones,
      comentarios: f.n_comentarios,
      compartidos: f.compartidos,
      preview: previewPorPost.get(f.id) ?? [],
      // Snapshot OG guardado al publicar; se sirve TAL CUAL (no se re-fetchea → sin SSRF en lectura).
      enlace: f.enlace && typeof f.enlace === 'object' ? (f.enlace as EnlacePreview) : null,
    };
    if (f.tipo === 'caso') {
      const caso = f.caso_origen_id ? aCaso(f.caso_origen_id, f.titulo) : null;
      return { ...base, tipo: 'caso', titulo: f.titulo, texto: f.cuerpo ?? '', caso: caso ?? aCasoVacio(f.titulo) };
    }
    if (f.tipo === 'pregunta') {
      const temas = Array.isArray(f.temas) ? (f.temas as unknown[]).map(String) : [];
      return { ...base, tipo: 'pregunta', pregunta: f.titulo, contexto: f.cuerpo ?? undefined, temas, seguidores: f.reac_total };
    }
    if (f.tipo === 'media') {
      const piezas = (Array.isArray(f.media) ? (f.media as { tipo?: string; url?: string }[]) : []).map((m) => {
        const tipo = (m.tipo === 'video' ? 'video' : m.tipo === 'gif' ? 'gif' : 'imagen') as 'imagen' | 'video' | 'gif';
        // GIF: hotlink externo (Giphy) tal cual. Imagen/video: `url`=ref → URL firmada.
        const src = tipo === 'gif'
          ? (typeof m.url === 'string' ? m.url : undefined)
          : (typeof m.url === 'string' ? urlPorRef[m.url] ?? undefined : undefined);
        return { tipo, src };
      });
      return { ...base, tipo: 'media', texto: f.cuerpo ?? '', piezas };
    }
    if (f.tipo === 'encuesta') {
      return {
        ...base,
        tipo: 'encuesta',
        pregunta: f.titulo,
        opciones: opcionesPorPost.get(f.id) ?? [],
        miVoto: votoPorPost.get(f.id),
        cierra: enDias(f.cierra_en),
      };
    }
    return { ...base, tipo: 'texto', texto: f.cuerpo ?? f.vineta ?? f.titulo };
  });
}

/**
 * Un LOTE del feed por keyset (created_at, id) DESC. `feed` acota el conjunto server-side:
 * global (RLS), colegas (autor ∈ mis colegas), grupo (autor ∈ roster de mi grupo · mig 0055).
 * Pide `limite+1` para saber si hay más; el cursor apunta a la última fila devuelta.
 */
async function cargarLote(
  sql: Sql,
  userId: string,
  feed: FeedAteneo,
  cursor: CursorFeed | null,
  limite: number,
): Promise<LoteFeed> {
  // Conjunto de autores permitido según el feed (null = sin filtro por autor · global).
  let autores: string[] | null = null;
  if (feed === 'colegas') {
    autores = await colegasDe(sql, userId);
    if (autores.length === 0) return { posts: [], siguienteCursor: null };
  } else if (feed === 'grupo') {
    const roster = await sql<{ id: string }[]>`select lxp.ateneo_mi_grupo_roster() as id`;
    autores = roster.map((r) => r.id);
    if (autores.length === 0) return { posts: [], siguienteCursor: null };
  }
  const hayCursor = cursor !== null;
  const filas = await sql<FilaPost[]>`
    select p.id, p.tipo::text as tipo, p.autor_id,
           lxp.nombre_de(p.autor_id) as autor,
           (select rol::text from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_rol,
           (select especialidad from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_esp,
           (select sede from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_sede,
           p.titulo, p.vineta, p.cuerpo, p.temas, p.media, p.enlace, p.cierra_en, p.compartidos, p.created_at,
           p.caso_origen_id,
           (select count(*)::int from lxp.comentarios_ateneo c where c.post_id = p.id) as n_comentarios,
           (select count(*)::int from lxp.reacciones_ateneo r where r.post_id = p.id) as reac_total,
           (select r.tipo::text from lxp.reacciones_ateneo r where r.post_id = p.id and r.usuario_id = ${userId}) as mi_reaccion
    from lxp.posts_ateneo p
    where (${autores === null} or p.autor_id = any(${autores ?? []}))
      and (${!hayCursor} or (p.created_at, p.id) < (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.id ?? null}::uuid))
    order by p.created_at desc, p.id desc
    limit ${limite + 1}`;

  const hayMas = filas.length > limite;
  const lote = hayMas ? filas.slice(0, limite) : filas;
  const posts = await ensamblarPosts(sql, lote, userId);
  const ultima = lote[lote.length - 1];
  const siguienteCursor = hayMas && ultima ? { createdAt: ultima.created_at.toISOString(), id: ultima.id } : null;
  return { posts, siguienteCursor };
}

/** Carga un lote de un feed (llamable desde el cliente vía la server action). */
export async function cargarFeedAteneo(
  userId: string,
  feed: FeedAteneo,
  cursor: CursorFeed | null,
  limite = LOTE_FEED,
): Promise<LoteFeed> {
  return comoAlumno(userId, (sql) => cargarLote(sql, userId, feed, cursor, limite));
}

export async function getAteneoSocial(
  userId: string,
): Promise<{ data: AteneoData; colegaIds: string[]; siguienteCursor: CursorFeed | null }> {
  return comoAlumno(userId, async (sql) => {
    // Primer lote del feed GLOBAL (los siguientes y el cambio de feed → cargarFeedAteneo).
    const { posts, siguienteCursor } = await cargarLote(sql, userId, 'global', null, LOTE_FEED);

    // ── Yo (perfil resumen) ── foto/portada del PROPIO perfil (RLS own-row → lectura directa).
    const yoFila = (
      await sql<{ nombre: string | null; rol: string | null; esp: string | null; sede: string | null; avatar_url: string | null; portada_url: string | null }[]>`
        select nombre, rol::text as rol, especialidad as esp, sede, avatar_url, portada_url
        from lxp.perfiles where user_id = ${userId}`
    )[0];
    const yoNombre = yoFila?.nombre ?? 'Usted';
    const yoMedia = await firmarLecturaImagenes([yoFila?.avatar_url, yoFila?.portada_url]);
    const colegaIds = await colegasDe(sql, userId);
    const casosMios = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where id_alumno = ${userId}`)[0]?.n ?? 0;
    const aportesMios = (await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.comentarios_ateneo where autor_id = ${userId}`)[0]?.n ?? 0;

    const yo = {
      id: userId,
      ini: ini(yoNombre),
      nombre: yoNombre,
      rol: (yoFila?.rol && STAFF_ROLES.has(yoFila.rol) ? 'docente' : 'alumno') as Persona['rol'],
      meta: [yoFila?.esp, yoFila?.sede].filter(Boolean).join(' · ') || 'Campus Médica',
      colegas: colegaIds.length,
      casos: casosMios,
      aportes: aportesMios,
      avatarUrl: (yoFila?.avatar_url && yoMedia[yoFila.avatar_url]) || null,
      portadaUrl: (yoFila?.portada_url && yoMedia[yoFila.portada_url]) || null,
    };

    // ── Mis casos (para presentar en el composer): anonimizados/validados primero ──
    const misCasosFilas = await sql<{ id: string; organo: string | null; dominio_iaim: string | null; hallazgos: string | null; estado: string; estudio_series: unknown; anonimizado_en: Date | null; created_at: Date }[]>`
      select id, organo, dominio_iaim, hallazgos, estado_validacion::text as estado,
             estudio_series, anonimizado_en, created_at
      from lxp.bitacora_casos
      where id_alumno = ${userId} and anonimizado_en is not null
      order by (estado_validacion = 'aprobado') desc, created_at desc
      limit 12`;
    const misCasos: CasoBitacora[] = misCasosFilas.map((c) => {
      const series = Array.isArray(c.estudio_series) ? (c.estudio_series as { frames?: unknown[] }[]) : [];
      return {
        id: c.id,
        titulo: c.hallazgos?.slice(0, 80) || 'Estudio de la bitácora',
        area: c.organo ?? 'Ultrasonido',
        organo: c.organo ?? '—',
        dominio: c.dominio_iaim ? DOM_LABEL[c.dominio_iaim] ?? c.dominio_iaim : '—',
        piezas: series.length,
        loops: series.filter((s) => Array.isArray(s.frames) && s.frames.length > 1).length,
        fecha: fmtDia(c.created_at),
        validado: c.estado === 'aprobado',
      };
    });

    // ── Sugerencias de colegas (con contadores REALES vía mig 0055) ──
    const sugFilas = await sql<{ user_id: string; nombre: string; rol: string; esp: string | null; sede: string | null; estado: string | null; colegas: number; casos: number; aportes: number; comunes: number }[]>`
      select pf.user_id, pf.nombre, pf.rol::text as rol, pf.especialidad as esp, pf.sede,
             (select estado::text from lxp.conexiones_ateneo cx
                where (cx.solicitante_id = ${userId} and cx.receptor_id = pf.user_id)
                   or (cx.receptor_id = ${userId} and cx.solicitante_id = pf.user_id)
                limit 1) as estado,
             st.colegas, st.casos, st.aportes,
             (select count(*)::int from lxp.conexiones_ateneo m
                where m.estado = 'colegas'
                  and (m.solicitante_id = pf.user_id or m.receptor_id = pf.user_id)
                  and (case when m.solicitante_id = pf.user_id then m.receptor_id else m.solicitante_id end) = any(${colegaIds.length ? colegaIds : ['00000000-0000-0000-0000-000000000000']})
             ) as comunes
      from lxp.perfiles pf
      cross join lateral lxp.ateneo_perfil_stats(pf.user_id) st
      where pf.user_id <> ${userId} and pf.rol in ('alumno','docente')
      order by pf.nombre
      limit 8`;
    // Gate de privacidad (Bloque 4): excluye a quien ocultó su perfil (perfilVisible=false) y
    // marca aceptaColegas (la UI oculta "Conectar" si es false).
    const privSug = await privacidadDeVarios(sugFilas.map((s) => s.user_id));
    const sugAvatares = await avataresDe(sql, sugFilas.map((s) => s.user_id));
    const sugerencias = sugFilas
      .filter((s) => privSug.get(s.user_id)?.perfilVisible !== false)
      .map((s) => {
        const estadoConexion = s.estado === 'colegas' ? ('colegas' as const) : s.estado === 'pendiente' ? ('pendiente' as const) : ('ninguna' as const);
        const motivo = s.comunes > 0 ? `${s.comunes} colegas en común` : s.rol === 'docente' ? 'docente del campus' : 'del diplomado';
        return {
          id: s.user_id,
          ini: ini(s.nombre),
          nombre: s.nombre,
          rol: (STAFF_ROLES.has(s.rol) ? 'docente' : 'alumno') as Persona['rol'],
          meta: [s.esp, s.sede].filter(Boolean).join(' · ') || 'Campus Médica',
          colegas: s.colegas,
          casos: s.casos,
          aportes: s.aportes,
          motivo,
          estadoConexion,
          enComun: s.comunes > 0 ? { total: s.comunes, inis: [] } : undefined,
          aceptaColegas: privSug.get(s.user_id)?.aceptarColegas ?? true,
          avatarUrl: sugAvatares.get(s.user_id) ?? null,
        };
      });

    // Nº de colegas con al menos un post visible (badge del tab "Mis colegas").
    const colegasConPosts = colegaIds.length
      ? (await sql<{ n: number }[]>`
          select count(distinct autor_id)::int as n from lxp.posts_ateneo where autor_id = any(${colegaIds})`)[0]?.n ?? 0
      : 0;

    return {
      data: { yo, posts, misCasos, sugerencias, colegasConPosts },
      colegaIds,
      siguienteCursor,
    };
  });
}

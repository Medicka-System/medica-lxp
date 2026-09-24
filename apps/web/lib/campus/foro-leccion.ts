import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { comoConfigForo, estadoVentanaForo } from '@/lib/studio/foro-config';
import { grupoDelAlumnoEnPrograma } from './inscripcion';

/**
 * FORO de la lección — data layer del alumno (§5C · mock leccion-foro). Recablea el
 * motor `foro_mensajes` (0003/0026/0030) a los TRES estados de la experiencia:
 *
 *   entrada  → aún no publicó: instrucciones + rúbrica + composer; los posts de los
 *              compañeros están OCULTOS (gate por RLS · `foro_select` de 0030). El
 *              conteo de ocultos sale de `lxp.foro_ocultos()` (SECDEF, sin revelar
 *              contenido). `posts` viene VACÍO porque la RLS los esconde.
 *   listado  → publicó su post raíz → la RLS desbloquea los posts del grupo.
 *   post     → interior: cuerpo rico + reacción + hilo de 2 niveles.
 *
 * DISCUSIÓN CERRADA por (grupo, lección): la query filtra por `grupo_id` (la COHORTE
 * REAL del alumno, resuelta vía `grupoDelAlumnoEnPrograma` → inscripción CORA · §10) y
 * `actividad_id` (la actividad foro de la lección) — nunca posts de otros grupos. La
 * membresía se refuerza server-side en la RLS (`es_miembro_grupo` · mig 0036): ver el
 * foro ajeno exige ser miembro Y haber publicado. En el Sprint 11 solo cambia la fuente
 * (CORA real), no la lógica.
 */

export type AutorForo = {
  userId: string;
  ini: string;
  nombre: string;
  /** Rótulo del chip: 'Usted' (yo), 'Docente' (staff) o null (compañero). */
  rol: 'Usted' | 'Docente' | null;
  docente: boolean;
  esYo: boolean;
};

export type AdjuntosForo = { tipo: 'imagen' | 'loop'; cantidad: number } | null;

export type PostForo = {
  id: string;
  autor: AutorForo;
  creadoEn: string; // ISO
  editadoEn: string | null;
  titulo: string;
  extracto: string;
  cuerpo: string; // HTML (para el interior)
  respuestas: number;
  utiles: number;
  miReaccion: boolean;
  adjuntos: AdjuntosForo;
  mio: boolean;
};

export type ComentarioForo = {
  id: string;
  /** null = raíz del hilo (hijo directo del post); si no, el id de la raíz (2 niveles). */
  parentId: string | null;
  autor: AutorForo;
  creadoEn: string;
  editadoEn: string | null;
  cuerpo: string; // HTML
  utiles: number;
  miReaccion: boolean;
  mio: boolean;
};

export type CriterioForo = { criterio: string; descripcion: string | null; puntos: number | null };

export type ForoLeccionData = {
  tema: { titulo: string; modulo: string; leccion: string; grupo: string; cierra: string | null };
  /** Consigna del diseñador en HTML (config.instrucciones). */
  instruccionesHtml: string;
  reglas: string[];
  rubrica: { total: number; criterios: CriterioForo[] } | null;
  /** Ya publicó su post raíz → estado listado/post; si no, entrada. */
  yaPublico: boolean;
  /** Posts raíz de OTROS esperando (para el muro). Es lo que hay, no un literal. */
  ocultos: number;
  /** Comentarios que le faltan para cumplir la rúbrica (minComentarios). */
  respuestasPendientes: number;
  puedePublicar: boolean;
  ventanaEstado: string;
  grupoId: string | null;
  actividadId: string;
  yo: { userId: string; ini: string; nombre: string };
  /** Su propio post (null si aún no publicó). */
  miPost: PostForo | null;
  /** Posts de los compañeros (vacío hasta que publique · RLS). */
  posts: PostForo[];
  /** Hilo por post (todos los comentarios, aplanados a 2 niveles). */
  hilos: Record<string, ComentarioForo[]>;
};

/* ───────────────────────────── Helpers puros ───────────────────────────── */

const STAFF = new Set(['docente', 'admin', 'super_admin', 'disenador_instruccional']);

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter((p) => !/^(dr|dra|dr\.|dra\.)$/i.test(p));
  const base = partes.length ? partes : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((p) => p[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extracto(html: string, max = 200): string {
  const txt = stripHtml(html);
  if (txt.length <= max) return txt;
  const corte = txt.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return `${(esp > max * 0.6 ? corte.slice(0, esp) : corte).trim()}…`;
}

function contarAdjuntos(html: string): AdjuntosForo {
  const videos = (html.match(/<(video|iframe)\b/gi) ?? []).length;
  if (videos > 0) return { tipo: 'loop', cantidad: videos };
  const imgs = (html.match(/<img\b/gi) ?? []).length;
  if (imgs > 0) return { tipo: 'imagen', cantidad: imgs };
  return null;
}

/* ─────────────────────────── Data ─────────────────────────── */

type Fila = {
  id: string;
  autor_id: string;
  autor: string | null;
  autor_rol: string | null;
  titulo: string | null;
  cuerpo: string;
  parent_id: string | null;
  created_at: Date;
  editado_en: Date | null;
  utiles: number;
  mi_reaccion: boolean;
};

function autorDe(f: Fila, userId: string): AutorForo {
  const nombre = f.autor ?? 'Alumno';
  const docente = !!f.autor_rol && STAFF.has(f.autor_rol);
  const esYo = f.autor_id === userId;
  return {
    userId: f.autor_id,
    ini: inicialesDe(nombre),
    nombre,
    rol: esYo ? 'Usted' : docente ? 'Docente' : null,
    docente,
    esYo,
  };
}

/** Resuelve la actividad foro de la lección y delega en `getForoLeccionPorActividad`. */
export async function getForoLeccion(
  userId: string,
  nombre: string,
  leccionId: string,
): Promise<ForoLeccionData | null> {
  return comoAlumno(userId, async (sql) => {
    const act = (
      await sql<
        {
          id: string;
          titulo: string;
          leccion: string;
          modulo: string;
          programa_id: string;
          config: Record<string, unknown> | null;
        }[]
      >`
        select a.id, a.titulo, l.nombre as leccion, m.nombre as modulo,
               m.programa_id as programa_id, l.config
        from lxp.actividades a
        join lxp.lecciones l on l.id = a.leccion_id
        join lxp.modulos m on m.id = l.modulo_id
        where a.leccion_id = ${leccionId} and a.tipo = 'foro'
        order by a.orden, a.created_at
        limit 1`
    )[0];
    if (!act) return null;

    const cfg = comoConfigForo(act.config);
    const ventana = estadoVentanaForo(cfg, new Date());

    // Grupo destino: la COHORTE REAL del alumno en este programa (su inscripción CORA,
    // leída vía lxp.cora_grupos_de · §10). null si aún no está mapeado a un grupo.
    const grupo = await grupoDelAlumnoEnPrograma(sql, userId, act.programa_id);
    const grupoId = grupo?.id ?? null;
    const grupoNombre = grupo?.nombre ?? 'tu grupo';

    // Rúbrica del catálogo (como en la tarea).
    const rub = cfg.rubricaId
      ? (
          await sql<{ criterios: unknown }[]>`
            select criterios from lxp.rubricas where id = ${cfg.rubricaId} limit 1`
        )[0]
      : undefined;
    const criterios: CriterioForo[] = rub
      ? (Array.isArray(rub.criterios) ? rub.criterios : []).map((c) => {
          const o = (c ?? {}) as Record<string, unknown>;
          return {
            criterio: typeof o.criterio === 'string' ? o.criterio : '',
            descripcion: typeof o.descripcion === 'string' ? o.descripcion : null,
            puntos:
              typeof o.puntos === 'number' ? o.puntos : typeof o.peso === 'number' ? o.peso : null,
          };
        })
      : [];
    const rubrica = rub
      ? { total: criterios.reduce((s, c) => s + (c.puntos ?? 0), 0), criterios }
      : null;

    // ¿Ya publicó su post raíz? (RLS permite ver lo propio siempre.)
    const yaPublico = grupoId
      ? (
          await sql<{ ok: boolean }[]>`
            select exists (
              select 1 from lxp.foro_mensajes
              where actividad_id = ${act.id} and grupo_id = ${grupoId}
                and autor_id = ${userId} and parent_id is null
            ) as ok`
        )[0]?.ok === true
      : false;

    // Cuántos posts raíz de OTROS esperan (SECDEF · no revela contenido).
    const ocultos = grupoId
      ? (
          await sql<{ n: number }[]>`select lxp.foro_ocultos(${act.id}, ${grupoId}) as n`
        )[0]?.n ?? 0
      : 0;

    // Mensajes visibles (la RLS gatea: sin publicar, solo se ven los propios).
    const filas = grupoId
      ? await sql<Fila[]>`
          select fm.id, fm.autor_id, lxp.nombre_de(fm.autor_id) as autor,
                 (select rol::text from lxp.perfiles pf where pf.user_id = fm.autor_id) as autor_rol,
                 fm.titulo, fm.cuerpo, fm.parent_id, fm.created_at, fm.editado_en,
                 (select count(*)::int from lxp.foro_reacciones r where r.mensaje_id = fm.id) as utiles,
                 exists (select 1 from lxp.foro_reacciones r
                         where r.mensaje_id = fm.id and r.autor_id = ${userId}) as mi_reaccion
          from lxp.foro_mensajes fm
          where fm.actividad_id = ${act.id} and fm.grupo_id = ${grupoId}
          order by fm.created_at asc`
      : [];

    const yoNombre = (await sql<{ n: string | null }[]>`select lxp.nombre_de(${userId}) as n`)[0]?.n ?? nombre;

    // ── Arma las estructuras ──
    const byId = new Map<string, Fila>();
    for (const f of filas) byId.set(f.id, f);

    const raicesPost = filas.filter((f) => !f.parent_id); // posts raíz
    // La raíz-ancestro de un comentario (para aplanar a 2 niveles).
    const raizAncestro = (f: Fila): Fila => {
      let cur = f;
      while (cur.parent_id && byId.has(cur.parent_id) && byId.get(cur.parent_id)!.parent_id) {
        cur = byId.get(cur.parent_id)!;
      }
      return cur; // su parent es un post raíz
    };
    // Post al que pertenece un comentario.
    const postDe = (f: Fila): string | null => {
      const raiz = raizAncestro(f);
      return raiz.parent_id ?? null; // el parent de la raíz-comentario es el post
    };

    const comentarios = filas.filter((f) => f.parent_id);
    const respuestasPorPost = new Map<string, number>();
    const hilos: Record<string, ComentarioForo[]> = {};
    for (const f of comentarios) {
      const postId = postDe(f);
      if (!postId) continue;
      respuestasPorPost.set(postId, (respuestasPorPost.get(postId) ?? 0) + 1);
      const raiz = raizAncestro(f);
      const esRaizHilo = raiz.id === f.id; // hijo directo del post
      (hilos[postId] ??= []).push({
        id: f.id,
        parentId: esRaizHilo ? null : raiz.id,
        autor: autorDe(f, userId),
        creadoEn: f.created_at.toISOString(),
        editadoEn: f.editado_en ? f.editado_en.toISOString() : null,
        cuerpo: f.cuerpo,
        utiles: f.utiles,
        miReaccion: f.mi_reaccion,
        mio: f.autor_id === userId,
      });
    }

    const aPost = (f: Fila): PostForo => ({
      id: f.id,
      autor: autorDe(f, userId),
      creadoEn: f.created_at.toISOString(),
      editadoEn: f.editado_en ? f.editado_en.toISOString() : null,
      titulo: f.titulo?.trim() || stripHtml(f.cuerpo).slice(0, 80) || 'Sin título',
      extracto: extracto(f.cuerpo),
      cuerpo: f.cuerpo,
      respuestas: respuestasPorPost.get(f.id) ?? 0,
      utiles: f.utiles,
      miReaccion: f.mi_reaccion,
      adjuntos: contarAdjuntos(f.cuerpo),
      mio: f.autor_id === userId,
    });

    const miPost = raicesPost.find((f) => f.autor_id === userId);
    const posts = raicesPost.filter((f) => f.autor_id !== userId).map(aPost);

    const misComentarios = comentarios.filter((f) => f.autor_id === userId).length;
    const respuestasPendientes = Math.max(0, cfg.participacion.minComentarios - misComentarios);

    return {
      tema: {
        titulo: cfg.tema.trim() || act.titulo,
        modulo: act.modulo,
        leccion: act.leccion,
        grupo: grupoNombre,
        cierra: cfg.cierreEn ? cfg.cierreEn.slice(0, 10) : null,
      },
      instruccionesHtml: cfg.instrucciones || '',
      reglas: cfg.reglas,
      rubrica,
      yaPublico,
      ocultos,
      respuestasPendientes,
      puedePublicar: ventana.abierto && grupoId !== null,
      ventanaEstado: ventana.estado,
      grupoId,
      actividadId: act.id,
      yo: { userId, ini: inicialesDe(yoNombre), nombre: yoNombre },
      miPost: miPost ? aPost(miPost) : null,
      posts,
      hilos,
    };
  });
}

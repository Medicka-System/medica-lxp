import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type {
  AteneoData,
  CasoBitacora,
  Comentario,
  Persona,
  Post,
  Reacciones,
  TipoReaccion,
} from '@/app/(campus)/ateneo/_components/tipos';

/**
 * ATENEO — data layer del alumno (§1 · mock alumno/ateneo). Recablea el motor que YA
 * existe (posts_ateneo/comentarios_ateneo/comentario_upvotes · 0005/0015) + el modelo
 * nuevo (reacciones/encuestas/colegas · 0032) a la forma `AteneoData` del mock, SIN
 * cambiar los tipos. Corre con RLS (`comoAlumno`): solo posts aprobados + los propios.
 *
 * Feed: la página carga el GLOBAL; el feed "mis colegas" se filtra en cliente con
 * `colegaIds` (mis conexiones aceptadas), que el page pasa aparte para no tocar el tipo.
 */

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
  cierra_en: Date | null;
  compartidos: number;
  created_at: Date;
  caso_origen_id: string | null;
  n_comentarios: number;
  reac_total: number;
  mi_reaccion: string | null;
};

function persona(f: {
  autor_id: string;
  autor: string | null;
  autor_rol: string | null;
  autor_esp: string | null;
  autor_sede: string | null;
}): Persona {
  const nombre = f.autor ?? 'Colega';
  const rol = f.autor_rol && STAFF_ROLES.has(f.autor_rol) ? 'docente' : 'alumno';
  const meta = [f.autor_esp, f.autor_sede].filter(Boolean).join(' · ') || 'Campus Médica';
  return { id: f.autor_id, ini: ini(nombre), nombre, rol, meta };
}

export async function getAteneoSocial(
  userId: string,
): Promise<{ data: AteneoData; colegaIds: string[] }> {
  return comoAlumno(userId, async (sql) => {
    // ── Posts visibles (RLS: aprobados + propios) ──
    const filas = await sql<FilaPost[]>`
      select p.id, p.tipo::text as tipo, p.autor_id,
             lxp.nombre_de(p.autor_id) as autor,
             (select rol::text from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_rol,
             (select especialidad from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_esp,
             (select sede from lxp.perfiles pf where pf.user_id = p.autor_id) as autor_sede,
             p.titulo, p.vineta, p.cuerpo, p.temas, p.media, p.cierra_en, p.compartidos, p.created_at,
             p.caso_origen_id,
             (select count(*)::int from lxp.comentarios_ateneo c where c.post_id = p.id) as n_comentarios,
             (select count(*)::int from lxp.reacciones_ateneo r where r.post_id = p.id) as reac_total,
             (select r.tipo::text from lxp.reacciones_ateneo r where r.post_id = p.id and r.usuario_id = ${userId}) as mi_reaccion
      from lxp.posts_ateneo p
      order by p.created_at desc
      limit 40`;

    const ids = filas.map((f) => f.id);
    const idsCaso = filas.map((f) => f.caso_origen_id).filter((x): x is string => !!x);

    // Reacciones top por post (los 3 tipos más usados).
    const reacTipos = ids.length
      ? await sql<{ post_id: string; tipo: string; n: number }[]>`
          select post_id, tipo::text as tipo, count(*)::int as n
          from lxp.reacciones_ateneo where post_id = any(${ids})
          group by post_id, tipo order by n desc`
      : [];
    const topPorPost = new Map<string, TipoReaccion[]>();
    for (const r of reacTipos) {
      const arr = topPorPost.get(r.post_id) ?? [];
      if (arr.length < 3) arr.push(r.tipo as TipoReaccion);
      topPorPost.set(r.post_id, arr);
    }

    // Preview de comentarios (2 más recientes por post).
    const coms = ids.length
      ? await sql<{ id: string; post_id: string; autor_id: string; autor: string | null; autor_rol: string | null; cuerpo: string; created_at: Date }[]>`
          select c.id, c.post_id, c.autor_id, lxp.nombre_de(c.autor_id) as autor,
                 (select rol::text from lxp.perfiles pf where pf.user_id = c.autor_id) as autor_rol,
                 c.cuerpo, c.created_at
          from lxp.comentarios_ateneo c
          where c.post_id = any(${ids}) and c.parent_id is null
          order by c.created_at desc`
      : [];
    const previewPorPost = new Map<string, Comentario[]>();
    for (const c of coms) {
      const arr = previewPorPost.get(c.post_id) ?? [];
      if (arr.length < 2) {
        arr.push({
          id: c.id,
          autor: persona({ autor_id: c.autor_id, autor: c.autor, autor_rol: c.autor_rol, autor_esp: null, autor_sede: null }),
          texto: c.cuerpo,
          cuando: haceCuanto(c.created_at),
        });
      }
      previewPorPost.set(c.post_id, arr);
    }

    // Casos de bitácora referenciados (para posts tipo caso).
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

    // Encuestas: opciones + conteo de votos + mi voto.
    const opts = ids.length
      ? await sql<{ id: string; post_id: string; texto: string; orden: number; votos: number }[]>`
          select o.id, o.post_id, o.texto, o.orden,
                 (select count(*)::int from lxp.encuesta_votos v where v.opcion_id = o.id) as votos
          from lxp.encuesta_opciones o where o.post_id = any(${ids})
          order by o.orden`
      : [];
    const misVotos = ids.length
      ? await sql<{ post_id: string; opcion_id: string }[]>`
          select post_id, opcion_id from lxp.encuesta_votos
          where post_id = any(${ids}) and usuario_id = ${userId}`
      : [];
    const opcionesPorPost = new Map<string, { id: string; texto: string; votos: number }[]>();
    for (const o of opts) {
      const arr = opcionesPorPost.get(o.post_id) ?? [];
      arr.push({ id: o.id, texto: o.texto, votos: o.votos });
      opcionesPorPost.set(o.post_id, arr);
    }
    const votoPorPost = new Map<string, string>();
    for (const v of misVotos) votoPorPost.set(v.post_id, v.opcion_id);

    // ── Ensambla los posts (unión discriminada) ──
    const posts: Post[] = filas.map((f) => {
      const base = {
        id: f.id,
        autor: persona(f),
        cuando: haceCuanto(f.created_at),
        reacciones: {
          top: topPorPost.get(f.id) ?? [],
          total: f.reac_total,
          mia: (f.mi_reaccion as TipoReaccion | null) ?? undefined,
        } as Reacciones,
        comentarios: f.n_comentarios,
        compartidos: f.compartidos,
        preview: previewPorPost.get(f.id) ?? [],
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
        const piezas = (Array.isArray(f.media) ? (f.media as { tipo?: string; url?: string }[]) : []).map((m) => ({
          tipo: (m.tipo === 'video' ? 'video' : 'imagen') as 'imagen' | 'video',
          src: typeof m.url === 'string' ? m.url : undefined,
        }));
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
      // 'texto' y 'anuncio_comunidad' → tarjeta de texto.
      return { ...base, tipo: 'texto', texto: f.cuerpo ?? f.vineta ?? f.titulo };
    });

    // ── Yo (perfil resumen) ──
    const yoFila = (
      await sql<{ nombre: string | null; rol: string | null; esp: string | null; sede: string | null }[]>`
        select nombre, rol::text as rol, especialidad as esp, sede
        from lxp.perfiles where user_id = ${userId}`
    )[0];
    const yoNombre = yoFila?.nombre ?? 'Usted';
    const colegasFilas = await sql<{ otro: string }[]>`
      select case when solicitante_id = ${userId} then receptor_id else solicitante_id end as otro
      from lxp.conexiones_ateneo
      where estado = 'colegas' and (solicitante_id = ${userId} or receptor_id = ${userId})`;
    const colegaIds = colegasFilas.map((c) => c.otro);
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

    // ── Sugerencias de colegas (personas con perfil, no conectadas conmigo) ──
    const sugFilas = await sql<{ user_id: string; nombre: string; rol: string; esp: string | null; sede: string | null; estado: string | null; casos: number; aportes: number; comunes: number }[]>`
      select pf.user_id, pf.nombre, pf.rol::text as rol, pf.especialidad as esp, pf.sede,
             (select estado::text from lxp.conexiones_ateneo cx
                where (cx.solicitante_id = ${userId} and cx.receptor_id = pf.user_id)
                   or (cx.receptor_id = ${userId} and cx.solicitante_id = pf.user_id)
                limit 1) as estado,
             (select count(*)::int from lxp.bitacora_casos b where b.id_alumno = pf.user_id) as casos,
             (select count(*)::int from lxp.comentarios_ateneo c where c.autor_id = pf.user_id) as aportes,
             (select count(*)::int from lxp.conexiones_ateneo m
                where m.estado = 'colegas'
                  and (m.solicitante_id = pf.user_id or m.receptor_id = pf.user_id)
                  and (case when m.solicitante_id = pf.user_id then m.receptor_id else m.solicitante_id end) = any(${colegaIds.length ? colegaIds : ['00000000-0000-0000-0000-000000000000']})
             ) as comunes
      from lxp.perfiles pf
      where pf.user_id <> ${userId} and pf.rol in ('alumno','docente')
      order by pf.nombre
      limit 8`;
    const sugerencias = sugFilas.map((s) => {
      const estadoConexion = s.estado === 'colegas' ? ('colegas' as const) : s.estado === 'pendiente' ? ('pendiente' as const) : ('ninguna' as const);
      const motivo = s.comunes > 0 ? `${s.comunes} colegas en común` : s.rol === 'docente' ? 'docente del campus' : 'del diplomado';
      return {
        id: s.user_id,
        ini: ini(s.nombre),
        nombre: s.nombre,
        rol: (STAFF_ROLES.has(s.rol) ? 'docente' : 'alumno') as Persona['rol'],
        meta: [s.esp, s.sede].filter(Boolean).join(' · ') || 'Campus Médica',
        colegas: 0,
        casos: s.casos,
        aportes: s.aportes,
        motivo,
        estadoConexion,
        enComun: s.comunes > 0 ? { total: s.comunes, inis: [] } : undefined,
      };
    });

    const colegasConPosts = new Set(filas.filter((f) => colegaIds.includes(f.autor_id)).map((f) => f.autor_id)).size;

    return {
      data: { yo, posts, misCasos, sugerencias, colegasConPosts },
      colegaIds,
    };
  });
}

function aCasoVacio(titulo: string): CasoBitacora {
  return { id: '', titulo: titulo || 'Estudio', area: 'Ultrasonido', organo: '—', dominio: '—', piezas: 0, loops: 0, fecha: '', validado: false };
}

import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { grupoDelAlumnoEnPrograma } from '@/lib/campus/inscripcion';
import { comoTareaConfig } from '@/lib/studio/tarea-contrato';
import { avataresDe } from '@/lib/campus/ateneo-social';
import { iniciales } from '@/components/avatar';
import type {
  Calificacion,
  Envio,
  ForoParticipado,
  Integrante,
  Modulo,
  Respuesta,
  Tarea,
} from './_components/curso';

/**
 * Lectura del interior del curso (alumno) · TODO con RLS vía `comoAlumno` (web→Supabase
 * directo, §2). `[id]` de la ruta = `programaId` (identidad del curso, igual que en
 * "Mis cursos"); la cohorte real del alumno se resuelve con `grupoDelAlumnoEnPrograma`
 * (inscripción CORA · §10).
 *
 * DISCIPLINA DE CABLEADO (§ del prompt): se conecta a datos reales SOLO lo que existe en
 * backend. Lo que NO existe (fechas de entrega, read-receipt de comentarios, niveles de
 * rúbrica con "nivel obtenido", portada/estado/luz por módulo como dato, presencia/última
 * conexión, roster de staff para el alumno, historial multi-envío) se rellena con estado
 * VACÍO/placeholder — nunca se finge persistencia. Ver la LISTA de pendientes en el reporte.
 */

/* ───────── contexto del curso (para la cabecera y el grupo destino) ───────── */
export type CursoCtx = {
  programaId: string;
  programa: string;
  grupoId: string | null;
  grupoNombre: string | null;
  contexto: string;
};

export async function getCursoCtx(userId: string, programaId: string): Promise<CursoCtx | null> {
  return comoAlumno(userId, async (sql) => {
    const pr = (
      await sql<{ nombre: string }[]>`
        select nombre from lxp.programas where id = ${programaId} and publicado limit 1`
    )[0];
    if (!pr) return null;
    const grupo = await grupoDelAlumnoEnPrograma(sql, userId, programaId);
    const contexto = [pr.nombre, grupo?.nombre].filter(Boolean).join(' · ');
    return {
      programaId,
      programa: pr.nombre,
      grupoId: grupo?.id ?? null,
      grupoNombre: grupo?.nombre ?? null,
      contexto,
    };
  });
}

/* ───────── Contenido · módulos + avance ───────── */
// Paleta de orígenes del degradado de la banda (cosmético, no es dato): distinto por módulo.
const LUCES = ['20% 0%', '88% 0%', '80% 100%', '50% 0%', '90% 10%', '12% 100%', '10% 90%', '60% 100%'];

export type ContenidoCurso = { avancePct: number; completos: number; modulos: Modulo[] };

export async function getContenido(userId: string, programaId: string): Promise<ContenidoCurso> {
  return comoAlumno(userId, async (sql) => {
    const mods = await sql<
      { id: string; nombre: string; orden: number; horas: number; lecciones: number; contenidos: number }[]
    >`
      select m.id, m.nombre, m.orden, m.horas::float8 as horas,
        (select count(*) from lxp.lecciones l where l.modulo_id = m.id)::int as lecciones,
        (select count(*) from lxp.contenidos co
           join lxp.lecciones l on l.id = co.leccion_id where l.modulo_id = m.id)::int as contenidos
      from lxp.modulos m
      join lxp.programas pr on pr.id = m.programa_id
      where m.programa_id = ${programaId} and pr.publicado
      order by m.orden, m.nombre`;

    const hechosPorMod = new Map(
      (
        await sql<{ modulo_id: string; hechos: number }[]>`
          select l.modulo_id, count(*) filter (where rp.completado)::int as hechos
          from lxp.reproduccion_progreso rp
          join lxp.contenidos co on co.id = rp.contenido_id
          join lxp.lecciones l on l.id = co.leccion_id
          join lxp.modulos m on m.id = l.modulo_id
          where rp.alumno_id = ${userId} and m.programa_id = ${programaId}
          group by l.modulo_id`
      ).map((r) => [r.modulo_id, r.hechos]),
    );

    let totalContenidos = 0;
    let totalHechos = 0;
    let primeraIncompleta = -1;
    const modulos: Modulo[] = mods.map((m, i) => {
      const total = m.contenidos;
      const hechos = Math.min(hechosPorMod.get(m.id) ?? 0, total);
      totalContenidos += total;
      totalHechos += hechos;
      const completado = total > 0 && hechos >= total;
      if (!completado && primeraIncompleta === -1) primeraIncompleta = i;
      const estado = completado ? 'completado' : hechos > 0 ? 'en-curso' : 'por-empezar';
      return {
        id: m.id,
        numero: i + 1,
        kicker: `Módulo ${i + 1}`,
        titulo: m.nombre,
        meta: `${m.horas} h · ${m.lecciones} ${m.lecciones === 1 ? 'lección' : 'lecciones'}`,
        hechos,
        total,
        estado,
        luz: LUCES[i % LUCES.length]!,
      } satisfies Modulo;
    });
    // El primer módulo no completado es "el actual" (borde teal + Continuar).
    if (primeraIncompleta >= 0 && modulos[primeraIncompleta]!.estado !== 'completado') {
      modulos[primeraIncompleta] = { ...modulos[primeraIncompleta]!, estado: 'actual' };
    }

    const completos = modulos.filter((m) => m.estado === 'completado').length;
    const avancePct = totalContenidos > 0 ? Math.round((100 * totalHechos) / totalContenidos) : 0;
    return { avancePct, completos, modulos };
  });
}

/* ───────── Tareas · lecciones tipo `tarea` + entrega del alumno ───────── */
type FilaTarea = {
  id: string;
  nombre: string;
  modulo: string;
  config: Record<string, unknown> | null;
  entrega_estado: string | null;
  nota: number | null;
  feedback: string | null;
  contenido: Record<string, unknown> | null;
};

export async function getTareas(userId: string, programaId: string): Promise<Tarea[]> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<FilaTarea[]>`
      select l.id, l.nombre, m.nombre as modulo, l.config,
             e.estado::text as entrega_estado, e.nota::float8 as nota, e.feedback, e.contenido
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      left join lxp.entregas e on e.leccion_id = l.id and e.id_alumno = ${userId}
      where m.programa_id = ${programaId} and pr.publicado and l.tipo = 'tarea'
      order by m.orden, l.orden, l.created_at`;

    return filas.map((f): Tarea => {
      const cfg = comoTareaConfig(f.config);
      const entregada = f.entrega_estado === 'enviada' || f.entrega_estado === 'calificada' || f.entrega_estado === 'devuelta';
      const calificada = f.entrega_estado === 'calificada' && f.nota != null;
      const tieneArchivo = !!(f.contenido && typeof f.contenido.archivo === 'object' && f.contenido.archivo);
      return {
        id: f.id,
        clave: f.modulo,
        descripcion: f.nombre,
        // Fechas de entrega: NO existen en el modelo (lecciones/actividades no las guardan).
        vence: '',
        ventana: '',
        estado: entregada ? 'enviada' : 'pendiente',
        envios: entregada ? 1 : 0,
        archivos: tieneArchivo ? 1 : 0,
        puntos: calificada ? f.nota ?? undefined : undefined,
        puntosMax: typeof cfg.valor === 'number' && cfg.valor > 0 ? cfg.valor : 10,
        // Sin read-receipt: solo sabemos si HAY feedback, no si se leyó.
        comentarios: f.feedback ? 'leidos' : 'ninguno',
      };
    });
  });
}

/* ───────── Historial de envíos · la entrega vigente del alumno por tarea ───────── */
// `lxp.entregas` es ÚNICA por (actividad/lección × alumno): no hay multi-envío ni
// versiones "reemplazadas". El historial muestra la entrega vigente como un envío.
export type HistorialCurso = {
  opciones: { value: string; label: string }[];
  seleccion: string | null;
  envios: Envio[];
  puntos: number | null;
  puntosMax: number;
};

export async function getHistorial(userId: string, programaId: string, leccionId?: string): Promise<HistorialCurso> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<
      {
        leccion_id: string;
        nombre: string;
        modulo: string;
        config: Record<string, unknown> | null;
        entrega_id: string | null;
        estado: string | null;
        nota: number | null;
        contenido: Record<string, unknown> | null;
        created_at: Date | null;
      }[]
    >`
      select l.id as leccion_id, l.nombre, m.nombre as modulo, l.config,
             e.id as entrega_id, e.estado::text as estado, e.nota::float8 as nota, e.contenido, e.created_at
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      join lxp.entregas e on e.leccion_id = l.id and e.id_alumno = ${userId}
      where m.programa_id = ${programaId} and pr.publicado and l.tipo = 'tarea'
      order by m.orden, l.orden`;

    const opciones = filas.map((f) => ({ value: f.leccion_id, label: `${f.modulo} · ${f.nombre}` }));
    const sel = filas.find((f) => f.leccion_id === leccionId) ?? filas[0] ?? null;
    if (!sel) return { opciones, seleccion: null, envios: [], puntos: null, puntosMax: 10 };

    const cfg = comoTareaConfig(sel.config);
    const archivo = sel.contenido && typeof sel.contenido.archivo === 'object' ? (sel.contenido.archivo as Record<string, unknown>) : null;
    const envios: Envio[] = sel.entrega_id
      ? [
          {
            id: sel.entrega_id.slice(0, 8),
            archivo: archivo && typeof archivo.nombre === 'string' ? archivo.nombre : sel.contenido && sel.contenido.texto ? 'Entrega de texto' : 'Entrega',
            // El peso del archivo no se guarda en `entregas` → vacío.
            peso: '',
            fecha: sel.created_at ? new Date(sel.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            estado: sel.estado === 'calificada' ? 'calificado' : 'recibido',
          },
        ]
      : [];
    return { opciones, seleccion: sel.leccion_id, envios, puntos: sel.nota, puntosMax: typeof cfg.valor === 'number' && cfg.valor > 0 ? cfg.valor : 10 };
  });
}

/* ───────── Foros · participación del alumno (hilos donde publicó) ───────── */
type FilaMsg = {
  actividad_id: string;
  leccion: string | null;
  modulo: string | null;
  msg_id: string;
  parent_id: string | null;
  autor_id: string;
  autor: string;
  rol: string;
  titulo: string | null;
  cuerpo: string;
  created_at: Date;
};

export async function getForos(userId: string, programaId: string, grupoId: string | null): Promise<ForoParticipado[]> {
  if (!grupoId) return [];
  return comoAlumno(userId, async (sql) => {
    // Actividades tipo foro del programa donde el alumno tiene al menos un mensaje (su grupo).
    const foros = await sql<{ actividad_id: string }[]>`
      select distinct fm.actividad_id
      from lxp.foro_mensajes fm
      join lxp.actividades a on a.id = fm.actividad_id
      join lxp.lecciones l on l.id = a.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where fm.autor_id = ${userId} and fm.grupo_id = ${grupoId} and m.programa_id = ${programaId}`;
    if (foros.length === 0) return [];
    const ids = foros.map((f) => f.actividad_id);

    const msgs = await sql<FilaMsg[]>`
      select fm.actividad_id, l.nombre as leccion, m.nombre as modulo,
             fm.id as msg_id, fm.parent_id, fm.autor_id, p.nombre as autor, p.rol::text as rol,
             fm.titulo, fm.cuerpo, fm.created_at
      from lxp.foro_mensajes fm
      join lxp.actividades a on a.id = fm.actividad_id
      join lxp.lecciones l on l.id = a.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.perfiles p on p.user_id = fm.autor_id
      where fm.actividad_id = any(${ids}) and fm.grupo_id = ${grupoId}
      order by fm.created_at`;

    const porForo = new Map<string, FilaMsg[]>();
    for (const msg of msgs) {
      const lista = porForo.get(msg.actividad_id) ?? [];
      lista.push(msg);
      porForo.set(msg.actividad_id, lista);
    }

    return ids.map((actividadId): ForoParticipado => {
      const lista = porForo.get(actividadId) ?? [];
      const miRaiz = lista.find((x) => x.autor_id === userId && !x.parent_id);
      const raiz = miRaiz ?? lista.find((x) => !x.parent_id);
      const respuestas = lista.filter((x) => x.parent_id);
      const cuando = raiz ? fechaRelativa(raiz.created_at) : '';
      // Hilo en cadena: raíz→respuesta = nivel 1; respuesta a respuesta = nivel 2.
      const idNivel = new Map<string, 0 | 1 | 2>();
      const hilo: Respuesta[] = respuestas.map((r) => {
        const nivelPadre = r.parent_id && idNivel.has(r.parent_id) ? idNivel.get(r.parent_id)! : 0;
        const nivel = (nivelPadre >= 1 ? 2 : 1) as 0 | 1 | 2;
        idNivel.set(r.msg_id, nivel);
        return {
          id: r.msg_id,
          ini: iniciales(r.autor),
          autor: r.autor,
          docente: r.rol === 'docente',
          texto: r.cuerpo,
          cuando: fechaRelativa(r.created_at),
          nivel,
        };
      });
      return {
        id: actividadId,
        leccion: [raiz?.modulo, raiz?.leccion].filter(Boolean).join(' · ') || 'Foro de la lección',
        titulo: raiz?.titulo ?? 'Foro de discusión',
        resumen: `${lista.filter((x) => !x.parent_id).length} publicación · ${respuestas.length} ${
          respuestas.length === 1 ? 'respuesta' : 'respuestas'
        }${cuando ? ` · ${cuando}` : ''}`,
        // "N nuevas" = respuestas sin leer: NO hay read-receipt en foro_mensajes → 0.
        nuevas: 0,
        miPublicacion: miRaiz ? { texto: miRaiz.cuerpo, cuando: fechaRelativa(miRaiz.created_at) } : undefined,
        hilo,
      };
    });
  });
}

/* ───────── Calificaciones · tareas calificadas + casos validados ───────── */
export async function getCalificaciones(userId: string, programaId: string): Promise<Calificacion[]> {
  return comoAlumno(userId, async (sql) => {
    // Tareas calificadas (entregas con nota asentada por el docente).
    const tareas = await sql<
      { leccion_id: string; nombre: string; modulo: string; config: Record<string, unknown> | null; nota: number; feedback: string | null }[]
    >`
      select l.id as leccion_id, l.nombre, m.nombre as modulo, l.config,
             e.nota::float8 as nota, e.feedback
      from lxp.entregas e
      join lxp.lecciones l on l.id = e.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      where e.id_alumno = ${userId} and m.programa_id = ${programaId}
        and e.estado = 'calificada' and e.nota is not null
      order by m.orden, l.orden`;

    // Casos de bitácora validados (aprobados) — cuentan horas, resultado "validado".
    const casos = await sql<
      { id: string; organo: string | null; horas: number; feedback: string | null }[]
    >`
      select bc.id, bc.organo, bc.horas_estimadas::float8 as horas,
             (select v.feedback from lxp.validaciones v where v.caso_id = bc.id order by v.created_at desc limit 1) as feedback
      from lxp.bitacora_casos bc
      where bc.id_alumno = ${userId} and bc.estado_validacion = 'aprobado'
      order by bc.created_at desc`;

    const out: Calificacion[] = [];
    for (const t of tareas) {
      const cfg = comoTareaConfig(t.config);
      const max = typeof cfg.valor === 'number' && cfg.valor > 0 ? cfg.valor : 10;
      const pct = Math.round((100 * t.nota) / max);
      out.push({
        id: `tarea-${t.leccion_id}`,
        clave: t.modulo,
        descripcion: t.nombre,
        tipo: 'tarea',
        puntos: `${t.nota} / ${max}`,
        resultado: `${pct}%`,
        comentario: t.feedback ?? undefined,
        tieneRubrica: !!cfg.rubricaId,
        tareaId: t.leccion_id,
      });
    }
    for (const c of casos) {
      out.push({
        id: `caso-${c.id}`,
        clave: 'Caso · Bitácora',
        descripcion: c.organo ?? 'Estudio validado',
        tipo: 'caso',
        puntos: `${c.horas} h`,
        resultado: 'validado',
        comentario: c.feedback ?? undefined,
      });
    }
    return out;
  });
}

/* ───────── Alumnos · roster del grupo (compañeros reales) ───────── */
// programaId/grupoId se aceptan por uniformidad con las otras secciones, pero el definer
// `roster_grupo_alumno()` resuelve el grupo por `auth.uid()` (no toma parámetros).
export async function getRoster(userId: string, _programaId: string, _grupoId: string | null): Promise<Integrante[]> {
  return comoAlumno(userId, async (sql) => {
    // Compañeros del grupo del alumno vía definer roster_grupo_alumno() (mig 0059):
    // devuelve (id, nombre, avatar_url). NO trae rol/sede/especialidad/última conexión.
    const filas = await sql<{ id: string; nombre: string; avatar_url: string | null }[]>`
      select id, nombre, avatar_url from lxp.roster_grupo_alumno()`;
    const avatares = await avataresDe(sql, filas.map((f) => f.id));
    return filas
      .filter((f) => f.id !== userId)
      .map((f): Integrante => ({
        id: f.id,
        ini: iniciales(f.nombre),
        nombre: f.nombre,
        rol: 'alumno',
        // sede/especialidad NO están en el definer del roster → detalle vacío.
        detalle: '',
        // presencia/última conexión: NO existen en el modelo → placeholder.
        enLinea: false,
        ultima: '',
        avatarUrl: avatares.get(f.id) ?? null,
      }));
  });
}

/* ───────── util ───────── */
function fechaRelativa(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'hace un momento';
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

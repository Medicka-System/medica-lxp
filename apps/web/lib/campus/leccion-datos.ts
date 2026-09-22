import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { comoTipoLeccion } from '@/lib/studio/leccion-tipos';
import { comoTipoBloqueTeoria } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/tipos-bloque';
import {
  esLeccionInteractiva,
  type AutoevalAlumno,
  type BloqueContenido,
  type BloqueTeoriaVista,
  type ConfigLeccion,
  type ContenidoCurso,
  type ContenidoTipo,
  type LeccionCompleta,
  type LeccionMenu,
  type LeccionVecina,
  type ModuloMenu,
  type ReactivoAlumno,
  type TipoLeccionAlumno,
  type TipoReactivoAlumno,
} from './leccion-contrato';

const TIPOS_REACTIVO: readonly TipoReactivoAlumno[] = [
  'opcion_multiple',
  'multi',
  'verdadero_falso',
  'abierta',
];

/**
 * Proyecta el `config` de una lección autoevaluación (modelo nuevo · mig 0023) a la
 * vista del ALUMNO: enunciado + opciones, SIN la clave correcta ni la retro (la
 * autocalificación es server-authoritative · §7A). Defensivo ante config crudo.
 */
export function autoevalDeConfig(
  config: Record<string, unknown> | null,
  yaRespondida: boolean,
): AutoevalAlumno {
  const c = (config ?? {}) as Record<string, unknown>;
  const crudos = Array.isArray(c.reactivos) ? (c.reactivos as unknown[]) : [];
  const reactivos: ReactivoAlumno[] = [];
  let puntosTotales = 0;
  for (const r of crudos) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id ? o.id : null;
    const enunciado = typeof o.enunciado === 'string' ? o.enunciado.trim() : '';
    if (!id || !enunciado) continue;
    const tipo: TipoReactivoAlumno = TIPOS_REACTIVO.includes(
      o.tipo as TipoReactivoAlumno,
    )
      ? (o.tipo as TipoReactivoAlumno)
      : 'opcion_multiple';
    const opciones = Array.isArray(o.opciones)
      ? (o.opciones as unknown[])
          .map((op) => {
            const oo = (op ?? {}) as Record<string, unknown>;
            return { clave: String(oo.clave ?? ''), texto: String(oo.texto ?? '') };
          })
          .filter((op) => op.clave || op.texto)
      : [];
    const puntajeRaw = Number(o.puntaje);
    const puntaje = Number.isFinite(puntajeRaw) && puntajeRaw > 0 ? puntajeRaw : 1;
    puntosTotales += puntaje;
    reactivos.push({
      id,
      tipo,
      enunciado,
      puntaje,
      imagen:
        typeof o.imagen === 'string' && o.imagen.trim() ? o.imagen.trim() : undefined,
      opciones,
    });
  }
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  return {
    descripcion: typeof c.descripcion === 'string' ? c.descripcion : undefined,
    reactivos,
    yaRespondida,
    puntosTotales,
    minutos: numOrNull(c.minutos) && (c.minutos as number) > 0 ? (c.minutos as number) : null,
    umbral: numOrNull(c.umbral) && (c.umbral as number) > 0 ? (c.umbral as number) : null,
    barajar: c.barajar === true,
    intentos: numOrNull(c.intentos) ?? 0,
    fechaApertura: strOrNull(c.fechaApertura),
    fechaCierre: strOrNull(c.fechaCierre),
    cuentaParaCalificacion: c.cuentaParaCalificacion === true,
    ultimoIntento: null, // lo rellena getLeccion con la última entrega (si la hay).
    sesion: null, // lo rellena getLeccion con la sesión de intento en curso (mig 0029).
  };
}

/**
 * Lectura de una lección (contenido + navegación). Corre con RLS vía `comoAlumno`:
 * lee lxp.contenidos/lecciones/modulos/programas (read = true) y solo el progreso
 * propio (reproduccion_progreso). Sin lógica de dominio (§2). Ver leccion-contrato
 * para el reparto REAL vs PENDIENTE (media/H5P/paquetes/xAPI).
 *
 * Modelo NUEVO (mig 0023): la lección tiene un `tipo`; los tipos interactivos
 * (h5p/xapi) guardan su contenido en `lecciones.config` (contentId / paquete). El
 * render del alumno enruta por `tipo`: los interactivos reproducen desde `config`; el
 * resto sigue mostrando los bloques de `lxp.contenidos` (modelo viejo, aún vivo).
 */
export async function getLeccion(
  userId: string,
  leccionId: string,
): Promise<LeccionCompleta | null> {
  return comoAlumno(userId, async (sql) => {
    const cab = await sql<
      {
        id: string;
        nombre: string;
        descripcion: string | null;
        tipo: TipoLeccionAlumno;
        config: Record<string, unknown> | null;
        modulo_id: string;
        modulo: string;
        programa_id: string;
        programa: string;
      }[]
    >`
      select
        l.id, l.nombre, l.descripcion, l.tipo::text as tipo, l.config,
        m.id as modulo_id, m.nombre as modulo,
        pr.id as programa_id, pr.nombre as programa
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where l.id = ${leccionId} and pr.publicado
      limit 1`;

    const leccion = cab[0];
    if (!leccion) return null;

    const contenidos = await sql<
      {
        id: string;
        tipo: ContenidoTipo;
        titulo: string;
        cuerpo: string | null;
        recurso_ref: string | null;
        completado: boolean;
      }[]
    >`
      select
        co.id, co.tipo, co.titulo, co.cuerpo, co.recurso_ref,
        coalesce(rp.completado, false) as completado
      from lxp.contenidos co
      left join lxp.reproduccion_progreso rp
        on rp.contenido_id = co.id and rp.alumno_id = ${userId}
      where co.leccion_id = ${leccionId}
      order by co.orden, co.created_at`;

    // Secuencia de lecciones del programa (orden módulo → lección) para vecinos.
    const secuencia = await sql<{ id: string; nombre: string }[]>`
      select l.id, l.nombre
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${leccion.programa_id}
      order by m.orden, l.orden, l.created_at`;

    const idx = secuencia.findIndex((s) => s.id === leccionId);
    const anterior: LeccionVecina | null = idx > 0 ? secuencia[idx - 1]! : null;
    const siguiente: LeccionVecina | null =
      idx >= 0 && idx < secuencia.length - 1 ? secuencia[idx + 1]! : null;

    const bloques: BloqueContenido[] = contenidos.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      titulo: c.titulo,
      cuerpo: c.cuerpo,
      recursoRef: c.recurso_ref,
      completado: c.completado,
    }));

    // Modelo NUEVO: tipo + config. Para h5p/xapi el contenido se reproduce desde la
    // config; la fila `lxp.contenidos` compat (que la ingesta crea) es solo el ancla
    // de progreso (su uuid lo exige POST /players/progreso → LRS).
    const tipo = comoTipoLeccion(leccion.tipo);
    const config = (leccion.config ?? {}) as ConfigLeccion;
    const interactivo = esLeccionInteractiva(tipo);
    const compat = interactivo ? contenidos.find((c) => c.tipo === tipo) ?? null : null;

    // Progreso ANCLADO A LA LECCIÓN (modelo nuevo · mig 0028): el candado de completado
    // para los tipos sin fila en contenidos (teoría/video/…). Persiste al recargar.
    const progLeccion = await sql<{ ok: boolean }[]>`
      select exists (
        select 1 from lxp.reproduccion_progreso
        where leccion_id = ${leccionId} and alumno_id = ${userId} and completado
      ) as ok`;
    const leccionCompletada = progLeccion[0]?.ok ?? false;

    // Autoevaluación (modelo nuevo): el examen vive en lecciones.config. ¿Ya hay un
    // intento? Se resuelve por la entrega anclada a la lección (leccion_id · mig 0026).
    let autoeval: AutoevalAlumno | null = null;
    let autoevalRespondida = false;
    if (leccion.tipo === 'autoevaluacion') {
      // Última entrega: da `yaRespondida` y el resumen del último intento (para la
      // variante "acreditada" de la portada · escalado + aprobado).
      const previa = await sql<{ contenido: Record<string, unknown> | null }[]>`
        select contenido from lxp.entregas
        where leccion_id = ${leccionId} and id_alumno = ${userId}
        order by created_at desc limit 1`;
      autoevalRespondida = previa.length > 0;
      autoeval = autoevalDeConfig(leccion.config, autoevalRespondida);
      const resumen =
        (previa[0]?.contenido as { resumen?: Record<string, unknown> } | null)?.resumen ?? null;
      if (resumen) {
        const escalado = typeof resumen.escalado === 'number' ? resumen.escalado : null;
        autoeval.ultimoIntento = {
          aprobado: resumen.aprobado === true,
          porcentaje: escalado !== null ? Math.round(escalado * 100) : null,
        };
      }
      // Sesión de intento en curso (timer persistido · mig 0029).
      const ses = await sql<{ iniciado_en: string }[]>`
        select iniciado_en from lxp.autoeval_sesiones
        where leccion_id = ${leccionId} and alumno_id = ${userId}`;
      autoeval.sesion = ses[0] ? { iniciadoEn: ses[0].iniciado_en } : null;
    }

    // Teoría (modelo NUEVO · mig 0023): sus bloques ordenables viven en `lxp.bloques`
    // (NO en `lxp.contenidos`). El lector los renderiza con BloqueTeoriaLector.
    let bloquesTeoria: BloqueTeoriaVista[] = [];
    if (tipo === 'teoria') {
      const filas = await sql<
        { id: string; tipo_bloque: string; config: Record<string, unknown> | null }[]
      >`
        select id, tipo_bloque, config
        from lxp.bloques
        where leccion_id = ${leccionId}
        order by orden, created_at`;
      bloquesTeoria = filas.flatMap((f) => {
        const tb = comoTipoBloqueTeoria(f.tipo_bloque);
        return tb ? [{ id: f.id, tipoBloque: tb, config: f.config ?? {} }] : [];
      });
    }

    return {
      id: leccion.id,
      nombre: leccion.nombre,
      descripcion: leccion.descripcion,
      tipo,
      config,
      contenidoId: compat?.id ?? null,
      contexto: {
        programaId: leccion.programa_id,
        programa: leccion.programa,
        moduloId: leccion.modulo_id,
        modulo: leccion.modulo,
      },
      bloques,
      bloquesTeoria,
      autoeval,
      anterior,
      siguiente,
      // Completada si hay progreso ANCLADO A LA LECCIÓN (mig 0028 · cualquier tipo) o,
      // por compatibilidad: el ancla compat (h5p/xapi), la entrega (autoeval) o todos
      // los bloques del modelo viejo vistos.
      completada:
        leccionCompletada ||
        (interactivo
          ? (compat?.completado ?? false)
          : leccion.tipo === 'autoevaluacion'
            ? autoevalRespondida
            : bloques.length > 0 && bloques.every((b) => b.completado)),
    };
  });
}

/**
 * Árbol del curso (módulos → lecciones) para el menú lateral de la lección (§5A ·
 * mock leccion-lectura). Lectura bajo RLS (`comoAlumno`): módulos/lecciones del
 * programa publicado + el progreso PROPIO. Una lección cuenta como completada si el
 * alumno registró progreso en algún contenido suyo (reproduccion_progreso) o entregó
 * la actividad anclada (entregas · tarea/autoevaluación) — el mismo modelo con el que
 * "Mis cursos" mueve el avance. Sin lógica de dominio (§2).
 */
export async function getContenidoCurso(
  userId: string,
  programaId: string,
  leccionActualId: string,
): Promise<ContenidoCurso | null> {
  return comoAlumno(userId, async (sql) => {
    const prog = await sql<{ nombre: string }[]>`
      select nombre from lxp.programas where id = ${programaId} and publicado limit 1`;
    if (!prog[0]) return null;

    const mods = await sql<{ id: string; nombre: string }[]>`
      select id, nombre from lxp.modulos
      where programa_id = ${programaId}
      order by orden, created_at`;

    const lecs = await sql<
      { id: string; modulo_id: string; nombre: string; tipo: TipoLeccionAlumno; completada: boolean }[]
    >`
      select
        l.id, l.modulo_id, l.nombre, l.tipo::text as tipo,
        (
          -- Progreso ANCLADO A LA LECCIÓN (modelo nuevo · mig 0028): cubre todos los
          -- tipos sin fila en contenidos (teoría/video/foro/…).
          exists (
            select 1 from lxp.reproduccion_progreso rp
            where rp.leccion_id = l.id and rp.alumno_id = ${userId} and rp.completado
          )
          -- Progreso por CONTENIDO (modelo viejo + ancla compat de h5p/xapi).
          or exists (
            select 1
            from lxp.reproduccion_progreso rp
            join lxp.contenidos co on co.id = rp.contenido_id
            where co.leccion_id = l.id and rp.alumno_id = ${userId} and rp.completado
          )
          -- Entrega (tarea / autoevaluación).
          or exists (
            select 1 from lxp.entregas e
            where e.leccion_id = l.id and e.id_alumno = ${userId}
          )
          -- Participación en el foro (posteó al menos un mensaje).
          or exists (
            select 1 from lxp.foro_mensajes fm
            where fm.leccion_id = l.id and fm.autor_id = ${userId}
          )
        ) as completada
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${programaId}
      order by m.orden, l.orden, l.created_at`;

    const modulos: ModuloMenu[] = mods.map((m) => {
      const lecciones: LeccionMenu[] = lecs
        .filter((l) => l.modulo_id === m.id)
        .map((l) => ({
          id: l.id,
          nombre: l.nombre,
          tipo: comoTipoLeccion(l.tipo),
          completada: l.completada,
          actual: l.id === leccionActualId,
        }));
      return {
        id: m.id,
        nombre: m.nombre,
        lecciones,
        actual: lecciones.some((l) => l.actual),
      };
    });

    return {
      programa: prog[0].nombre,
      modulos,
      total: lecs.length,
      hechas: lecs.filter((l) => l.completada).length,
    };
  });
}

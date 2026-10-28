import 'server-only';
import type { ResultadoAutoeval } from '@campus/shared';
import { comoAlumno } from '@/lib/db.server';
import { resolverCursoAlumno } from '@/lib/campus/herencia-alumno.server';
import { comoTipoLeccion } from '@/lib/studio/leccion-tipos';
import { normalizarImagen } from '@/lib/studio/autoeval-contrato';
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

/** Base del `api` (server-side). En docker la red interna es http://api:8000. */
function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
}

/**
 * Pregunta al `api` por el lanzador público del paquete descomprimido (Pieza 1 · §7).
 * El `api` es la autoridad de storage (convención del prefijo + existencia); el web solo
 * consume. Best-effort: ante cualquier fallo devuelve null y el lector se degrada.
 */
async function resolverLanzadorPaquete(
  contenidoId: string,
  entryPoint: string,
): Promise<{ lanzadorUrl: string; listo: boolean } | null> {
  try {
    const url = `${apiBase()}/paquetes/${encodeURIComponent(contenidoId)}/lanzador?entry=${encodeURIComponent(entryPoint)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as { lanzadorUrl: string; listo: boolean };
  } catch {
    return null;
  }
}

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
      ayuda: typeof o.ayuda === 'string' && o.ayuda.trim() ? o.ayuda.trim() : undefined,
      puntaje,
      imagen: normalizarImagen(o.imagen),
      opciones,
    });
  }
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  return {
    descripcion: typeof c.descripcion === 'string' ? c.descripcion : undefined,
    promesa: typeof c.promesa === 'string' ? c.promesa : undefined,
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
    intentoPrevio: null, // lo rellena getLeccion con el resultado detallado de la última entrega.
  };
}

/**
 * Fusiona bloques PROPIOS del grupo en la base HEREDADA (ya ordenada), por posición: cada
 * propio va DESPUÉS de su ancla (`despuesDe`, id de la base); ancla NULL/inexistente → al
 * inicio; entre propios con la misma ancla, por `orden`. Espeja `fusionarPosicion` del motor
 * (@campus/shared) — misma copia local que el temario del Studio (datos.ts) para no exportar
 * una interna del motor. No muta la base.
 */
function fusionarPosBloques<T extends { id: string; orden: number; despuesDe: string | null }>(
  base: T[],
  propios: T[],
): T[] {
  if (propios.length === 0) return base;
  const idsBase = new Set(base.map((b) => b.id));
  const cmp = (a: T, b: T): number => a.orden - b.orden || a.id.localeCompare(b.id);
  const alInicio: T[] = [];
  const porAncla = new Map<string, T[]>();
  for (const p of propios) {
    if (p.despuesDe === null || !idsBase.has(p.despuesDe)) alInicio.push(p);
    else {
      const arr = porAncla.get(p.despuesDe) ?? [];
      arr.push(p);
      porAncla.set(p.despuesDe, arr);
    }
  }
  alInicio.sort(cmp);
  for (const arr of porAncla.values()) arr.sort(cmp);
  const out: T[] = [...alInicio];
  for (const b of base) {
    out.push(b);
    const despues = porAncla.get(b.id);
    if (despues) out.push(...despues);
  }
  return out;
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

    // Herencia del grupo: una lección OCULTA para su grupo no es accesible (ni por URL
    // directa) y la navegación solo salta entre lecciones VISIBLES (§6). Igual con el
    // gating por fecha: una lección de un módulo BLOQUEADO (fecha futura, solo síncrono)
    // no se abre ni tecleando la URL — bloqueo real, no solo visual.
    const resuelto = await resolverCursoAlumno(sql, userId, leccion.programa_id);
    if (resuelto && !resuelto.leccionesVisibles.has(leccion.id)) return null;
    if (resuelto && resuelto.leccionesBloqueadas.has(leccion.id)) return null;

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
    const secuenciaCruda = await sql<{ id: string; nombre: string }[]>`
      select l.id, l.nombre
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${leccion.programa_id}
      order by m.orden, l.orden, l.created_at`;
    // Vecinos solo entre lecciones visibles Y NO bloqueadas por fecha (sin overrides/
    // calendario = todas). No se navega hacia un módulo aún no liberado.
    const secuencia = resuelto
      ? secuenciaCruda.filter((s) => resuelto.leccionesVisibles.has(s.id) && !resuelto.leccionesBloqueadas.has(s.id))
      : secuenciaCruda;

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
    // Reemplazo de FUENTE por grupo (Paso 4b): si el grupo del alumno overrideó la fuente de
    // ESTA lección (video · entidad 'leccion_config'), se overlaya sobre config (fuente ya
    // resuelta). Sin override → igual que el programa. Overrides ya vienen en `resuelto`.
    const overrideConfig = resuelto?.overridesFuente.leccionConfig.get(leccion.id);
    const config = { ...((leccion.config ?? {}) as ConfigLeccion), ...(overrideConfig ?? {}) } as ConfigLeccion;
    const interactivo = esLeccionInteractiva(tipo);
    const compat = interactivo ? contenidos.find((c) => c.tipo === tipo) ?? null : null;

    // Lanzador del paquete SCORM/xAPI (Pieza 1 · §7): el `api` resuelve la URL PÚBLICA del
    // entryPoint descomprimido + si la extracción del worker ya terminó (`listo` derivado de
    // STORAGE, sin flag en BD). Best-effort: si el api no responde, el lector se degrada a
    // "procesando" con dignidad (§2). Solo para paquetes (tienen `paqueteRef` + `entryPoint`).
    if (config.paqueteRef && config.entryPoint) {
      const idPaquete = config.contenidoId ?? compat?.id ?? null;
      if (idPaquete) {
        const lanzador = await resolverLanzadorPaquete(idPaquete, config.entryPoint);
        if (lanzador) {
          config.lanzadorUrl = lanzador.lanzadorUrl;
          config.paqueteListo = lanzador.listo;
        }
      }
    }

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
      // Última entrega: alimenta `ultimoIntento` (portada acreditada · %, correctas,
      // envío, duración, intentos hechos). El nº de intento vive en el resumen (el api
      // hace upsert: 1 fila por alumno/actividad).
      const previa = await sql<{ contenido: Record<string, unknown> | null; created_at: string }[]>`
        select contenido, created_at from lxp.entregas
        where leccion_id = ${leccionId} and id_alumno = ${userId}
        order by created_at desc limit 1`;
      autoevalRespondida = previa.length > 0;
      autoeval = autoevalDeConfig(leccion.config, autoevalRespondida);
      const contenido = (previa[0]?.contenido ?? null) as {
        respuestas?: Record<string, string | string[]>;
        resultados?: unknown[];
        resumen?: Record<string, unknown>;
      } | null;
      const resumen = contenido?.resumen ?? null;
      if (resumen) {
        const escalado = typeof resumen.escalado === 'number' ? resumen.escalado : null;
        const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
        autoeval.ultimoIntento = {
          aprobado: resumen.aprobado === true,
          porcentaje: escalado !== null ? Math.round(escalado * 100) : null,
          correctas: n(resumen.correctas),
          objetivas: n(resumen.objetivas),
          enviadoEn: previa[0]?.created_at ? new Date(previa[0].created_at).toISOString() : null,
          duracionSeg: typeof resumen.duracionSeg === 'number' ? resumen.duracionSeg : null,
          intentosHechos: typeof resumen.intentos === 'number' ? resumen.intentos : 1,
        };
        // Resultado detallado (para "Ver el intento anterior" · portada acreditada).
        if (Array.isArray(contenido?.resultados) && contenido.resultados.length > 0) {
          const resultados = contenido.resultados as ResultadoAutoeval['resultados'];
          const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
          autoeval.intentoPrevio = {
            resultado: {
              resultados,
              totalReactivos: resultados.length,
              objetivas: n(resumen.objetivas),
              correctas: n(resumen.correctas),
              abiertas: n(resumen.abiertas),
              puntajeMax: n(resumen.puntajeMax),
              puntajeObtenido: n(resumen.puntajeObtenido),
              escalado: typeof resumen.escalado === 'number' ? resumen.escalado : null,
              aprobado: resumen.aprobado === true,
            },
            respuestas: (contenido?.respuestas ?? {}) as Record<string, string | string[]>,
          };
        }
      }
      // Sesión de intento en curso (timer persistido · mig 0029).
      const ses = await sql<{ iniciado_en: string }[]>`
        select iniciado_en from lxp.autoeval_sesiones
        where leccion_id = ${leccionId} and alumno_id = ${userId}`;
      autoeval.sesion = ses[0] ? { iniciadoEn: ses[0].iniciado_en } : null;
    }

    // Teoría (modelo NUEVO · mig 0023): sus bloques ordenables viven en `lxp.bloques`
    // (NO en `lxp.contenidos`). El lector los renderiza con BloqueTeoriaLector.
    //
    // Copy-on-write por grupo (Paso 1): además de los bloques HEREDADOS (grupo_id NULL) se
    // bajan los PROPIOS del grupo del alumno (grupo_id = su grupo) y se FUSIONAN por posición
    // (`despues_de`), igual que el temario. La RLS `bloques_grupo_aislado` (etapa 1) ya impide
    // ver lo propio de OTRO grupo; el filtro explícito lo vuelve determinista y permite separar
    // heredado/propio para el merge. El bloque propio es fila real → su progreso ancla directo.
    let bloquesTeoria: BloqueTeoriaVista[] = [];
    if (tipo === 'teoria') {
      const filas = await sql<
        {
          id: string;
          tipo_bloque: string;
          config: Record<string, unknown> | null;
          grupo_id: string | null;
          orden: number;
          despues_de: string | null;
          reemplaza_a: string | null;
        }[]
      >`
        select id, tipo_bloque, config, grupo_id, orden, despues_de, reemplaza_a
        from lxp.bloques
        where leccion_id = ${leccionId}
          and (grupo_id is null or grupo_id = ${resuelto?.grupoId ?? null})
        order by orden, created_at`;
      const aFila = (f: (typeof filas)[number]) => ({
        id: f.id,
        orden: f.orden,
        despuesDe: f.despues_de,
        tipoBloque: f.tipo_bloque,
        config: f.config,
      });
      // Copy-on-write por bloque (Paso 4): un propio con `reemplaza_a` SUPRIME al heredado y lo
      // sustituye en su posición; el resto de la lección sigue heredando. El leccion_id no cambia.
      const reemplazados = new Set(
        filas.filter((f) => f.grupo_id !== null && f.reemplaza_a).map((f) => f.reemplaza_a as string),
      );
      const base = filas.filter((f) => f.grupo_id === null && !reemplazados.has(f.id)).map(aFila);
      const propios = filas.filter((f) => f.grupo_id !== null).map(aFila);
      bloquesTeoria = fusionarPosBloques(base, propios).flatMap((f) => {
        const tb = comoTipoBloqueTeoria(f.tipoBloque);
        if (!tb) return [];
        // Reemplazo de FUENTE por grupo (Paso 4b): si este bloque fue overrideado por el
        // grupo (entidad 'bloque'), se overlaya la fuente resuelta sobre su config. Sin
        // override → config del programa. Los overrides ya vienen en `resuelto`.
        const over = resuelto?.overridesFuente.bloque.get(f.id);
        const config = over ? { ...(f.config ?? {}), ...over } : (f.config ?? {});
        return [{ id: f.id, tipoBloque: tb, config }];
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

    // Herencia del grupo: el menú no muestra módulos/lecciones ocultos (§6).
    const resuelto = await resolverCursoAlumno(sql, userId, programaId);

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

    // Fuera del menú del lector: módulos/lecciones ocultos y los BLOQUEADOS por fecha
    // (no son navegables — el alumno los ve bloqueados en la grilla del curso, no aquí).
    const modsVis = resuelto
      ? mods.filter((m) => resuelto.modulosVisibles.has(m.id) && !resuelto.modulosBloqueados.has(m.id))
      : mods;
    const lecsVis = resuelto
      ? lecs.filter((l) => resuelto.leccionesVisibles.has(l.id) && !resuelto.leccionesBloqueadas.has(l.id))
      : lecs;

    const modulos: ModuloMenu[] = modsVis.map((m) => {
      const lecciones: LeccionMenu[] = lecsVis
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
      total: lecsVis.length,
      hechas: lecsVis.filter((l) => l.completada).length,
    };
  });
}

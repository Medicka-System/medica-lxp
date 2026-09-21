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
  type ContenidoTipo,
  type LeccionCompleta,
  type LeccionVecina,
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
    reactivos.push({
      id,
      tipo,
      enunciado,
      imagen:
        typeof o.imagen === 'string' && o.imagen.trim() ? o.imagen.trim() : undefined,
      opciones,
    });
  }
  return {
    descripcion: typeof c.descripcion === 'string' ? c.descripcion : undefined,
    reactivos,
    yaRespondida,
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

    // Autoevaluación (modelo nuevo): el examen vive en lecciones.config. ¿Ya hay un
    // intento? Se resuelve por la entrega anclada a la lección (leccion_id · mig 0026).
    let autoeval: AutoevalAlumno | null = null;
    let autoevalRespondida = false;
    if (leccion.tipo === 'autoevaluacion') {
      const previa = await sql<{ existe: boolean }[]>`
        select exists (
          select 1 from lxp.entregas
          where leccion_id = ${leccionId} and id_alumno = ${userId}
        ) as existe`;
      autoevalRespondida = previa[0]?.existe ?? false;
      autoeval = autoevalDeConfig(leccion.config, autoevalRespondida);
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
      // Interactivos (h5p/xapi): completada = progreso del ancla compat. Autoeval:
      // completada si ya hay un intento registrado. El resto: todos sus bloques listos.
      completada: interactivo
        ? (compat?.completado ?? false)
        : leccion.tipo === 'autoevaluacion'
          ? autoevalRespondida
          : bloques.length > 0 && bloques.every((b) => b.completado),
    };
  });
}

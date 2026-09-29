import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { firmarLecturaImagenes } from '@/lib/media/firmar-imagenes.server';
import type {
  AlumnoSeguimiento,
  ConteosAlumnos,
  EstadoGrupo,
  GrupoDetalleSeguimiento,
  GrupoSeguimientoCard,
  ResumenKpi,
} from './contrato';

/**
 * Lecturas de la sección Grupos del DOCENTE (§5B). TODAS corren bajo RLS vía `comoStaff`
 * (las policies deciden qué ve el docente). El roster viene del puente SECDEF de CORA
 * (`cora_alumnos_de_grupo`, gated a staff · §10); el avance/casos/entregas/competencia
 * salen del progreso real del alumno bajo RLS. Nada se escribe en `public`.
 *
 * Mismo patrón que el Studio del admin (`lib/studio/datos.ts` · getGrupoAlumnos): en el
 * Sprint 11 solo cambia la FUENTE del roster (CORA real en vez del seed) — estas queries
 * quedan idénticas.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

type Sql = Parameters<Parameters<typeof comoStaff>[1]>[0];

/**
 * Reglas de riesgo (umbrales). Hoy constantes; a futuro migran a la config del súper
 * admin (§7A: "reglas configurables en el servidor"). Cambiar aquí es cambiarlas en todo
 * el seguimiento (listado + detalle) — fuente única.
 */
const REGLAS_RIESGO = {
  /** Días sin actividad para marcar "sin-actividad". */
  diasSinActividad: 7,
  /** Casos rechazados (acumulados) para marcar "casos-rechazados". */
  casosRechazados: 1,
} as const;

/** Iniciales de un nombre para el avatar (mismo criterio que el resto del Studio). */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter((p) => !/^(dr|dra|dr\.|dra\.)$/i.test(p));
  const base = partes.length ? partes : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((p) => p[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}

/** Etiqueta corta de módulo: "M03 · Interpretación renal" (el UI parte por " · "). */
function etiquetaModulo(clave: string, nombre: string): string {
  return `${clave} · ${nombre}`;
}

/** ¿Nota reprobatoria? Normaliza escala 0-10 vs 0-100 (el seed usa ambas · §5C). */
function esReprobatoria(nota: number): boolean {
  return nota <= 10 ? nota < 6 : nota < 60;
}

// ── Métricas por alumno (set-based sobre el roster de un grupo) ──────────────────
type MetricaAlumno = {
  completadas: number;
  ultimaActividad: Date | null;
  moduloClave: string | null;
  casosSubidos: number;
  casosValidados: number;
  casosRechazados: number;
  entregadas: number;
  reprobando: boolean;
  competencia: number | null;
};

/**
 * Calcula las métricas de seguimiento de un conjunto de alumnos (el roster de un grupo)
 * en pocas queries set-based. `programaId` acota el avance/entregables al programa del
 * grupo; los casos se cuentan por alumno (su cohorte es única).
 */
async function metricasAlumnos(
  sql: Sql,
  programaId: string,
  moduloDe: Map<string, { clave: string; label: string }>,
  alumnoIds: string[],
): Promise<Map<string, MetricaAlumno>> {
  const vacio = new Map<string, MetricaAlumno>();
  if (alumnoIds.length === 0) return vacio;

  // 1) Lecciones completadas + última actividad de progreso, por alumno.
  const progreso = await sql<
    { alumno_id: string; completadas: number; ult: Date | null }[]
  >`
    select rp.alumno_id,
           count(distinct rp.leccion_id) filter (where rp.completado)::int as completadas,
           max(rp.actualizado_en) as ult
    from lxp.reproduccion_progreso rp
    join lxp.lecciones l on l.id = rp.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId} and rp.alumno_id in ${sql(alumnoIds)}
    group by rp.alumno_id`;

  // 2) Módulo más avanzado (por orden) con al menos una lección completada, por alumno.
  const furthest = await sql<{ alumno_id: string; modulo_id: string }[]>`
    select distinct on (rp.alumno_id) rp.alumno_id, m.id as modulo_id
    from lxp.reproduccion_progreso rp
    join lxp.lecciones l on l.id = rp.leccion_id
    join lxp.modulos m on m.id = l.modulo_id
    where m.programa_id = ${programaId} and rp.completado and rp.alumno_id in ${sql(alumnoIds)}
    order by rp.alumno_id, m.orden desc, l.orden desc`;
  const moduloAlumno = new Map(furthest.map((f) => [f.alumno_id, f.modulo_id]));

  // 3) Casos por alumno (subidos / validados / rechazados) + última actividad.
  const casos = await sql<
    {
      id_alumno: string;
      subidos: number;
      validados: number;
      rechazados: number;
      ult: Date | null;
    }[]
  >`
    select c.id_alumno,
           count(*)::int as subidos,
           count(*) filter (where c.estado_validacion = 'aprobado')::int as validados,
           count(*) filter (where c.estado_validacion = 'rechazado')::int as rechazados,
           max(c.updated_at) as ult
    from lxp.bitacora_casos c
    where c.id_alumno in ${sql(alumnoIds)}
    group by c.id_alumno`;
  const casoPor = new Map(casos.map((c) => [c.id_alumno, c]));

  // 4) Entregas por alumno: cuántas distintas + si alguna calificada reprueba + actividad.
  const entregas = await sql<
    { id_alumno: string; entregadas: number; ult: Date | null; peor: number | null }[]
  >`
    select e.id_alumno,
           count(distinct coalesce(e.leccion_id, e.actividad_id))::int as entregadas,
           max(e.updated_at) as ult,
           min(e.nota) filter (where e.estado = 'calificada')::float8 as peor
    from lxp.entregas e
    where e.id_alumno in ${sql(alumnoIds)}
    group by e.id_alumno`;
  const entregaPor = new Map(entregas.map((e) => [e.id_alumno, e]));

  // 5) Competencia I-AIM media (0..100), por alumno (la escribe el worker · §8).
  const comp = await sql<{ id_alumno: string; nivel: number }[]>`
    select id_alumno, round(avg(nivel))::int as nivel
    from lxp.competencia_dominios
    where id_alumno in ${sql(alumnoIds)}
    group by id_alumno`;
  const compPor = new Map(comp.map((c) => [c.id_alumno, c.nivel]));

  const out = new Map<string, MetricaAlumno>();
  for (const id of alumnoIds) {
    const p = progreso.find((x) => x.alumno_id === id);
    const c = casoPor.get(id);
    const e = entregaPor.get(id);
    const modId = moduloAlumno.get(id);
    const mod = modId ? moduloDe.get(modId) : undefined;
    // Última actividad = lo más reciente entre progreso, casos y entregas.
    const fechas = [p?.ult, c?.ult, e?.ult].filter((d): d is Date => d instanceof Date);
    const ult = fechas.length ? new Date(Math.max(...fechas.map((d) => d.getTime()))) : null;
    out.set(id, {
      completadas: p?.completadas ?? 0,
      ultimaActividad: ult,
      moduloClave: mod?.label ?? null,
      casosSubidos: c?.subidos ?? 0,
      casosValidados: c?.validados ?? 0,
      casosRechazados: c?.rechazados ?? 0,
      entregadas: e?.entregadas ?? 0,
      reprobando: e?.peor != null ? esReprobatoria(e.peor) : false,
      competencia: compPor.get(id) ?? null,
    });
  }
  return out;
}

/** Días completos transcurridos desde una fecha (null = nunca). */
function diasDesde(fecha: Date | null, ahora: number): number | null {
  if (!fecha) return null;
  return Math.max(0, Math.floor((ahora - fecha.getTime()) / DIA_MS));
}

/** Texto humano de última actividad ("activo hoy" / "sin actividad hace N días"). */
function textoActividad(dias: number | null): string {
  if (dias === null) return 'nunca ha entrado al campus';
  if (dias === 0) return 'activo hoy';
  if (dias === 1) return 'activo ayer';
  if (dias < REGLAS_RIESGO.diasSinActividad) return `activo hace ${dias} días`;
  return `sin actividad hace ${dias} días`;
}

/** Deriva la señal de riesgo (el motivo en palabras) o `null` si va al día. */
function senalDe(m: MetricaAlumno, dias: number | null): AlumnoSeguimiento['senal'] {
  const sinActividad = dias === null || dias >= REGLAS_RIESGO.diasSinActividad;
  const rechazado = m.casosRechazados >= REGLAS_RIESGO.casosRechazados;

  if (sinActividad) {
    const base = dias === null ? 'Nunca ha entrado al campus' : `Sin actividad hace ${dias} días`;
    const motivo = rechazado ? `${base} · ${m.casosRechazados} casos rechazados` : base;
    return { tipo: 'sin-actividad', motivo };
  }
  if (rechazado) {
    return {
      tipo: 'casos-rechazados',
      motivo: `${m.casosRechazados} ${m.casosRechazados === 1 ? 'caso rechazado' : 'casos rechazados'}`,
    };
  }
  if (m.reprobando) {
    return { tipo: 'reprobando', motivo: 'Reprobó una evaluación' };
  }
  return null;
}

/** Roster + señales de un grupo (base de listado y detalle). */
async function alumnosDeGrupo(
  sql: Sql,
  grupo: { programaId: string; coraGrupoId: string | null },
): Promise<{
  alumnos: AlumnoSeguimiento[];
  totalLecciones: number;
  totalEntregables: number;
  avatarRefs: Map<string, string>;
}> {
  const vacio = { alumnos: [], totalLecciones: 0, totalEntregables: 0, avatarRefs: new Map<string, string>() };
  if (!grupo.coraGrupoId) return vacio;

  // Roster desde CORA (solo staff obtiene filas · §10).
  const roster = await sql<{ supabase_auth_id: string; nombre: string; matricula: string | null }[]>`
    select supabase_auth_id, nombre, matricula
    from lxp.cora_alumnos_de_grupo(${grupo.coraGrupoId})`;
  if (roster.length === 0) return vacio;

  // Avatares del roster: `cora_alumnos_de_grupo` no trae `avatar_url`; se lee de
  // `lxp.perfiles` bajo la misma RLS de staff. Se firma DESPUÉS de cerrar la tx (en el
  // detalle) para no sostener la conexión durante el fetch al `api` (patrón getShellData).
  const rosterIds = roster.map((r) => r.supabase_auth_id);
  const avatarRows = await sql<{ user_id: string; avatar_url: string | null }[]>`
    select user_id, avatar_url from lxp.perfiles where user_id in ${sql(rosterIds)}`;
  const avatarRefs = new Map<string, string>();
  for (const a of avatarRows) if (a.avatar_url) avatarRefs.set(a.user_id, a.avatar_url);

  // Módulos del programa (para etiquetas y para el denominador del avance).
  const modulos = await sql<{ id: string; nombre: string; orden: number }[]>`
    select id, nombre, orden from lxp.modulos
    where programa_id = ${grupo.programaId} order by orden, created_at`;
  const moduloDe = new Map(
    modulos.map((m, i) => [
      m.id,
      { clave: `M${String(i + 1).padStart(2, '0')}`, label: etiquetaModulo(`M${String(i + 1).padStart(2, '0')}`, m.nombre) },
    ]),
  );

  // Denominadores: total de lecciones y total de entregables (tarea/autoevaluación).
  const totales = (
    await sql<{ total: number; entregables: number }[]>`
      select count(*)::int as total,
             count(*) filter (where l.tipo in ('tarea', 'autoevaluacion'))::int as entregables
      from lxp.lecciones l
      join lxp.modulos m on m.id = l.modulo_id
      where m.programa_id = ${grupo.programaId}`
  )[0] ?? { total: 0, entregables: 0 };

  const ids = roster.map((r) => r.supabase_auth_id);
  const metricas = await metricasAlumnos(sql, grupo.programaId, moduloDe, ids);
  const ahora = Date.now();
  const primerModulo = modulos[0] ? moduloDe.get(modulos[0].id)?.label ?? null : null;

  const alumnos = roster.map((r): AlumnoSeguimiento => {
    const m = metricas.get(r.supabase_auth_id)!;
    const dias = diasDesde(m.ultimaActividad, ahora);
    const senal = senalDe(m, dias);
    return {
      id: r.supabase_auth_id,
      iniciales: iniciales(r.nombre),
      // Se firma en el caller (detalle) tras cerrar la tx; en el listado no se renderiza.
      avatarUrl: null,
      nombre: r.nombre,
      matricula: r.matricula,
      moduloEnCurso: m.moduloClave ?? primerModulo,
      avance: totales.total > 0 ? Math.round((100 * m.completadas) / totales.total) : 0,
      casosSubidos: m.casosSubidos,
      casosValidados: m.casosValidados,
      casosRechazados: m.casosRechazados,
      entregas: `${m.entregadas} / ${totales.entregables}`,
      competencia: m.competencia,
      ultimaActividad: textoActividad(dias),
      sinActividad: dias === null || dias >= REGLAS_RIESGO.diasSinActividad,
      senal,
    };
  });

  // Ordena: primero los que tienen señal (riesgo arriba), luego por avance ascendente.
  alumnos.sort((a, b) => {
    if (!!a.senal !== !!b.senal) return a.senal ? -1 : 1;
    return a.avance - b.avance;
  });

  return { alumnos, totalLecciones: totales.total, totalEntregables: totales.entregables, avatarRefs };
}

/** Estado del grupo a partir de su riesgo (regla determinista, documentada). */
function estadoGrupo(enRiesgo: number, algunSinActividad: boolean): EstadoGrupo {
  if (enRiesgo === 0) return 'al-dia';
  if (enRiesgo >= 3 || algunSinActividad) return 'requiere-atencion';
  return 'con-rezago';
}

/** Módulo "en curso" del grupo = el más avanzado alcanzado por algún alumno. */
function moduloEnCursoGrupo(alumnos: AlumnoSeguimiento[]): string | null {
  let mejor: string | null = null;
  for (const a of alumnos) {
    if (a.moduloEnCurso && (!mejor || a.moduloEnCurso > mejor)) mejor = a.moduloEnCurso;
  }
  return mejor;
}

/** Desglose del riesgo en palabras (o la declaración explícita del grupo sano). */
function resumenRiesgo(alumnos: AlumnoSeguimiento[], activosSemana: number): string {
  const sin = alumnos.filter((a) => a.senal?.tipo === 'sin-actividad').length;
  const rep = alumnos.filter((a) => a.senal?.tipo === 'reprobando').length;
  const rec = alumnos.filter((a) => a.senal?.tipo === 'casos-rechazados').length;
  if (sin + rep + rec === 0) {
    return `Nadie requiere intervención · ${activosSemana} de ${alumnos.length} entraron esta semana.`;
  }
  const partes: string[] = [];
  if (sin) partes.push(`${sin} sin actividad`);
  if (rep) partes.push(`${rep} reprobando`);
  if (rec) partes.push(`${rec} con casos rechazados`);
  return partes.join(', ');
}

// ── Listado de grupos del docente (con seguimiento real) ────────────────────────
export async function getGruposSeguimiento(userId: string): Promise<GrupoSeguimientoCard[]> {
  return comoStaff(userId, async (sql) => {
    const grupos = await sql<
      {
        id: string;
        nombre: string;
        modalidad: 'sincrono' | 'asincrono';
        fecha_inicio: Date | null;
        programa_id: string;
        programa: string;
        cora_grupo_id: string | null;
      }[]
    >`
      select g.id, g.nombre, g.modalidad, g.fecha_inicio,
             g.programa_id, p.nombre as programa, g.cora_grupo_id
      from lxp.grupos g
      join lxp.programas p on p.id = g.programa_id
      where g.docente_id = ${userId}
      order by g.fecha_inicio desc nulls last, g.created_at desc`;

    const cards: GrupoSeguimientoCard[] = [];
    for (const g of grupos) {
      const { alumnos } = await alumnosDeGrupo(sql, {
        programaId: g.programa_id,
        coraGrupoId: g.cora_grupo_id,
      });
      const enRiesgo = alumnos.filter((a) => a.senal).length;
      const algunSinActividad = alumnos.some((a) => a.senal?.tipo === 'sin-actividad');
      const activosSemana = alumnos.filter((a) => !a.sinActividad).length;
      const avance = alumnos.length
        ? Math.round(alumnos.reduce((s, a) => s + a.avance, 0) / alumnos.length)
        : 0;

      // Colas de revisión del grupo (por su cora_grupo_id vía roster).
      const ids = alumnos.map((a) => a.id);
      const [casos, entregas] = ids.length
        ? await Promise.all([
            sql<{ n: number }[]>`
              select count(*)::int as n from lxp.bitacora_casos
              where id_alumno in ${sql(ids)} and estado_validacion = 'pendiente'`,
            sql<{ n: number }[]>`
              select count(*)::int as n from lxp.entregas
              where id_alumno in ${sql(ids)} and estado = 'enviada'`,
          ])
        : [[{ n: 0 }], [{ n: 0 }]];

      cards.push({
        id: g.id,
        nombre: g.nombre,
        programa: g.programa,
        modalidad: g.modalidad,
        fechaInicio: g.fecha_inicio,
        moduloEnCurso: moduloEnCursoGrupo(alumnos),
        alumnos: alumnos.length,
        avance,
        enRiesgo,
        estado: estadoGrupo(enRiesgo, algunSinActividad),
        resumenRiesgo: resumenRiesgo(alumnos, activosSemana),
        casosPorRevisar: casos[0]?.n ?? 0,
        entregasPorRevisar: entregas[0]?.n ?? 0,
      });
    }
    // Los grupos que requieren atención primero (el trabajo real arriba).
    const peso: Record<EstadoGrupo, number> = { 'requiere-atencion': 0, 'con-rezago': 1, 'al-dia': 2 };
    cards.sort((a, b) => peso[a.estado] - peso[b.estado]);
    return cards;
  });
}

// ── Detalle de un grupo (KPIs + roster con señales) ─────────────────────────────
export async function getGrupoDetalleSeguimiento(
  userId: string,
  grupoId: string,
): Promise<GrupoDetalleSeguimiento | null> {
  const res = await comoStaff(userId, async (sql) => {
    const g = (
      await sql<
        {
          id: string;
          nombre: string;
          modalidad: 'sincrono' | 'asincrono';
          fecha_inicio: Date | null;
          programa_id: string;
          programa: string;
          cora_grupo_id: string | null;
        }[]
      >`
        select g.id, g.nombre, g.modalidad, g.fecha_inicio,
               g.programa_id, p.nombre as programa, g.cora_grupo_id
        from lxp.grupos g
        join lxp.programas p on p.id = g.programa_id
        where g.id = ${grupoId} and g.docente_id = ${userId}
        limit 1`
    )[0];
    if (!g) return null;

    const { alumnos, avatarRefs } = await alumnosDeGrupo(sql, {
      programaId: g.programa_id,
      coraGrupoId: g.cora_grupo_id,
    });

    const total = alumnos.length;
    const enRiesgo = alumnos.filter((a) => a.senal).length;
    const sinActividad = alumnos.filter((a) => a.sinActividad).length;
    const activosSemana = alumnos.filter((a) => !a.sinActividad).length;
    const avance = total ? Math.round(alumnos.reduce((s, a) => s + a.avance, 0) / total) : 0;
    const casosValidados = alumnos.reduce((s, a) => s + a.casosValidados, 0);

    // Cola de casos pendientes del grupo (para la nota del KPI).
    const ids = alumnos.map((a) => a.id);
    const casosCola =
      (ids.length
        ? (
            await sql<{ n: number }[]>`
              select count(*)::int as n from lxp.bitacora_casos
              where id_alumno in ${sql(ids)} and estado_validacion = 'pendiente'`
          )[0]?.n
        : 0) ?? 0;

    const resumen: ResumenKpi[] = [
      { etiqueta: 'Avance del grupo', valor: `${avance}%`, nota: `${total} alumnos` },
      {
        etiqueta: 'Requieren intervención',
        valor: String(enRiesgo),
        nota: `de ${total} alumnos`,
        atencion: enRiesgo > 0,
      },
      {
        etiqueta: 'Casos validados',
        valor: String(casosValidados),
        nota: `${casosCola} en cola de validación`,
      },
      {
        etiqueta: 'Actividad esta semana',
        valor: String(activosSemana),
        nota: `de ${total} entraron al campus`,
      },
    ];

    const conteos: ConteosAlumnos = {
      todos: total,
      atencion: enRiesgo,
      sinActividad,
      alDia: total - enRiesgo,
    };

    return {
      detalle: {
        id: g.id,
        nombre: g.nombre,
        programa: g.programa,
        modalidad: g.modalidad,
        fechaInicio: g.fecha_inicio,
        moduloEnCurso: moduloEnCursoGrupo(alumnos),
        resumen,
        alumnos,
        conteos,
      } satisfies GrupoDetalleSeguimiento,
      avatarRefs,
    };
  });

  if (!res) return null;

  // Firma los avatares FUERA de la tx (patrón getShellData · lib/datos.ts): batch-sign
  // de las refs del roster y se adjunta la URL por alumno (null si no hay/no se firmó).
  const urls = await firmarLecturaImagenes([...res.avatarRefs.values()]);
  res.detalle.alumnos = res.detalle.alumnos.map((a) => {
    const ref = res.avatarRefs.get(a.id);
    return { ...a, avatarUrl: (ref && urls[ref]) || null };
  });
  return res.detalle;
}

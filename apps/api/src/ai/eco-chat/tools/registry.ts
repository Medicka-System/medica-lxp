/**
 * REGISTRO de herramientas de Eco conversacional (§7A). Mapea `nombre → ToolDef`. El
 * engine ofrece al modelo las tools permitidas para su rol y ejecuta las que pida.
 *
 * Tools de la surface `alumno` (expediente): read-only, deterministas (SQL/RAG). Reusan
 * las MISMAS consultas que ya pinta el expediente del alumno (bajo RLS) + el RAG del
 * pipeline (`buscarChunks`) — no reinventan dominio (§2). Cada tool corre impersonando
 * al usuario (`CtxTool.sql` ya viene con RLS), así un rol solo ve lo que le corresponde.
 *
 * Extender a las otras 4 surfaces = añadir tools con su `surface`/`rolesPermitidos`; el
 * engine no cambia. Añadir action-tools = un `ToolDef` con `requiereConfirmacion` (§7A,
 * puerta ya prevista en los tipos) — hoy todas son `readonly`.
 */
import { buscarChunks } from '../../tools/rag.tool';
import type { CtxTool, DepsTool, ResultadoTool, RolLxp, SurfaceEco, ToolDef } from './tipos';

/** Roles de staff que supervisan a un alumno/grupo (§5B). El diseñador no; el alumno tampoco. */
const STAFF_SUPERVISOR: RolLxp[] = ['super_admin', 'admin', 'docente'];
/** Roles con visión GLOBAL de la escuela (§5B): solo administración. El docente ve lo suyo. */
const STAFF_GLOBAL: RolLxp[] = ['super_admin', 'admin'];

// ── Tools de la surface `alumno` ─────────────────────────────────────────────

const perfilYAvance: ToolDef = {
  nombre: 'perfil_y_avance_alumno',
  descripcion:
    'Datos base y avance del alumno del expediente: nombre, estado de acceso, horas ' +
    'validadas, conteo de casos por estado (aprobado/pendiente/rechazado), certificados, ' +
    'insignias y consultas 1:1 abiertas. Úsala para "resumen del alumno" o "cómo va".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['alumno'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const perfil = (
      await ctx.sql<
        { nombre: string; email: string | null; acceso_activo: boolean; created_at: Date }[]
      >`
        select nombre, email, acceso_activo, created_at
        from lxp.perfiles where user_id = ${ctx.entidadId} and rol = 'alumno' limit 1`
    )[0];
    if (!perfil) {
      return { contenido: 'No se encontró un alumno con ese id (o no es visible para tu rol).' };
    }
    const casos = (
      await ctx.sql<
        {
          total: number;
          aprobados: number;
          pendientes: number;
          rechazados: number;
          horas: number;
          recientes: number;
        }[]
      >`
        select
          count(*)::int as total,
          count(*) filter (where estado_validacion = 'aprobado')::int as aprobados,
          count(*) filter (where estado_validacion = 'pendiente')::int as pendientes,
          count(*) filter (where estado_validacion = 'rechazado')::int as rechazados,
          coalesce(sum(horas_estimadas) filter (where estado_validacion = 'aprobado'), 0)::float8 as horas,
          count(*) filter (where created_at >= now() - interval '14 days')::int as recientes
        from lxp.bitacora_casos where id_alumno = ${ctx.entidadId}`
    )[0]!;
    const [cert, badges, consultas] = await Promise.all([
      ctx.sql<{ n: number }[]>`select count(*)::int as n from lxp.certificados where id_alumno = ${ctx.entidadId}`,
      ctx.sql<{ n: number }[]>`select count(*)::int as n from lxp.badges_otorgados where id_perfil = ${ctx.entidadId}`,
      ctx.sql<{ n: number }[]>`select count(*)::int as n from lxp.consultas where id_alumno = ${ctx.entidadId} and estado = 'abierta'`,
    ]);
    const datos = {
      nombre: perfil.nombre,
      email: perfil.email,
      acceso_activo: perfil.acceso_activo,
      alumno_desde: perfil.created_at.toISOString().slice(0, 10),
      horas_validadas: Math.round(casos.horas),
      casos: {
        total: casos.total,
        aprobados: casos.aprobados,
        pendientes: casos.pendientes,
        rechazados: casos.rechazados,
        subidos_ultimos_14d: casos.recientes,
      },
      certificados: cert[0]?.n ?? 0,
      insignias: badges[0]?.n ?? 0,
      consultas_abiertas: consultas[0]?.n ?? 0,
    };
    return { contenido: JSON.stringify(datos) };
  },
};

const competencia: ToolDef = {
  nombre: 'competencia_alumno',
  descripcion:
    'Competencia del alumno por dominio I-AIM (Indicación, Adquisición, Interpretación, ' +
    'decisión Médica): nivel actual y decaimiento por dominio. Úsala para "en qué está ' +
    'flojo", "su dominio más bajo" o "riesgo de decaimiento".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['alumno'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const rows = await ctx.sql<
      { dominio_iaim: string; nivel: number; decaimiento: number }[]
    >`
      select dominio_iaim::text as dominio_iaim, nivel::float8 as nivel, decaimiento::float8 as decaimiento
      from lxp.competencia_dominios where id_alumno = ${ctx.entidadId}
      order by nivel asc`;
    if (!rows.length) {
      return { contenido: 'El alumno aún no tiene competencia registrada por dominio I-AIM.' };
    }
    const dominios = rows.map((r) => ({
      dominio: r.dominio_iaim,
      nivel: Math.round(r.nivel),
      decaimiento: Math.round(r.decaimiento),
    }));
    const general = Math.round(rows.reduce((s, r) => s + r.nivel, 0) / rows.length);
    return { contenido: JSON.stringify({ general, dominios }) };
  },
};

const casosRecientes: ToolDef = {
  nombre: 'casos_recientes_alumno',
  descripcion:
    'Últimos casos de la bitácora del alumno: órgano, dominio I-AIM, diagnóstico ' +
    'presuntivo, estado de validación y fecha. Úsala para revisar su práctica reciente ' +
    'o entender por qué le rechazaron casos.',
  schema: {
    type: 'object',
    properties: {
      limite: { type: 'integer', minimum: 1, maximum: 20, description: 'Cuántos casos traer (por defecto 8).' },
    },
    additionalProperties: false,
  },
  surfaces: ['alumno'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool, input: Record<string, unknown>): Promise<ResultadoTool> {
    const limite = Math.min(Math.max(Number(input.limite) || 8, 1), 20);
    const rows = await ctx.sql<
      {
        id: string;
        organo: string | null;
        dominio_iaim: string | null;
        diagnostico_presuntivo: string | null;
        estado: string;
        horas: number | null;
        created_at: Date;
      }[]
    >`
      select id, organo, dominio_iaim::text as dominio_iaim, diagnostico_presuntivo,
             estado_validacion::text as estado, horas_estimadas::float8 as horas, created_at
      from lxp.bitacora_casos where id_alumno = ${ctx.entidadId}
      order by created_at desc limit ${limite}`;
    if (!rows.length) return { contenido: 'El alumno no ha subido casos a su bitácora.' };
    const casos = rows.map((r) => ({
      organo: r.organo,
      dominio: r.dominio_iaim,
      diagnostico_presuntivo: r.diagnostico_presuntivo,
      estado: r.estado,
      horas: r.horas ?? null,
      fecha: r.created_at.toISOString().slice(0, 10),
    }));
    return {
      contenido: JSON.stringify(casos),
      fuentes: rows.map((r) => ({
        tipo: 'caso_bitacora',
        id: r.id,
        titulo: r.organo ? `Caso · ${r.organo}` : 'Caso de bitácora',
      })),
    };
  },
};

const buscarConocimiento: ToolDef = {
  nombre: 'buscar_conocimiento',
  descripcion:
    'Busca en el acervo curado del campus (casos de biblioteca, teoría, rúbricas) por ' +
    'similitud semántica (RAG). Úsala para fundamentar una explicación clínica o comparar ' +
    'la práctica del alumno con la verdad del caso. NO es dato del alumno: es conocimiento.',
  schema: {
    type: 'object',
    properties: {
      consulta: { type: 'string', description: 'Qué buscar (tema, hallazgo, diagnóstico).' },
      k: { type: 'integer', minimum: 1, maximum: 8, description: 'Cuántos fragmentos (por defecto 5).' },
    },
    required: ['consulta'],
    additionalProperties: false,
  },
  // El conocimiento (RAG) es transversal: sirve en cualquier surface.
  surfaces: ['alumno', 'grupo', 'escuela'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool, input: Record<string, unknown>, deps: DepsTool): Promise<ResultadoTool> {
    const consulta = String(input.consulta ?? '').trim();
    if (!consulta) return { contenido: 'Falta el texto de la consulta a buscar.' };
    const k = Math.min(Math.max(Number(input.k) || 5, 1), 8);
    try {
      const chunks = await buscarChunks(ctx.sql, deps.embeddings, consulta, k);
      if (!chunks.length) return { contenido: 'No se encontró conocimiento relevante en el acervo.' };
      return {
        contenido: JSON.stringify(
          chunks.map((c) => ({ fuente: c.fuenteTipo, texto: c.chunk, distancia: Number(c.distancia.toFixed(3)) })),
        ),
        fuentes: chunks.map((c) => ({ tipo: c.fuenteTipo, id: c.fuenteId, distancia: Number(c.distancia.toFixed(3)) })),
      };
    } catch {
      return {
        contenido:
          'El servicio de RAG/embeddings no respondió; no pude buscar en el acervo esta vez.',
      };
    }
  },
};

// ── Tools de la surface `grupo` (seguimiento del grupo · §5B) ────────────────────
// Reusan las MISMAS tablas que el seguimiento del docente (`grupos/_lib/datos.ts`):
// el roster viene del puente SECDEF de CORA (`cora_alumnos_de_grupo`, gated a staff),
// y avance/casos/entregas/competencia salen de `lxp` bajo RLS. La entidad es el grupoId;
// la RLS de `lxp.grupos` ya limita al docente a SUS grupos (admin/super ven todos).

/** Umbrales de riesgo (espejo de `REGLAS_RIESGO` del seguimiento web · fuente única a futuro). */
const DIAS_SIN_ACTIVIDAD = 7;

/** Grupo (nombre/programa/cora_grupo_id) visible para el usuario, o `null` si no lo es. */
async function grupoVisible(
  sql: CtxTool['sql'],
  grupoId: string,
): Promise<{ nombre: string; programa: string; modalidad: string; cora_grupo_id: string | null } | null> {
  const rows = await sql<
    { nombre: string; programa: string; modalidad: string; cora_grupo_id: string | null }[]
  >`
    select g.nombre, p.nombre as programa, g.modalidad::text as modalidad, g.cora_grupo_id
    from lxp.grupos g join lxp.programas p on p.id = g.programa_id
    where g.id = ${grupoId} limit 1`;
  return rows[0] ?? null;
}

/** Ids del roster (CORA · solo staff obtiene filas). Vacío si el grupo no tiene cohorte ligada. */
async function rosterIds(
  sql: CtxTool['sql'],
  coraGrupoId: string | null,
): Promise<{ id: string; nombre: string }[]> {
  if (!coraGrupoId) return [];
  const roster = await sql<{ supabase_auth_id: string; nombre: string }[]>`
    select supabase_auth_id, nombre from lxp.cora_alumnos_de_grupo(${coraGrupoId})`;
  return roster.map((r) => ({ id: r.supabase_auth_id, nombre: r.nombre }));
}

const resumenGrupo: ToolDef = {
  nombre: 'resumen_grupo',
  descripcion:
    'Resumen de seguimiento del grupo: nombre, programa, modalidad, nº de alumnos, casos ' +
    'por estado (aprobado/pendiente/rechazado), entregas por revisar y competencia I-AIM media. ' +
    'Úsala para "cómo va el grupo" o "cuánto hay por revisar".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['grupo'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const g = await grupoVisible(ctx.sql, ctx.entidadId);
    if (!g) return { contenido: 'No se encontró ese grupo (o no es visible para tu rol).' };
    const roster = await rosterIds(ctx.sql, g.cora_grupo_id);
    const ids = roster.map((r) => r.id);
    if (ids.length === 0) {
      return {
        contenido: JSON.stringify({
          grupo: g.nombre,
          programa: g.programa,
          modalidad: g.modalidad,
          alumnos: 0,
          nota: 'El grupo aún no tiene alumnos inscritos (cohorte de CORA vacía).',
        }),
      };
    }
    const [casos, entregas, comp] = await Promise.all([
      ctx.sql<{ total: number; aprobados: number; pendientes: number; rechazados: number }[]>`
        select
          count(*)::int as total,
          count(*) filter (where estado_validacion = 'aprobado')::int as aprobados,
          count(*) filter (where estado_validacion = 'pendiente')::int as pendientes,
          count(*) filter (where estado_validacion = 'rechazado')::int as rechazados
        from lxp.bitacora_casos where id_alumno in ${ctx.sql(ids)}`,
      ctx.sql<{ n: number }[]>`
        select count(*)::int as n from lxp.entregas
        where id_alumno in ${ctx.sql(ids)} and estado = 'enviada'`,
      ctx.sql<{ nivel: number | null }[]>`
        select round(avg(nivel))::int as nivel from lxp.competencia_dominios
        where id_alumno in ${ctx.sql(ids)}`,
    ]);
    const c = casos[0]!;
    return {
      contenido: JSON.stringify({
        grupo: g.nombre,
        programa: g.programa,
        modalidad: g.modalidad,
        alumnos: ids.length,
        casos: {
          total: c.total,
          aprobados: c.aprobados,
          pendientes: c.pendientes,
          rechazados: c.rechazados,
        },
        entregas_por_revisar: entregas[0]?.n ?? 0,
        competencia_iaim_media: comp[0]?.nivel ?? null,
      }),
    };
  },
};

const alumnosEnRiesgoGrupo: ToolDef = {
  nombre: 'alumnos_en_riesgo_grupo',
  descripcion:
    'Alumnos del grupo que requieren intervención, con el motivo en palabras: sin actividad ' +
    `hace ${DIAS_SIN_ACTIVIDAD}+ días o con casos rechazados. Úsala para "¿quién está batallando?" ` +
    'o "¿a quién le escribo?".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['grupo'],
  rolesPermitidos: STAFF_SUPERVISOR,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const g = await grupoVisible(ctx.sql, ctx.entidadId);
    if (!g) return { contenido: 'No se encontró ese grupo (o no es visible para tu rol).' };
    const roster = await rosterIds(ctx.sql, g.cora_grupo_id);
    if (roster.length === 0) return { contenido: 'El grupo aún no tiene alumnos inscritos.' };
    const ids = roster.map((r) => r.id);

    // Por alumno: casos rechazados + última actividad (casos + progreso de lecciones).
    const [rechazos, ultCaso, ultProg] = await Promise.all([
      ctx.sql<{ id_alumno: string; rechazados: number }[]>`
        select id_alumno, count(*)::int as rechazados from lxp.bitacora_casos
        where id_alumno in ${ctx.sql(ids)} and estado_validacion = 'rechazado'
        group by id_alumno`,
      ctx.sql<{ id_alumno: string; ult: Date | null }[]>`
        select id_alumno, max(updated_at) as ult from lxp.bitacora_casos
        where id_alumno in ${ctx.sql(ids)} group by id_alumno`,
      ctx.sql<{ alumno_id: string; ult: Date | null }[]>`
        select alumno_id, max(actualizado_en) as ult from lxp.reproduccion_progreso
        where alumno_id in ${ctx.sql(ids)} group by alumno_id`,
    ]);
    const rechPor = new Map(rechazos.map((r) => [r.id_alumno, r.rechazados]));
    const ultPor = new Map<string, number>();
    for (const r of [...ultCaso, ...ultProg.map((p) => ({ id_alumno: p.alumno_id, ult: p.ult }))]) {
      if (!r.ult) continue;
      const t = r.ult.getTime();
      ultPor.set(r.id_alumno, Math.max(ultPor.get(r.id_alumno) ?? 0, t));
    }
    const ahora = Date.now();
    const DIA = 24 * 60 * 60 * 1000;
    const enRiesgo = roster
      .map((a) => {
        const rech = rechPor.get(a.id) ?? 0;
        const ult = ultPor.get(a.id) ?? null;
        const dias = ult === null ? null : Math.floor((ahora - ult) / DIA);
        const sinActividad = dias === null || dias >= DIAS_SIN_ACTIVIDAD;
        if (!sinActividad && rech === 0) return null;
        const motivos: string[] = [];
        if (sinActividad) {
          motivos.push(dias === null ? 'nunca ha entrado al campus' : `sin actividad hace ${dias} días`);
        }
        if (rech > 0) motivos.push(`${rech} ${rech === 1 ? 'caso rechazado' : 'casos rechazados'}`);
        return { nombre: a.nombre, motivo: motivos.join(' · ') };
      })
      .filter((x): x is { nombre: string; motivo: string } => x !== null);

    if (enRiesgo.length === 0) {
      return { contenido: JSON.stringify({ grupo: g.nombre, en_riesgo: [], nota: 'Nadie requiere intervención por ahora.' }) };
    }
    return { contenido: JSON.stringify({ grupo: g.nombre, en_riesgo: enRiesgo }) };
  },
};

// ── Tools de la surface `escuela` (panorama global · §5B) ────────────────────────
// Solo administración (STAFF_GLOBAL). Reusan las MISMAS agregaciones que la Analítica
// (`admin/analitica/_components/_data.ts`) sobre `lxp`, bajo RLS. Ignoran `entidadId`
// (la entidad es la escuela entera, sin id).

const panoramaEscuela: ToolDef = {
  nombre: 'panorama_escuela',
  descripcion:
    'Panorama global de la escuela: alumnos activos y altas del mes, casos por estado y tasa ' +
    'de aprobación, nº de grupos y docentes, actividad del Ateneo y correcciones docente→Eco. ' +
    'Úsala para "¿cómo va la escuela?" o "¿cuánto hay pendiente de validar?".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['escuela'],
  rolesPermitidos: STAFF_GLOBAL,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const [alumnos, casos, escala, ateneo, eco] = await Promise.all([
      ctx.sql<{ activos: number; altas30: number }[]>`
        select
          count(*) filter (where rol = 'alumno' and acceso_activo)::int as activos,
          count(*) filter (where rol = 'alumno' and created_at >= now() - interval '30 days')::int as altas30
        from lxp.perfiles`,
      ctx.sql<{ ap: number; re: number; pe: number; total: number }[]>`
        select
          count(*) filter (where estado_validacion = 'aprobado')::int as ap,
          count(*) filter (where estado_validacion = 'rechazado')::int as re,
          count(*) filter (where estado_validacion = 'pendiente')::int as pe,
          count(*)::int as total
        from lxp.bitacora_casos`,
      ctx.sql<{ grupos: number; docentes: number }[]>`
        select
          (select count(*) from lxp.grupos)::int as grupos,
          (select count(*) from lxp.perfiles where rol = 'docente')::int as docentes`,
      ctx.sql<{ casos_semana: number; sin_responder: number }[]>`
        select
          (select count(*) filter (where tipo = 'caso' and created_at >= now() - interval '7 days') from lxp.posts_ateneo)::int as casos_semana,
          (select count(*) from lxp.posts_ateneo p
             where p.tipo = 'caso' and p.estado = 'aprobado'
               and not exists (select 1 from lxp.comentarios_ateneo c where c.post_id = p.id))::int as sin_responder`,
      ctx.sql<{ n: number }[]>`select count(*)::int as n from lxp.eco_correcciones`,
    ]);
    const c = casos[0]!;
    const decididos = c.ap + c.re;
    return {
      contenido: JSON.stringify({
        alumnos_activos: alumnos[0]?.activos ?? 0,
        altas_30d: alumnos[0]?.altas30 ?? 0,
        casos: { total: c.total, aprobados: c.ap, pendientes: c.pe, rechazados: c.re },
        tasa_aprobacion_pct: decididos > 0 ? Math.round((c.ap / decididos) * 100) : null,
        grupos: escala[0]?.grupos ?? 0,
        docentes: escala[0]?.docentes ?? 0,
        ateneo: { casos_esta_semana: ateneo[0]?.casos_semana ?? 0, casos_sin_responder: ateneo[0]?.sin_responder ?? 0 },
        correcciones_eco: eco[0]?.n ?? 0,
      }),
    };
  },
};

const competenciaEscuela: ToolDef = {
  nombre: 'competencia_escuela',
  descripcion:
    'Competencia I-AIM de TODA la escuela por dominio (Indicación, Adquisición, Interpretación, ' +
    'decisión Médica): nivel medio, decaimiento medio y nº de proyecciones. Úsala para "¿en qué ' +
    'dominio está más floja la escuela?" o "¿dónde hay más decaimiento?".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
  surfaces: ['escuela'],
  rolesPermitidos: STAFF_GLOBAL,
  readonly: true,
  async ejecutar(ctx: CtxTool): Promise<ResultadoTool> {
    const rows = await ctx.sql<
      { dominio: string; nivel: number; decaimiento: number; n: number }[]
    >`
      select dominio_iaim::text as dominio, avg(nivel)::float8 as nivel,
             avg(decaimiento)::float8 as decaimiento, count(*)::int as n
      from lxp.competencia_dominios group by dominio_iaim order by nivel asc`;
    if (!rows.length) {
      return { contenido: 'Aún no hay competencia registrada por dominio I-AIM en la escuela.' };
    }
    return {
      contenido: JSON.stringify(
        rows.map((r) => ({
          dominio: r.dominio,
          nivel_medio: Math.round(r.nivel),
          decaimiento_medio: Math.round(r.decaimiento),
          proyecciones: r.n,
        })),
      ),
    };
  },
};

/** Todas las tools registradas, por nombre. */
const REGISTRO: Map<string, ToolDef> = new Map(
  [
    perfilYAvance,
    competencia,
    casosRecientes,
    buscarConocimiento,
    resumenGrupo,
    alumnosEnRiesgoGrupo,
    panoramaEscuela,
    competenciaEscuela,
  ].map((t) => [t.nombre, t]),
);

/** Tool por nombre (o `undefined` si el modelo pidió una inexistente). */
export function obtenerTool(nombre: string): ToolDef | undefined {
  return REGISTRO.get(nombre);
}

/** Tools que un `rol` puede usar en una `surface` (doble filtro: surface + rol). */
export function toolsParaRol(rol: RolLxp, surface: SurfaceEco): ToolDef[] {
  return [...REGISTRO.values()].filter(
    (t) => t.surfaces.includes(surface) && t.rolesPermitidos.includes(rol),
  );
}

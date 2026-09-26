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
import type { CtxTool, DepsTool, ResultadoTool, RolLxp, ToolDef } from './tipos';

/** Roles de staff que supervisan a un alumno (§5B). El diseñador no; el alumno tampoco. */
const STAFF_SUPERVISOR: RolLxp[] = ['super_admin', 'admin', 'docente'];

// ── Tools de la surface `alumno` ─────────────────────────────────────────────

const perfilYAvance: ToolDef = {
  nombre: 'perfil_y_avance_alumno',
  descripcion:
    'Datos base y avance del alumno del expediente: nombre, estado de acceso, horas ' +
    'validadas, conteo de casos por estado (aprobado/pendiente/rechazado), certificados, ' +
    'insignias y consultas 1:1 abiertas. Úsala para "resumen del alumno" o "cómo va".',
  schema: { type: 'object', properties: {}, additionalProperties: false },
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

/** Todas las tools registradas, por nombre. */
const REGISTRO: Map<string, ToolDef> = new Map(
  [perfilYAvance, competencia, casosRecientes, buscarConocimiento].map((t) => [t.nombre, t]),
);

/** Tool por nombre (o `undefined` si el modelo pidió una inexistente). */
export function obtenerTool(nombre: string): ToolDef | undefined {
  return REGISTRO.get(nombre);
}

/** Tools que un `rol` puede usar en una `surface` (hoy solo `alumno`). */
export function toolsParaRol(rol: RolLxp, _surface: 'alumno'): ToolDef[] {
  return [...REGISTRO.values()].filter((t) => t.rolesPermitidos.includes(rol));
}

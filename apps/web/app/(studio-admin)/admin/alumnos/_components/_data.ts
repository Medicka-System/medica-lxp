import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';
import { haceCuanto } from '@/lib/format';
import type { AlumnosData, AlumnoFila, EstadoAlumno, Expediente } from './contrato';

/**
 * Lecturas de Alumnos CON RLS (`comoStaff` → `lxp.es_staff()`). Todo lo del campus
 * es real; lo administrativo de CORA (matrícula, inscripción, pago) no se lee en
 * agregado bajo RLS en local, así que las vistas lo marcan como placeholder (§11).
 */

const DOMINIOS: { clave: string; nombre: string }[] = [
  { clave: 'indicacion', nombre: 'Indicación' },
  { clave: 'adquisicion', nombre: 'Adquisición' },
  { clave: 'interpretacion', nombre: 'Interpretación' },
  { clave: 'decision_medica', nombre: 'Decisión médica' },
];

function estadoDe(
  accesoActivo: boolean,
  casos14d: number,
): { estado: EstadoAlumno; senal?: string } {
  if (!accesoActivo) return { estado: 'suspendido', senal: 'acceso en pausa · CORA' };
  if (casos14d === 0) return { estado: 'riesgo', senal: 'sin actividad reciente' };
  return { estado: 'corriente' };
}

export async function getAlumnos(userId: string): Promise<AlumnosData> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        user_id: string;
        nombre: string;
        acceso_activo: boolean;
        competencia: number | null;
        casos_total: number;
        casos_aprobados: number;
        casos_14d: number;
        ultima_actividad: Date | null;
      }[]
    >`
      select
        p.user_id, p.nombre, p.acceso_activo,
        cc.nivel_medio as competencia,
        coalesce(cb.total, 0)::int as casos_total,
        coalesce(cb.aprobados, 0)::int as casos_aprobados,
        coalesce(cb.recientes, 0)::int as casos_14d,
        cb.ultima_actividad
      from lxp.perfiles p
      left join (
        select id_alumno, avg(nivel)::float8 as nivel_medio
        from lxp.competencia_dominios group by id_alumno
      ) cc on cc.id_alumno = p.user_id
      left join (
        select id_alumno,
          count(*) as total,
          count(*) filter (where estado_validacion = 'aprobado') as aprobados,
          count(*) filter (where created_at >= now() - interval '14 days') as recientes,
          max(created_at) as ultima_actividad
        from lxp.bitacora_casos group by id_alumno
      ) cb on cb.id_alumno = p.user_id
      where p.rol = 'alumno'
      order by p.nombre`;

    const hoy = new Date();
    const alumnos: AlumnoFila[] = rows.map((r) => {
      const { estado, senal } = estadoDe(r.acceso_activo, r.casos_14d);
      return {
        id: r.user_id,
        ini: iniciales(r.nombre),
        nombre: r.nombre,
        competencia: r.competencia === null ? null : Math.round(r.competencia),
        casosAprobados: r.casos_aprobados,
        casosTotal: r.casos_total,
        estado,
        senal,
        ultimaActividad: r.ultima_actividad ? haceCuanto(r.ultima_actividad, hoy) : 'sin casos',
        sinActividad: r.casos_14d === 0,
      };
    });

    const conNivel = alumnos.filter((a) => a.competencia !== null) as (AlumnoFila & { competencia: number })[];
    const competenciaMedia = conNivel.length
      ? Math.round(conNivel.reduce((s, a) => s + a.competencia, 0) / conNivel.length)
      : null;

    return {
      totales: {
        activos: alumnos.filter((a) => a.estado !== 'suspendido').length,
        enRiesgo: alumnos.filter((a) => a.estado === 'riesgo').length,
        suspendidos: alumnos.filter((a) => a.estado === 'suspendido').length,
        competenciaMedia,
      },
      alumnos,
    };
  });
}

export async function getExpediente(userId: string, alumnoId: string): Promise<Expediente | null> {
  return comoStaff(userId, async (sql) => {
    const perfil = (
      await sql<
        { user_id: string; nombre: string; email: string | null; acceso_activo: boolean; created_at: Date }[]
      >`
        select user_id, nombre, email, acceso_activo, created_at
        from lxp.perfiles where user_id = ${alumnoId} and rol = 'alumno' limit 1`
    )[0];
    if (!perfil) return null;

    const [casos, comp, cert, badges, consultas, recientes] = await Promise.all([
      sql<
        { total: number; aprobados: number; pendientes: number; rechazados: number; horas: number; recientes: number }[]
      >`
        select
          count(*)::int as total,
          count(*) filter (where estado_validacion = 'aprobado')::int as aprobados,
          count(*) filter (where estado_validacion = 'pendiente')::int as pendientes,
          count(*) filter (where estado_validacion = 'rechazado')::int as rechazados,
          coalesce(sum(horas_estimadas) filter (where estado_validacion = 'aprobado'), 0)::float8 as horas,
          count(*) filter (where created_at >= now() - interval '14 days')::int as recientes
        from lxp.bitacora_casos where id_alumno = ${alumnoId}`,
      sql<{ dominio_iaim: string; nivel: number; decaimiento: number }[]>`
        select dominio_iaim::text as dominio_iaim, nivel::float8 as nivel, decaimiento::float8 as decaimiento
        from lxp.competencia_dominios where id_alumno = ${alumnoId}`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.certificados where id_alumno = ${alumnoId}`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.badges_otorgados where id_perfil = ${alumnoId}`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.consultas where id_alumno = ${alumnoId} and estado = 'abierta'`,
      sql<{ id: string; organo: string | null; estado: string; created_at: Date }[]>`
        select id, organo, estado_validacion::text as estado, created_at
        from lxp.bitacora_casos where id_alumno = ${alumnoId}
        order by created_at desc limit 5`,
    ]);

    const c = casos[0]!;
    const nivelPorDominio = new Map(comp.map((d) => [d.dominio_iaim, d]));
    const dominios = DOMINIOS.map((d) => {
      const row = nivelPorDominio.get(d.clave);
      return {
        nombre: d.nombre,
        valor: row ? Math.round(row.nivel) : 0,
        decaimiento: row ? Math.round(row.decaimiento) : 0,
      };
    });
    const general = comp.length ? Math.round(comp.reduce((s, d) => s + d.nivel, 0) / comp.length) : null;
    const { estado, senal } = estadoDe(perfil.acceso_activo, c.recientes);
    const hoy = new Date();

    return {
      id: perfil.user_id,
      ini: iniciales(perfil.nombre),
      nombre: perfil.nombre,
      email: perfil.email,
      estado,
      senal,
      desde: perfil.created_at.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      cifras: {
        horas: `${Math.round(c.horas)} h`,
        casosValidados: `${c.aprobados} / ${c.total}`,
        casosPendientes: c.pendientes,
        casosRechazados: c.rechazados,
        certificados: cert[0]?.n ?? 0,
        insignias: badges[0]?.n ?? 0,
      },
      iaim: { dominios, general },
      actividad: recientes.map((r) => ({
        id: r.id,
        titulo: r.organo ? `Caso · ${r.organo}` : 'Caso de bitácora',
        estado: r.estado as ActividadEstado,
        cuando: haceCuanto(r.created_at, hoy),
      })),
      consultasAbiertas: consultas[0]?.n ?? 0,
    };
  });
}

type ActividadEstado = 'pendiente' | 'aprobado' | 'rechazado';

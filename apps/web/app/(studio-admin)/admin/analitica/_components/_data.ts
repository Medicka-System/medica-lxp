import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';
import type { AnaliticaData, IaimEscuela, BarraSimple, DocenteDesempeno } from './contrato';

/**
 * Lecturas de Analítica CON RLS (`comoStaff` → `lxp.es_staff()`). La capa de
 * aprendizaje (I-AIM, casos, repaso) y la de operación (desempeño docente, Ateneo)
 * son REALES desde `lxp`. La capa de negocio profunda (retención, llenado, embudo,
 * ingreso, cartera) depende de CORA y del LRS histórico: se marca como pendiente en
 * la vista (§11). El uso/calidad de Eco se cablea con su orquestación (§7A).
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOMINIOS: Record<string, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión médica',
};

export async function getAnalitica(userId: string): Promise<AnaliticaData> {
  const hoy = new Date();

  const raw = await comoStaff(userId, async (sql) => {
    const [alumnos, casos, casosMes, iaimRows, casosDom, repaso, valDoc, colaDoc, ateneo, ecoCorr] =
      await Promise.all([
        sql<{ activos: number; altas30: number }[]>`
          select
            count(*) filter (where rol = 'alumno' and acceso_activo)::int as activos,
            count(*) filter (where rol = 'alumno' and created_at >= now() - interval '30 days')::int as altas30
          from lxp.perfiles`,
        sql<{ ap: number; re: number; pe: number; total: number }[]>`
          select
            count(*) filter (where estado_validacion = 'aprobado')::int as ap,
            count(*) filter (where estado_validacion = 'rechazado')::int as re,
            count(*) filter (where estado_validacion = 'pendiente')::int as pe,
            count(*)::int as total
          from lxp.bitacora_casos`,
        sql<{ ym: string; n: number }[]>`
          select to_char(date_trunc('month', created_at), 'YYYY-MM') as ym, count(*)::int as n
          from lxp.bitacora_casos
          where created_at >= date_trunc('month', now()) - interval '5 months' group by 1`,
        sql<{ d: string; nivel: number; decaimiento: number; n: number }[]>`
          select dominio_iaim::text as d, avg(nivel)::float8 as nivel, avg(decaimiento)::float8 as decaimiento, count(*)::int as n
          from lxp.competencia_dominios group by dominio_iaim`,
        sql<{ d: string; n: number }[]>`
          select coalesce(dominio_iaim::text, 'sin_dominio') as d, count(*)::int as n
          from lxp.bitacora_casos group by 1`,
        sql<{ con_decaimiento: number; repasos: number; medidos: number }[]>`
          select
            count(*) filter (where decaimiento > 0)::int as con_decaimiento,
            count(*) filter (where proximo_repaso is not null and proximo_repaso >= current_date)::int as repasos,
            count(*)::int as medidos
          from lxp.competencia_dominios`,
        sql<{ id_docente: string; nombre: string; validados: number }[]>`
          select v.id_docente, pf.nombre, count(*)::int as validados
          from lxp.validaciones v join lxp.perfiles pf on pf.user_id = v.id_docente
          where v.created_at >= now() - interval '30 days'
          group by v.id_docente, pf.nombre order by validados desc limit 6`,
        sql<{ docente_id: string; cola: number }[]>`
          select g.docente_id, count(*)::int as cola
          from lxp.bitacora_casos c join lxp.grupos g on g.id = c.grupo_id
          where c.estado_validacion = 'pendiente' and g.docente_id is not null
          group by g.docente_id`,
        sql<{ casos_semana: number; casos_total: number; comentarios: number; autores: number; sin_responder: number }[]>`
          select
            (select count(*) filter (where tipo = 'caso' and created_at >= now() - interval '7 days') from lxp.posts_ateneo)::int as casos_semana,
            (select count(*) filter (where tipo = 'caso') from lxp.posts_ateneo)::int as casos_total,
            (select count(*) from lxp.comentarios_ateneo)::int as comentarios,
            (select count(distinct autor_id) from lxp.posts_ateneo where tipo = 'caso')::int as autores,
            (select count(*) from lxp.posts_ateneo p
               where p.tipo = 'caso' and p.estado = 'aprobado'
                 and not exists (select 1 from lxp.comentarios_ateneo c where c.post_id = p.id))::int as sin_responder`,
        sql<{ n: number }[]>`select count(*)::int as n from lxp.eco_correcciones`,
      ]);

    return {
      alumnos: alumnos[0]!,
      casos: casos[0]!,
      casosMes,
      iaimRows,
      casosDom,
      repaso: repaso[0]!,
      valDoc,
      colaDoc,
      ateneo: ateneo[0]!,
      ecoCorr: ecoCorr[0]?.n ?? 0,
    };
  });

  // ── I-AIM de la escuela ──────────────────────────────────────────────────────
  const iaim: IaimEscuela[] = Object.entries(DOMINIOS).map(([clave, nombre]) => {
    const row = raw.iaimRows.find((r) => r.d === clave);
    return {
      dominio: nombre,
      valor: row ? Math.round(row.nivel) : 0,
      n: row?.n ?? 0,
      decaimiento: row ? Math.round(row.decaimiento) : 0,
      flojo: false,
    };
  });
  const medidos = iaim.filter((d) => d.n > 0);
  if (medidos.length) {
    const min = Math.min(...medidos.map((d) => d.valor));
    for (const d of iaim) d.flojo = d.n > 0 && d.valor === min;
  }

  // ── casos por dominio ────────────────────────────────────────────────────────
  const totalCasos = raw.casos.total || 1;
  const casosPorDominio: BarraSimple[] = raw.casosDom
    .map((r) => ({
      etiqueta: r.d === 'sin_dominio' ? 'Sin dominio' : DOMINIOS[r.d] ?? r.d,
      valor: String(r.n),
      pct: Math.round((r.n / totalCasos) * 100),
      alerta: r.d === 'sin_dominio' && r.n > 0,
    }))
    .sort((a, b) => Number(b.valor) - Number(a.valor));

  // ── casos por mes ────────────────────────────────────────────────────────────
  const porMes = new Map(raw.casosMes.map((r) => [r.ym, r.n]));
  const buckets: BarraSimple[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ etiqueta: MESES[d.getMonth()]!, valor: String(porMes.get(ym) ?? 0), pct: 0 });
  }
  const maxMes = Math.max(1, ...buckets.map((b) => Number(b.valor)));
  for (const b of buckets) b.pct = Math.max(4, Math.round((Number(b.valor) / maxMes) * 100));

  // ── desempeño docente ────────────────────────────────────────────────────────
  const cola = new Map(raw.colaDoc.map((r) => [r.docente_id, r.cola]));
  const docentes: DocenteDesempeno[] = raw.valDoc.map((r) => {
    const q = cola.get(r.id_docente) ?? 0;
    return { id: r.id_docente, ini: iniciales(r.nombre), nombre: r.nombre, validados: r.validados, cola: q, alerta: q >= 8 };
  });

  const decididos = raw.casos.ap + raw.casos.re;
  const tasaAprobacion = decididos > 0 ? Math.round((raw.casos.ap / decididos) * 100) : null;

  return {
    alumnos: raw.alumnos,
    casos: {
      total: raw.casos.total,
      aprobados: raw.casos.ap,
      rechazados: raw.casos.re,
      pendientes: raw.casos.pe,
      tasaAprobacion,
    },
    casosPorMes: buckets,
    iaim,
    casosPorDominio,
    repaso: { conDecaimiento: raw.repaso.con_decaimiento, repasos: raw.repaso.repasos, dominiosMedidos: raw.repaso.medidos },
    docentes,
    ateneo: {
      casosSemana: raw.ateneo.casos_semana,
      casosTotal: raw.ateneo.casos_total,
      comentarios: raw.ateneo.comentarios,
      autores: raw.ateneo.autores,
      sinResponder: raw.ateneo.sin_responder,
    },
    ecoCorrecciones: raw.ecoCorr,
  };
}

import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';
import { haceCuanto } from '@/lib/format';
import type {
  CentroControlData,
  ActividadStaff,
  Decision,
  Alerta,
  PuntoTendencia,
} from './contrato';

/**
 * Lectura del Centro de control (dashboard admin / súper admin). TODO lo de dominio
 * corre CON RLS vía `comoStaff` (las policies `lxp.es_staff()` deciden qué ve el
 * staff, igual que en producción · §2/§10). Lo que hoy NO es dato de dominio legible
 * en local —cartera agregada de CORA, salud de integraciones/sistema, costo de Eco—
 * se devuelve como PLACEHOLDER claramente marcado (ver `contrato.ts`), a la espera
 * de su integración (§11) o su telemetría de infra.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Agrupa millares con espacio fino, como en el diseño ("1 284"). */
function miles(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function fechaLarga(hoy: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${dias[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
}

type FilaTotales = {
  alumnos_total: number;
  alumnos_activos: number;
  alumnos_nuevos_30: number;
  grupos_total: number;
  grupos_abiertos: number;
  grupos_cierran: number;
  programas_pub: number;
  programas_borrador: number;
  casos_mes: number;
  casos_pendientes: number;
  casos_aprobados: number;
  casos_pendientes_viejos: number;
  posts_pendientes: number;
  horas_aprobadas: number;
  ateneo_casos_semana: number;
  ateneo_comentarios: number;
  ateneo_sin_responder: number;
  en_riesgo: number;
};

export async function getCentroControl(
  userId: string,
  esSuper: boolean,
): Promise<CentroControlData> {
  const hoy = new Date();

  const { totales, tendenciaRows, actividadRows } = await comoStaff(userId, async (sql) => {
    // ── Totales del dominio (un solo viaje) ──────────────────────────────────
    const totales = (
      await sql<FilaTotales[]>`
        select
          (select count(*) filter (where rol = 'alumno') from lxp.perfiles)::int as alumnos_total,
          (select count(*) filter (where rol = 'alumno' and acceso_activo) from lxp.perfiles)::int as alumnos_activos,
          (select count(*) filter (where rol = 'alumno' and created_at >= now() - interval '30 days') from lxp.perfiles)::int as alumnos_nuevos_30,
          (select count(*) from lxp.grupos)::int as grupos_total,
          (select count(*) filter (where fecha_fin is null or fecha_fin >= current_date) from lxp.grupos)::int as grupos_abiertos,
          (select count(*) filter (where fecha_fin >= current_date and fecha_fin < current_date + interval '90 days') from lxp.grupos)::int as grupos_cierran,
          (select count(*) filter (where publicado) from lxp.programas)::int as programas_pub,
          (select count(*) filter (where not publicado) from lxp.programas)::int as programas_borrador,
          (select count(*) filter (where created_at >= date_trunc('month', now())) from lxp.bitacora_casos)::int as casos_mes,
          (select count(*) filter (where estado_validacion = 'pendiente') from lxp.bitacora_casos)::int as casos_pendientes,
          (select count(*) filter (where estado_validacion = 'aprobado') from lxp.bitacora_casos)::int as casos_aprobados,
          (select count(*) filter (where estado_validacion = 'pendiente' and created_at < now() - interval '7 days') from lxp.bitacora_casos)::int as casos_pendientes_viejos,
          (select count(*) filter (where estado = 'pendiente') from lxp.posts_ateneo)::int as posts_pendientes,
          (select coalesce(sum(horas_estimadas) filter (where estado_validacion = 'aprobado'), 0) from lxp.bitacora_casos)::float8 as horas_aprobadas,
          (select count(*) filter (where tipo = 'caso' and created_at >= now() - interval '7 days') from lxp.posts_ateneo)::int as ateneo_casos_semana,
          (select count(*) from lxp.comentarios_ateneo)::int as ateneo_comentarios,
          (select count(*) from lxp.posts_ateneo p
             where p.tipo = 'caso' and p.estado = 'aprobado'
               and not exists (select 1 from lxp.comentarios_ateneo c where c.post_id = p.id))::int as ateneo_sin_responder,
          (select count(*) from lxp.perfiles p
             where p.rol = 'alumno' and p.acceso_activo
               and not exists (
                 select 1 from lxp.bitacora_casos c
                 where c.id_alumno = p.user_id and c.created_at >= now() - interval '14 days'
               ))::int as en_riesgo
      `
    )[0]!;

    // ── Tendencia: nuevos alumnos por mes (últimos 6 meses) ──────────────────
    const tendenciaRows = await sql<{ ym: string; n: number }[]>`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as ym, count(*)::int as n
      from lxp.perfiles
      where rol = 'alumno' and created_at >= date_trunc('month', now()) - interval '5 months'
      group by 1`;

    // ── Actividad del staff: validaciones recientes por docente (últimos 3 días) ──
    const actividadRows = await sql<
      { id_docente: string; nombre: string; rol: string; n: number; ultimo: Date }[]
    >`
      select v.id_docente, pf.nombre, pf.rol::text as rol, count(*)::int as n, max(v.created_at) as ultimo
      from lxp.validaciones v
      join lxp.perfiles pf on pf.user_id = v.id_docente
      where v.created_at >= now() - interval '3 days'
      group by v.id_docente, pf.nombre, pf.rol
      order by ultimo desc
      limit 5`;

    return { totales, tendenciaRows, actividadRows };
  });

  // ── KPIs (reales) ──────────────────────────────────────────────────────────
  const kpis: CentroControlData['kpis'] = [
    {
      id: 'k1',
      titulo: 'Alumnos activos',
      valor: miles(totales.alumnos_activos),
      unidad: `de ${miles(totales.alumnos_total)} en total`,
      delta: totales.alumnos_nuevos_30 > 0 ? `+${totales.alumnos_nuevos_30} este mes` : undefined,
      deltaPositivo: totales.alumnos_nuevos_30 > 0,
      pie:
        totales.alumnos_total > 0
          ? `${Math.round((totales.alumnos_activos / totales.alumnos_total) * 100)}% con acceso al día`
          : 'sin alumnos aún',
      icono: 'alumnos',
    },
    {
      id: 'k2',
      titulo: 'Grupos abiertos',
      valor: miles(totales.grupos_abiertos),
      unidad: `de ${miles(totales.grupos_total)} creados`,
      delta: totales.grupos_cierran > 0 ? `${totales.grupos_cierran} cierran pronto` : undefined,
      pie: 'instancias de programa en curso',
      icono: 'grupos',
    },
    {
      id: 'k3',
      titulo: 'Programas activos',
      valor: miles(totales.programas_pub),
      unidad: 'plantillas vivas',
      delta: totales.programas_borrador > 0 ? `${totales.programas_borrador} en borrador` : undefined,
      pie: 'temario publicado a los grupos',
      icono: 'programas',
    },
    {
      id: 'k4',
      titulo: 'Casos este mes',
      valor: miles(totales.casos_mes),
      unidad: 'subidos a bitácora',
      delta: totales.casos_pendientes > 0 ? `${totales.casos_pendientes} por validar` : undefined,
      pie: `${miles(totales.casos_aprobados)} aprobados acumulados`,
      icono: 'inscripciones',
    },
  ];

  // ── Tendencia (últimos 6 meses; ejes siempre presentes) ─────────────────────
  const porMes = new Map(tendenciaRows.map((r) => [r.ym, r.n]));
  const buckets: { ym: string; mes: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ ym, mes: MESES[d.getMonth()]!, n: porMes.get(ym) ?? 0 });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));
  const puntos: PuntoTendencia[] = buckets.map((b) => ({
    mes: b.mes,
    valor: miles(b.n),
    altura: Math.max(6, Math.round((b.n / maxBucket) * 100)),
  }));

  const avanceCasos =
    totales.casos_mes + totales.casos_aprobados > 0
      ? Math.round((totales.casos_aprobados / (totales.casos_aprobados + totales.casos_pendientes || 1)) * 100)
      : 0;
  const alDia =
    totales.alumnos_total > 0
      ? Math.round((totales.alumnos_activos / totales.alumnos_total) * 100)
      : 0;

  // ── Actividad del staff (real) ──────────────────────────────────────────────
  const actividad: ActividadStaff[] = actividadRows.map((r) => ({
    id: r.id_docente,
    ini: iniciales(r.nombre),
    nombre: r.nombre,
    accion: `validó ${r.n} caso${r.n === 1 ? '' : 's'}`,
    meta: haceCuanto(r.ultimo, hoy),
    rol: r.rol === 'docente' ? 'docente' : r.rol === 'admin' || r.rol === 'super_admin' ? 'admin' : 'diseñador',
  }));

  // ── Requiere su decisión (real; solo lo que exista) ─────────────────────────
  const decisiones: Decision[] = [];
  if (totales.casos_pendientes > 0) {
    decisiones.push({
      id: 'd-casos',
      n: totales.casos_pendientes,
      titulo: 'casos por validar',
      detalle: 'esperan el criterio clínico del docente',
      cta: 'Ver bandeja',
      icono: 'escaladas',
    });
  }
  if (totales.posts_pendientes > 0) {
    decisiones.push({
      id: 'd-ateneo',
      n: totales.posts_pendientes,
      titulo: 'posts del Ateneo por moderar',
      detalle: 'casos y encuestas a la espera de aprobación',
      cta: 'Moderar',
      icono: 'accesos',
    });
  }
  if (totales.programas_borrador > 0) {
    decisiones.push({
      id: 'd-borradores',
      n: totales.programas_borrador,
      titulo: 'programas en borrador',
      detalle: 'temario sin publicar a ningún grupo',
      cta: 'Revisar',
      icono: 'certificados',
    });
  }

  // ── Alertas derivadas de dominio (súper admin) ──────────────────────────────
  const alertas: Alerta[] = [];
  if (totales.casos_pendientes_viejos > 0) {
    alertas.push({
      id: 'al-viejos',
      titulo: `${totales.casos_pendientes_viejos} casos llevan +7 días pendientes`,
      detalle: 'La validación se está rezagando; revise la carga de los docentes.',
      gravedad: totales.casos_pendientes_viejos >= 10 ? 'critica' : 'media',
    });
  }
  if (totales.en_riesgo > 0) {
    alertas.push({
      id: 'al-riesgo',
      titulo: `${totales.en_riesgo} alumnos sin actividad reciente`,
      detalle: 'Sin casos subidos en 14 días; conviene un recordatorio o seguimiento.',
      gravedad: 'media',
    });
  }

  return {
    esSuper,
    fecha: fechaLarga(hoy),
    kpis,
    tendencia: {
      puntos,
      resumen: [
        { valor: miles(totales.alumnos_activos), etiqueta: 'alumnos activos' },
        { valor: miles(totales.casos_mes), etiqueta: 'casos este mes' },
        { valor: `${miles(totales.horas_aprobadas)} h`, etiqueta: 'acreditadas' },
      ],
    },
    avance: [
      { titulo: 'Alumnos con acceso al día', pct: alDia, detalle: `${miles(totales.alumnos_activos)} de ${miles(totales.alumnos_total)}` },
      { titulo: 'Casos validados vs. pendientes', pct: avanceCasos, detalle: `${miles(totales.casos_aprobados)} aprobados · ${miles(totales.casos_pendientes)} en cola` },
    ],
    riesgo: {
      n: totales.en_riesgo,
      detalle: 'alumnos activos sin subir un caso en 14+ días',
    },
    // ── PLACEHOLDER · cartera llega de CORA (agregado no legible en local · §11) ──
    cartera: {
      disponible: false,
      pctAlCorriente: '—',
      cortes: [
        { etiqueta: 'Al corriente', valor: '—', tono: 'ok' },
        { etiqueta: 'Por vencer', valor: '—', tono: 'porVencer' },
        { etiqueta: 'Vencido', valor: '—', tono: 'vencido' },
      ],
      ultimoCorte: 'pendiente de integración',
    },
    // ── PLACEHOLDER · telemetría de infra (no es dato de dominio) ────────────────
    integraciones: [
      { id: 'i-cora', nombre: 'CORA · ERP', estado: 'ok', detalle: 'Identidad compartida (mock local)', meta: 'local', icono: 'cora' },
      { id: 'i-zoom', nombre: 'Zoom', estado: 'ok', detalle: 'Pendiente de cablear (§6)', meta: '—', icono: 'zoom' },
      { id: 'i-lrs', nombre: 'LRS · xAPI', estado: 'ok', detalle: 'Store de eventos local', meta: '—', icono: 'correo' },
    ],
    gastoIA: {
      monto: '—',
      moneda: 'MXN',
      periodo: fechaLargaMes(hoy),
      pctTope: 0,
      tope: 'sin configurar',
      desglose: [],
    },
    sistema: [
      { titulo: 'Almacenamiento DICOM y video', valor: '—', detalle: 'métrica de infra pendiente (§11)', icono: 'almacenamiento' },
      { titulo: 'Colas y workers', valor: '—', detalle: 'telemetría de BullMQ pendiente', icono: 'colas' },
      { titulo: 'LRS · xAPI', valor: '—', detalle: 'conteo de eventos pendiente', icono: 'lrs' },
    ],
    alertas,
    decisiones,
    actividad,
    ateneo: {
      casos: totales.ateneo_casos_semana,
      comentarios: totales.ateneo_comentarios,
      sinResponder: totales.ateneo_sin_responder,
    },
    // ── PLACEHOLDER · Eco analista (respuesta mock; dominio por API · §7A) ───────
    eco: {
      pregunta: 'Resúmeme la semana',
      intro: 'Eco (analista) es un placeholder en esta etapa. Cuando su API esté cableada, aquí responderá con lenguaje natural sobre la operación. Por ahora, un vistazo a lo real:',
      puntos: [
        totales.casos_pendientes > 0
          ? { titulo: `${totales.casos_pendientes} casos por validar`, detalle: 'la bandeja del docente los espera', tono: 'media' as const }
          : { titulo: 'Bandeja de validación al día', detalle: 'no hay casos pendientes', tono: 'info' as const },
        totales.en_riesgo > 0
          ? { titulo: `${totales.en_riesgo} alumnos en riesgo`, detalle: 'sin actividad en 14 días', tono: 'media' as const }
          : { titulo: 'Sin alumnos en riesgo', detalle: 'todos con actividad reciente', tono: 'info' as const },
      ],
      cierre: `Se han acreditado ${miles(totales.horas_aprobadas)} h en total y hay ${miles(totales.casos_aprobados)} casos aprobados.`,
      sugerencias: ['¿Qué grupos van en riesgo?', '¿Cómo va la validación?', '¿Qué staff está más cargado?'],
    },
  };
}

function fechaLargaMes(hoy: Date): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return meses[hoy.getMonth()]!;
}

import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { fechaCorta, haceCuanto } from '@/lib/format';
import {
  contarCampos,
  normalizarEstructura,
  type ValoresReporte,
} from '@/lib/reportes/estructura';
import {
  datosPacienteVacios,
  type CasoDicomOpcion,
  type ContenidoReporte,
  type DatosPaciente,
  type EstadoReporte,
  type PlantillaOpcion,
  type ReporteDetalle,
  type ReporteListItem,
  type ReportesData,
} from './_contrato';

/**
 * Lectura de reportes clínicos del médico CON RLS (§2/§10). CRUD simple `web → Supabase`
 * — NO pasa por NestJS (Regla de Oro §2). `reportes_select` (id_medico = auth.uid()) y
 * `plantillas_reporte_select` (publicado) son los candados. La forma del reporte sale de
 * la plantilla en BD (`plantillas_reporte.estructura`), no de un placeholder hardcodeado.
 */

function estadoValido(v: string): EstadoReporte {
  return v === 'finalizado' || v === 'enviado' ? v : 'borrador';
}

function normalizarContenido(raw: unknown, fallbackFolio: string): ContenidoReporte {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<ContenidoReporte>;
  const valores: ValoresReporte =
    o.valores && typeof o.valores === 'object' ? (o.valores as ValoresReporte) : {};
  return {
    folio: typeof o.folio === 'string' ? o.folio : fallbackFolio,
    plantillaId: typeof o.plantillaId === 'string' ? o.plantillaId : null,
    valores,
    impresion: typeof o.impresion === 'string' ? o.impresion : '',
  };
}

function normalizarPaciente(d: Partial<DatosPaciente> | null): DatosPaciente {
  const base = datosPacienteVacios();
  if (!d || typeof d !== 'object') return base;
  // Preserva el valor tal cual (incluye boolean/array de campos no-string en el encabezado);
  // ya NO se coacciona a "" (eso perdía sino/multiseleccion al recargar).
  for (const [k, v] of Object.entries(d)) base[k] = v;
  return base;
}

/** Lectura como texto de un campo de paciente (para columnas/resumen); no-string ⇒ "". */
function campoP(p: DatosPaciente, id: string): string {
  const v = p[id];
  return typeof v === 'string' ? v.trim() : '';
}

/** "42 · Masculino" para la columna del listado (edad y sexo ya separados). */
function edadSexo(p: DatosPaciente): string {
  return [campoP(p, 'edad'), campoP(p, 'sexo')].filter(Boolean).join(' · ');
}


function nota(estado: EstadoReporte, paciente: DatosPaciente, tieneImpresion: boolean): string {
  if (estado === 'enviado') return 'Enviado al paciente';
  if (estado === 'finalizado') return 'Listo para enviar';
  if (!campoP(paciente, 'paciente')) return 'Sin datos del paciente';
  if (!tieneImpresion) return 'Falta impresión diagnóstica';
  return 'Sin finalizar';
}

/** Plantillas publicadas para el diálogo "Nuevo reporte" (RLS: publicado). */
async function getPlantillasPublicadas(
  sql: Parameters<Parameters<typeof comoAlumno>[1]>[0],
): Promise<PlantillaOpcion[]> {
  const rows = await sql<{ id: string; nombre: string; tipo_estudio: string | null; estructura: unknown }[]>`
    select id, nombre, tipo_estudio, estructura
    from lxp.plantillas_reporte where publicado order by nombre`;
  return rows.map((r) => {
    const est = normalizarEstructura(r.estructura);
    return {
      id: r.id,
      nombre: r.nombre,
      tipoEstudio: r.tipo_estudio ?? '',
      secciones: est.secciones.length,
      campos: contarCampos(est),
    };
  });
}

/** Parámetros de paginación/filtro del listado (ya validados/normalizados por la page). */
export type ParamsReportes = {
  page: number;
  size: number;
  estado: 'todos' | EstadoReporte;
  estudio: string; // '' = todos
  q: string;
};

/** Fila LIGERA del listado: solo lo que muestra la tabla; imágenes contadas EN SQL (sin jsonb pesado). */
type FilaListado = {
  id: string;
  estado: string;
  folio: string | null;
  paciente: string | null;
  edad: string | null;
  sexo: string | null;
  tiene_impresion: boolean;
  plantilla_nombre: string | null;
  plantilla_tipo: string | null;
  imagenes: number;
  created_at: Date;
};

/**
 * Listado de reportes del médico PAGINADO EN EL SERVIDOR (§6.5). Tres consultas ligeras, todas
 * bajo RLS (id_medico = auth.uid()):
 *   1) KPIs GLOBALES (todo el conjunto del usuario, sin filtro ni página) — agregación.
 *   2) COUNT del conjunto YA FILTRADO (para nº de páginas / mostrar el paginador).
 *   3) La PÁGINA (LIMIT/OFFSET), solo campos de la fila; el nº de imágenes se cuenta EN SQL.
 * Orden estable: created_at DESC, id DESC (índice `reportes_medico_creado_idx`). Nunca trae todo.
 */
export async function getReportes(userId: string, params: ParamsReportes): Promise<ReportesData> {
  const { page, size, estado, estudio, q } = params;
  const offset = (page - 1) * size;
  return comoAlumno(userId, async (sql) => {
    // Filtro server-side COMPARTIDO por el COUNT y la página (mismo conjunto exacto).
    const like = `%${q.trim()}%`;
    const cond = sql`
      r.id_medico = ${userId}
      ${estado !== 'todos' ? sql`and r.estado = ${estado}` : sql``}
      ${estudio ? sql`and p.tipo_estudio = ${estudio}` : sql``}
      ${
        q.trim()
          ? sql`and (
              r.contenido->>'folio' ilike ${like}
              or r.datos_paciente->>'paciente' ilike ${like}
              or p.nombre ilike ${like}
              or coalesce(p.tipo_estudio, '') ilike ${like}
            )`
          : sql``
      }
    `;

    // 1) KPIs GLOBALES — independientes del filtro y de la página (solo id_medico).
    const [kpi] = await sql<
      {
        total: number;
        borradores: number;
        finalizados: number;
        enviados: number;
        enviados_semana: number;
        del_mes: number;
      }[]
    >`
      select
        count(*)::int as total,
        count(*) filter (where estado = 'borrador')::int as borradores,
        count(*) filter (where estado = 'finalizado')::int as finalizados,
        count(*) filter (where estado = 'enviado')::int as enviados,
        count(*) filter (where estado = 'enviado' and updated_at > now() - interval '7 days')::int as enviados_semana,
        count(*) filter (where created_at > now() - interval '30 days')::int as del_mes
      from lxp.reportes where id_medico = ${userId}`;

    // 2) COUNT del conjunto YA FILTRADO.
    const [c] = await sql<{ total: number }[]>`
      select count(*)::int as total
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where ${cond}`;
    const total = c?.total ?? 0;

    // 3) La PÁGINA (LIMIT/OFFSET). Imágenes contadas en SQL (galería array/{imagenes} + dicom {casoId}).
    const filas = await sql<FilaListado[]>`
      select
        r.id, r.estado,
        r.contenido->>'folio' as folio,
        r.datos_paciente->>'paciente' as paciente,
        r.datos_paciente->>'edad' as edad,
        r.datos_paciente->>'sexo' as sexo,
        (coalesce(r.contenido->>'impresion', '') <> '') as tiene_impresion,
        p.nombre as plantilla_nombre, p.tipo_estudio as plantilla_tipo,
        coalesce((
          select sum(case
            when jsonb_typeof(v.value) = 'array' then jsonb_array_length(v.value)
            when jsonb_typeof(v.value) = 'object' and v.value ? 'imagenes'
                 and jsonb_typeof(v.value->'imagenes') = 'array' then jsonb_array_length(v.value->'imagenes')
            when jsonb_typeof(v.value) = 'object' and v.value ? 'casoId' then 1
            else 0 end)
          from jsonb_each(
            case when jsonb_typeof(r.contenido) = 'object'
                 then coalesce(r.contenido->'valores', '{}'::jsonb) else '{}'::jsonb end
          ) v
        ), 0)::int as imagenes,
        r.created_at
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where ${cond}
      order by r.created_at desc, r.id desc
      limit ${size} offset ${offset}`;

    const plantillas = await getPlantillasPublicadas(sql);

    const items: ReporteListItem[] = filas.map((f) => {
      const est = estadoValido(f.estado);
      const pac: DatosPaciente = {
        paciente: f.paciente ?? '',
        edad: f.edad ?? '',
        sexo: f.sexo ?? '',
      };
      return {
        id: f.id,
        folio: f.folio || 'RPT-0000',
        paciente: campoP(pac, 'paciente') || 'Sin nombre',
        edadSexo: edadSexo(pac) || '—',
        plantilla: f.plantilla_nombre ?? '—',
        tipoEstudio: f.plantilla_tipo ?? '',
        fecha: fechaCorta(new Date(f.created_at)),
        estado: est,
        imagenes: f.imagenes,
        nota: nota(est, pac, f.tiene_impresion),
      };
    });

    const conteos = {
      todos: kpi?.total ?? 0,
      borradores: kpi?.borradores ?? 0,
      finalizados: kpi?.finalizados ?? 0,
      enviados: kpi?.enviados ?? 0,
    };
    const resumen = {
      borradores: kpi?.borradores ?? 0,
      listos: kpi?.finalizados ?? 0,
      enviadosSemana: kpi?.enviados_semana ?? 0,
      delMes: kpi?.del_mes ?? 0,
    };

    return { resumen, conteos, plantillas, items, total, page, size, filtro: { estado, estudio, q } };
  });
}

type FilaDetalle = {
  id: string;
  estado: string;
  datos_paciente: Partial<DatosPaciente> | null;
  contenido: unknown;
  caso_generado_id: string | null;
  plantilla_nombre: string | null;
  plantilla_tipo: string | null;
  plantilla_id: string | null;
  plantilla_estructura: unknown;
  created_at: Date;
  updated_at: Date;
};

export async function getReporte(userId: string, id: string): Promise<ReporteDetalle | null> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<FilaDetalle[]>`
      select r.id, r.estado, r.datos_paciente, r.contenido, r.caso_generado_id,
             r.created_at, r.updated_at, r.plantilla_id,
             p.nombre as plantilla_nombre, p.tipo_estudio as plantilla_tipo,
             p.estructura as plantilla_estructura
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where r.id = ${id} and r.id_medico = ${userId}
      limit 1`;
    const f = filas[0];
    if (!f) return null;

    const contenido = normalizarContenido(f.contenido, 'RPT-0000');
    const plantilla =
      f.plantilla_id && f.plantilla_nombre
        ? {
            id: f.plantilla_id,
            nombre: f.plantilla_nombre,
            tipoEstudio: f.plantilla_tipo ?? '',
            estructura: normalizarEstructura(f.plantilla_estructura),
          }
        : null;

    return {
      id: f.id,
      estado: estadoValido(f.estado),
      guardado: haceCuanto(new Date(f.updated_at)),
      datosPaciente: normalizarPaciente(f.datos_paciente),
      contenido,
      casoGeneradoId: f.caso_generado_id,
      plantilla,
    };
  });
}

/** Casos de la bitácora del médico con estudio DICOM listo — para insertar en el reporte. */
export async function getCasosDicomDelMedico(userId: string): Promise<CasoDicomOpcion[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      { id: string; organo: string | null; hallazgos: string | null; series: number; created_at: Date }[]
    >`
      select c.id, c.organo, c.hallazgos,
             coalesce(jsonb_array_length(c.estudio_series), 0)::int as series,
             c.created_at
      from lxp.bitacora_casos c
      where c.id_alumno = ${userId}
        and coalesce(jsonb_array_length(c.estudio_series), 0) > 0
      order by c.created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      titulo: (r.organo?.trim() || r.hallazgos?.trim()?.slice(0, 48) || 'Estudio sin título').slice(0, 60),
      series: r.series,
      fecha: fechaCorta(new Date(r.created_at)),
    }));
  });
}

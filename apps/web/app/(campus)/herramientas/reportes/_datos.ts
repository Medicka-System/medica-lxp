import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { fechaCorta, haceCuanto } from '@/lib/format';
import {
  contarCampos,
  leerRefDicom,
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
  for (const [k, v] of Object.entries(d)) base[k] = typeof v === 'string' ? v : '';
  return base;
}

function campoP(p: DatosPaciente, id: string): string {
  return (p[id] ?? '').trim();
}

/** "42 · Masculino" para la columna del listado (edad y sexo ya separados). */
function edadSexo(p: DatosPaciente): string {
  return [campoP(p, 'edad'), campoP(p, 'sexo')].filter(Boolean).join(' · ');
}

function contarImagenes(c: ContenidoReporte): number {
  return Object.values(c.valores).filter((v) => leerRefDicom(v) !== null).length;
}

function nota(estado: EstadoReporte, paciente: DatosPaciente, contenido: ContenidoReporte): string {
  if (estado === 'enviado') return 'Enviado al paciente';
  if (estado === 'finalizado') return 'Listo para enviar';
  if (!campoP(paciente, 'paciente')) return 'Sin datos del paciente';
  if (!contenido.impresion.trim()) return 'Falta impresión diagnóstica';
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

type FilaReporte = {
  id: string;
  estado: string;
  datos_paciente: Partial<DatosPaciente> | null;
  contenido: unknown;
  caso_generado_id: string | null;
  plantilla_nombre: string | null;
  plantilla_tipo: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getReportes(userId: string): Promise<ReportesData> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<FilaReporte[]>`
      select r.id, r.estado, r.datos_paciente, r.contenido, r.caso_generado_id,
             r.created_at, r.updated_at,
             p.nombre as plantilla_nombre, p.tipo_estudio as plantilla_tipo
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where r.id_medico = ${userId}
      order by r.created_at desc`;

    const plantillas = await getPlantillasPublicadas(sql);

    const ahora = Date.now();
    const semana = 7 * 24 * 3600 * 1000;
    const mes = 30 * 24 * 3600 * 1000;

    const items: ReporteListItem[] = filas.map((f, idx) => {
      const estado = estadoValido(f.estado);
      const contenido = normalizarContenido(
        f.contenido,
        `RPT-${String(filas.length - idx).padStart(4, '0')}`,
      );
      const paciente = normalizarPaciente(f.datos_paciente);
      return {
        id: f.id,
        folio: contenido.folio,
        paciente: campoP(paciente, 'paciente') || 'Sin nombre',
        edadSexo: edadSexo(paciente) || '—',
        plantilla: f.plantilla_nombre ?? '—',
        tipoEstudio: f.plantilla_tipo ?? '',
        fecha: fechaCorta(new Date(f.created_at)),
        estado,
        imagenes: contarImagenes(contenido),
        nota: nota(estado, paciente, contenido),
      };
    });

    const conteos = {
      todos: items.length,
      borradores: items.filter((i) => i.estado === 'borrador').length,
      finalizados: items.filter((i) => i.estado === 'finalizado').length,
      enviados: items.filter((i) => i.estado === 'enviado').length,
    };
    const resumen = {
      borradores: conteos.borradores,
      listos: conteos.finalizados,
      enviadosSemana: filas.filter(
        (f) =>
          estadoValido(f.estado) === 'enviado' && ahora - new Date(f.updated_at).getTime() < semana,
      ).length,
      delMes: filas.filter((f) => ahora - new Date(f.created_at).getTime() < mes).length,
    };

    return { resumen, conteos, plantillas, items };
  });
}

export async function getReporte(userId: string, id: string): Promise<ReporteDetalle | null> {
  return comoAlumno(userId, async (sql) => {
    const filas = await sql<
      (FilaReporte & { plantilla_id: string | null; plantilla_estructura: unknown })[]
    >`
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

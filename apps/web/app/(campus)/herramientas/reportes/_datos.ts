import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { fechaCorta, haceCuanto } from '@/lib/format';
import {
  datosPacienteVacios,
  piezasPorDefecto,
  plantillaDe,
  PLANTILLAS,
  type ContenidoReporte,
  type DatosPaciente,
  type EstadoReporte,
  type ReporteDetalle,
  type ReporteListItem,
  type ReportesData,
  type TipoEstudio,
} from './_contrato';

/**
 * Lectura de reportes clínicos del médico CON RLS (§2/§10). CRUD simple
 * `web → Supabase` — NO pasa por NestJS (Regla de Oro §2). La policy `reportes_select`
 * (id_medico = auth.uid()) es el segundo candado. La generación de PDF y el envío por
 * correo SÍ son dominio y viven en `api` (PENDIENTE): aquí solo se leen los datos.
 */

type FilaReporte = {
  id: string;
  estado: string;
  datos_paciente: Partial<DatosPaciente> | null;
  contenido: Partial<ContenidoReporte> | null;
  caso_generado_id: string | null;
  created_at: Date;
  updated_at: Date;
};

function estadoValido(v: string): EstadoReporte {
  return v === 'finalizado' || v === 'enviado' ? v : 'borrador';
}

function tipoValido(v: unknown): TipoEstudio {
  return PLANTILLAS.some((p) => p.tipo === v) ? (v as TipoEstudio) : 'Abdominal';
}

/** Normaliza el jsonb persistido a un contenido completo (tolera reportes viejos/parciales). */
function normalizarContenido(
  contenido: Partial<ContenidoReporte> | null,
  fallbackFolio: string,
): ContenidoReporte {
  const tipo = tipoValido(contenido?.tipo);
  const plantilla = plantillaDe(tipo);
  const guardadas = contenido?.secciones ?? [];
  const secciones = plantilla.secciones.map((titulo, i) => {
    const previa = guardadas.find((s) => s.titulo === titulo) ?? guardadas[i];
    return {
      id: `s${i + 1}`,
      titulo,
      texto: previa?.texto ?? '',
      imagenesInsertadas: previa?.imagenesInsertadas ?? 0,
    };
  });
  return {
    folio: contenido?.folio ?? fallbackFolio,
    tipo,
    secciones,
    impresion: contenido?.impresion ?? '',
    piezas: contenido?.piezas ?? piezasPorDefecto(),
  };
}

function normalizarPaciente(d: Partial<DatosPaciente> | null): DatosPaciente {
  return { ...datosPacienteVacios(), ...(d ?? {}) };
}

function nota(estado: EstadoReporte, paciente: DatosPaciente, contenido: ContenidoReporte): string {
  if (estado === 'enviado') return 'Enviado al paciente';
  if (estado === 'finalizado') return 'Listo para enviar';
  if (!paciente.paciente.trim()) return 'Sin datos del paciente';
  if (!contenido.impresion.trim()) return 'Falta impresión diagnóstica';
  return 'Sin finalizar';
}

export async function getReportes(userId: string): Promise<ReportesData> {
  const filas = await comoAlumno(userId, (sql) =>
    sql<FilaReporte[]>`
      select id, estado, datos_paciente, contenido, caso_generado_id, created_at, updated_at
      from lxp.reportes
      where id_medico = ${userId}
      order by created_at desc`,
  );

  const ahora = Date.now();
  const semana = 7 * 24 * 3600 * 1000;
  const mes = 30 * 24 * 3600 * 1000;

  const items: ReporteListItem[] = filas.map((f, idx) => {
    const estado = estadoValido(f.estado);
    const contenido = normalizarContenido(f.contenido, `RPT-${String(filas.length - idx).padStart(4, '0')}`);
    const paciente = normalizarPaciente(f.datos_paciente);
    return {
      id: f.id,
      folio: contenido.folio,
      paciente: paciente.paciente.trim() || 'Sin nombre',
      edadSexo: paciente.edadSexo.trim() || '—',
      tipo: contenido.tipo,
      fecha: fechaCorta(new Date(f.created_at)),
      estado,
      imagenes: contenido.piezas.filter((p) => p.insertada).length,
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
      (f) => estadoValido(f.estado) === 'enviado' && ahora - new Date(f.updated_at).getTime() < semana,
    ).length,
    delMes: filas.filter((f) => ahora - new Date(f.created_at).getTime() < mes).length,
  };

  return { resumen, conteos, plantillas: PLANTILLAS, items };
}

export async function getReporte(userId: string, id: string): Promise<ReporteDetalle | null> {
  const filas = await comoAlumno(userId, (sql) =>
    sql<FilaReporte[]>`
      select id, estado, datos_paciente, contenido, caso_generado_id, created_at, updated_at
      from lxp.reportes
      where id = ${id} and id_medico = ${userId}
      limit 1`,
  );
  const f = filas[0];
  if (!f) return null;
  const contenido = normalizarContenido(f.contenido, 'RPT-0000');
  return {
    id: f.id,
    estado: estadoValido(f.estado),
    guardado: haceCuanto(new Date(f.updated_at)),
    datosPaciente: normalizarPaciente(f.datos_paciente),
    contenido,
    casoGeneradoId: f.caso_generado_id,
  };
}

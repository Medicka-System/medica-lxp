import { getSesionAlumno } from '@/lib/session';
import { getReportes } from './_datos';
import { ListadoReportes } from './_components/listado-reportes';
import { TAMANOS_PAGINA, type EstadoReporte } from './_contrato';

export const dynamic = 'force-dynamic';

/** Tamaño de página válido (25/50/100); default 25. */
function parseSize(v: string | undefined): number {
  const n = Number(v);
  return (TAMANOS_PAGINA as readonly number[]).includes(n) ? n : 25;
}
function parseEstado(v: string | undefined): 'todos' | EstadoReporte {
  return v === 'borrador' || v === 'finalizado' || v === 'enviado' ? v : 'todos';
}

/**
 * "Mis reportes" — paginado en el SERVIDOR: los filtros (estado/estudio/búsqueda) y la página
 * viven en la URL (?estado=…&estudio=…&q=…&page=2&size=50) para sobrevivir recarga y botón atrás.
 */
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; estado?: string; estudio?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const alumno = await getSesionAlumno();

  const size = parseSize(sp.size);
  const pageRaw = Number(sp.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const estado = parseEstado(sp.estado);
  const estudio = (sp.estudio ?? '').trim();
  const q = (sp.q ?? '').trim();

  const data = await getReportes(alumno.userId, { page, size, estado, estudio, q });
  return <ListadoReportes data={data} />;
}

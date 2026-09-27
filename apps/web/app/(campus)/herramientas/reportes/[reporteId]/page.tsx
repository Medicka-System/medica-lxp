import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getReporte } from '../_datos';
import { EditorReporte } from '../_components/editor-reporte';

export const dynamic = 'force-dynamic';

export default async function ReportePage({
  params,
}: {
  params: Promise<{ reporteId: string }>;
}) {
  const { reporteId } = await params;
  const alumno = await getSesionAlumno();
  const reporte = await getReporte(alumno.userId, reporteId);
  if (!reporte) notFound();
  return <EditorReporte reporte={reporte} />;
}

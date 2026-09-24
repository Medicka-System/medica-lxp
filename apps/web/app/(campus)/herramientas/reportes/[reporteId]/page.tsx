import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getReporte, getCasosDicomDelMedico } from '../_datos';
import { EditorReporte } from '../_components/editor-reporte';

export const dynamic = 'force-dynamic';

export default async function ReportePage({
  params,
}: {
  params: Promise<{ reporteId: string }>;
}) {
  const { reporteId } = await params;
  const alumno = await getSesionAlumno();
  const [reporte, casosDicom] = await Promise.all([
    getReporte(alumno.userId, reporteId),
    getCasosDicomDelMedico(alumno.userId),
  ]);
  if (!reporte) notFound();
  return <EditorReporte reporte={reporte} casosDicom={casosDicom} />;
}

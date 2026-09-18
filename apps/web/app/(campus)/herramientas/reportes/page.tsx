import { getSesionAlumno } from '@/lib/session';
import { getReportes } from './_datos';
import { ListadoReportes } from './_components/listado-reportes';

export const dynamic = 'force-dynamic';

export default async function ReportesPage() {
  const alumno = await getSesionAlumno();
  const data = await getReportes(alumno.userId);
  return <ListadoReportes data={data} />;
}

import { getSesionAlumno } from '@/lib/session';
import { getConsultasChat } from '@/lib/campus/consultas-chat';
import { ConsultasCliente } from './_components/consultas-cliente';

export const dynamic = 'force-dynamic';

/**
 * Consultas · chat 1:1 del alumno con docentes, staff y colegas (§ Sprint 5.5). Contraparte
 * de la consola del docente (Studio) sobre el MISMO motor. Sin Eco / sin realtime aquí.
 */
export default async function ConsultasPage() {
  const alumno = await getSesionAlumno();
  const data = await getConsultasChat(alumno.userId);
  return <ConsultasCliente data={data} />;
}

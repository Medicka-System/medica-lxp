import { getSesionAlumno } from '@/lib/session';
import { getConsultasAlumno } from '@/lib/campus/consultas-datos';
import { ConsultasCliente } from './_components/consultas-cliente';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultas · Campus Médica' };

/** Consultas 1:1 del alumno (§5B · Sprint 8.5, lado alumno). */
export default async function ConsultasPage() {
  const alumno = await getSesionAlumno();
  const consultas = await getConsultasAlumno(alumno.userId);
  return <ConsultasCliente consultas={consultas} />;
}

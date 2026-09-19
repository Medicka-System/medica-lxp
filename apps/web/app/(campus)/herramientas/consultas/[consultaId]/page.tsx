import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getConsultaAlumno } from '@/lib/campus/consultas-datos';
import { HiloConsulta } from './_components/hilo-consulta';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consulta · Campus Médica' };

/** Hilo de una consulta 1:1 del alumno (§5B · Sprint 8.5, lado alumno). */
export default async function ConsultaHiloPage({
  params,
}: {
  params: Promise<{ consultaId: string }>;
}) {
  const { consultaId } = await params;
  const alumno = await getSesionAlumno();
  const consulta = await getConsultaAlumno(alumno.userId, consultaId);
  if (!consulta) notFound();
  return <HiloConsulta consulta={consulta} />;
}

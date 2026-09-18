import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getExpediente } from '../_components/_data';
import { ExpedienteAlumno } from './_components/expediente';

export const dynamic = 'force-dynamic';

/** Studio · Expediente del alumno. Avance en el campus CON RLS; CORA/Eco placeholder. */
export default async function ExpedientePage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  const { alumnoId } = await params;
  const staff = await getSesionStaff();
  const e = await getExpediente(staff.userId, alumnoId);
  if (!e) notFound();
  return <ExpedienteAlumno e={e} />;
}

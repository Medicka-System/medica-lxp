import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getDetalleStaff } from '../_components/_data';
import { DetalleStaffVista } from './_components/detalle-staff';

export const dynamic = 'force-dynamic';

/** Studio · Detalle de un miembro del staff. Carga CON RLS; rol/permisos placeholder. */
export default async function DetalleStaffPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const sesion = await getSesionStaff();
  const d = await getDetalleStaff(sesion.userId, staffId);
  if (!d) notFound();
  return <DetalleStaffVista d={d} />;
}

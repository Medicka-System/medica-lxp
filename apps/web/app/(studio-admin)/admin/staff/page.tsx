import { getSesionStaff } from '@/lib/studio/session';
import { getStaff } from './_components/_data';
import { StaffLista } from './_components/staff-lista';

export const dynamic = 'force-dynamic';

/** Studio · Staff (lista operativa). Equipo y su carga CON RLS (§2/§5B). */
export default async function StaffPage() {
  const staff = await getSesionStaff();
  const data = await getStaff(staff.userId);
  return <StaffLista data={data} />;
}

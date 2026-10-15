import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos } from '@/lib/studio/datos';
import { GruposTabla } from './_components/grupos-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Grupos (lista). Lee los grupos con RLS. Los grupos nacen en CORA y se
 * reflejan solos en el LXP (PUENTE 1 · mig 0082) — no se crean a mano aquí.
 */
export default async function GruposPage() {
  const staff = await getSesionStaff();
  const grupos = await getGrupos(staff.userId);
  return <GruposTabla grupos={grupos} />;
}

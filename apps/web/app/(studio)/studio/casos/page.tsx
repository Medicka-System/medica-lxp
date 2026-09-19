import { getSesionStaff } from '@/lib/studio/session';
import { getCasos } from '@/lib/studio/datos';
import { CasosBanco } from './_components/casos-banco';

export const dynamic = 'force-dynamic';

/** Studio · Casos (curaduría del banco). Lee lxp.casos_biblioteca con RLS. */
export default async function CasosPage() {
  const staff = await getSesionStaff();
  const casos = await getCasos(staff.userId);
  return <CasosBanco casos={casos} />;
}

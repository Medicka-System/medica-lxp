import { getSesionStaff } from '@/lib/studio/session';
import { getHerramientas, getConteosHerramientas } from '@/lib/studio/datos';
import { HerramientasAdmin } from '../_components/herramientas-admin';

export const dynamic = 'force-dynamic';

export default async function SimuladoresPage() {
  const staff = await getSesionStaff();
  const [items, conteos] = await Promise.all([
    getHerramientas(staff.userId, 'simuladores'),
    getConteosHerramientas(staff.userId),
  ]);
  return <HerramientasAdmin tipo="simuladores" items={items} conteos={conteos} />;
}

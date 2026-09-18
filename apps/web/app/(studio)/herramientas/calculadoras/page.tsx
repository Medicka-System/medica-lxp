import { getSesionStaff } from '@/lib/studio/session';
import { getHerramientas, getConteosHerramientas } from '@/lib/studio/datos';
import { HerramientasAdmin } from '../_components/herramientas-admin';

export const dynamic = 'force-dynamic';

export default async function CalculadorasPage() {
  const staff = await getSesionStaff();
  const [items, conteos] = await Promise.all([
    getHerramientas(staff.userId, 'calculadoras'),
    getConteosHerramientas(staff.userId),
  ]);
  return <HerramientasAdmin tipo="calculadoras" items={items} conteos={conteos} />;
}

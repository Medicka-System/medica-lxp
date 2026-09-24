import { getSesionStaff } from '@/lib/studio/session';
import { getHerramientas, getConteosHerramientas } from '@/lib/studio/datos';
import { HerramientasAdmin } from '../_components/herramientas-admin';

export const dynamic = 'force-dynamic';

export default async function PlantillasPage() {
  const staff = await getSesionStaff();
  const [items, conteos] = await Promise.all([
    getHerramientas(staff.userId, 'plantillas'),
    getConteosHerramientas(staff.userId),
  ]);
  return (
    <HerramientasAdmin
      tipo="plantillas"
      items={items}
      conteos={conteos}
      rutaBase="/studio/herramientas/plantillas"
    />
  );
}

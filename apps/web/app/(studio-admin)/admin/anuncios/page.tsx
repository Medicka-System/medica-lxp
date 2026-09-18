import { getSesionStaff } from '@/lib/studio/session';
import { getAnuncios } from './_components/_data';
import { AnunciosGestor } from './_components/anuncios-gestor';

export const dynamic = 'force-dynamic';

/**
 * Studio · Anuncios (gestor). Lectura y creación reales bajo RLS (§2/§10). El rol
 * (admin / súper admin) acota el alcance de segmentación (§5B).
 */
export default async function AnunciosPage() {
  const staff = await getSesionStaff();
  const rol = staff.rol === 'super_admin' ? 'super_admin' : 'admin';
  const data = await getAnuncios(staff.userId, rol);
  return <AnunciosGestor data={data} />;
}

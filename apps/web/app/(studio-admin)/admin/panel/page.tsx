import { getSesionStaff } from '@/lib/studio/session';
import { getCentroControl } from '../_components/_data';
import { CentroControl } from '../_components/centro-control';

export const dynamic = 'force-dynamic';

/**
 * Studio · Centro de control (Inicio de admin / súper admin). El layout ya garantiza
 * el rol (guard RBAC); aquí se lee el pulso de la escuela CON RLS y se decide qué
 * capas se muestran: el súper admin ve la salud del sistema y los accesos de
 * gobierno; el admin solo la experiencia (§5B / §10).
 */
export default async function CentroControlPage() {
  const staff = await getSesionStaff();
  const esSuper = staff.rol === 'super_admin';
  const data = await getCentroControl(staff.userId, esSuper);
  return <CentroControl data={data} />;
}

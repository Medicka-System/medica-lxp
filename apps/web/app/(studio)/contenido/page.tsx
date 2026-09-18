import { getSesionStaff } from '@/lib/studio/session';
import { getRecursos } from '@/lib/studio/datos';
import { ContenidoBiblioteca } from './_components/contenido-biblioteca';

export const dynamic = 'force-dynamic';

/** Studio · Contenido (biblioteca reutilizable). Lee lxp.recursos con RLS; degrada
 *  a "pendiente de DB/API" si la tabla aún no existe. */
export default async function ContenidoPage() {
  const staff = await getSesionStaff();
  const { recursos, pendienteDb } = await getRecursos(staff.userId);
  return <ContenidoBiblioteca recursos={recursos} pendienteDb={pendienteDb} />;
}

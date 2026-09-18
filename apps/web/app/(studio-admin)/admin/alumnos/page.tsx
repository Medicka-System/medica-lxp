import { getSesionStaff } from '@/lib/studio/session';
import { getAlumnos } from './_components/_data';
import { AlumnosLista } from './_components/alumnos-lista';

export const dynamic = 'force-dynamic';

/** Studio · Alumnos (lista global). Lee el avance en el campus CON RLS (§2/§10). */
export default async function AlumnosPage() {
  const staff = await getSesionStaff();
  const data = await getAlumnos(staff.userId);
  return <AlumnosLista data={data} />;
}

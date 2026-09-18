import { getSesionAlumno } from '@/lib/session';
import { getAteneo } from '@/lib/campus/ateneo-datos';
import { AteneoFeed } from './_components/ateneo-feed';

export const dynamic = 'force-dynamic';

/** Ateneo · comunidad de interconsulta (§1/§6). Lee lxp.posts_ateneo con RLS. */
export default async function AteneoPage() {
  const alumno = await getSesionAlumno();
  const data = await getAteneo(alumno.userId, alumno.nombre);
  return <AteneoFeed data={data} />;
}

import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getForo } from '@/lib/campus/foro-datos';
import { ForoDiscusion } from './_components/foro-discusion';

export const dynamic = 'force-dynamic';

/**
 * Foro de la lección (§1) — lado del alumno. Discusión CERRADA del grupo sobre una
 * actividad tipo `foro`. Lee lxp.foro_mensajes con RLS; el alumno publica con el
 * EditorRico.
 */
export default async function ForoPage({
  params,
}: {
  params: Promise<{ actividadId: string }>;
}) {
  const { actividadId } = await params;
  const alumno = await getSesionAlumno();
  const data = await getForo(alumno.userId, alumno.nombre, actividadId);
  if (!data) notFound();

  const puedePublicar = alumno.accesoActivo && data.grupoId !== null;
  return <ForoDiscusion data={data} puedePublicar={puedePublicar} />;
}

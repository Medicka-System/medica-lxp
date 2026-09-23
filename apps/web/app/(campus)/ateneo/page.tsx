import { getSesionAlumno } from '@/lib/session';
import { getAteneoSocial } from '@/lib/campus/ateneo-social';
import { AteneoCliente } from './_components/ateneo-cliente';

export const dynamic = 'force-dynamic';

/**
 * Ateneo · red social médica del alumno (§1 · comunidad ABIERTA de todo el campus).
 * Lee el motor (posts/comentarios/reacciones/encuestas/colegas) con RLS (`comoAlumno`)
 * y lo entrega a la composición cliente (feeds, filtros, composer, detalle, perfil).
 */
export default async function AteneoPage() {
  const alumno = await getSesionAlumno();
  const { data, colegaIds } = await getAteneoSocial(alumno.userId);
  return <AteneoCliente data={data} colegaIds={colegaIds} />;
}

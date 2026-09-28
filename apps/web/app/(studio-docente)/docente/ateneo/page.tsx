import { requireDocente } from '../../_lib/session';
import { getAteneoSocial } from '@/lib/campus/ateneo-social';
import { AteneoCliente } from '@/app/(campus)/ateneo/_components/ateneo-cliente';

export const dynamic = 'force-dynamic';

/**
 * Ateneo del DOCENTE (§1 · comunidad ABIERTA y transversal). Vive DENTRO del shell del
 * docente (header de studio-docente), NO del shell del alumno: aquí se monta SOLO el
 * componente del Ateneo (`AteneoCliente`, reusado del campus), sin la barra lateral ni el
 * header del alumno. Los datos se leen con la sesión del docente (RLS `comoAlumno` =
 * impersonación del usuario actual · §10); el Ateneo es el mismo para todos los roles.
 */
export default async function AteneoDocentePage() {
  const { userId } = await requireDocente();
  const { data, colegaIds, siguienteCursor } = await getAteneoSocial(userId);
  return <AteneoCliente data={data} colegaIds={colegaIds} siguienteCursor={siguienteCursor} />;
}

import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getLeccionPreview } from '@/lib/studio/preview-datos';
import { LectorLeccion } from '@/app/(campus)/leccion/[leccionId]/_components/lector-leccion';

export const dynamic = 'force-dynamic';

/**
 * Studio · Vista previa de una lección COMO ALUMNO (§5B). Vive en el route group
 * (studio-editor), cuyo layout exige `requireAutoria` (RBAC staff-only), así que un
 * alumno no la alcanza. Lee el BORRADOR con `comoStaff` (sin gate `publicado`) y lo
 * entrega al MISMO render que ve el alumno (`LectorLeccion`) en modo `preview` — así
 * el diseñador ve exactamente cómo quedará antes de publicar. No expone borradores a
 * alumnos: el gate de publicación sigue intacto en la ruta real del campus.
 */
export default async function PreviewLeccionPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const staff = await getSesionStaff();
  const leccion = await getLeccionPreview(staff.userId, leccionId);
  if (!leccion) notFound();
  return <LectorLeccion leccion={leccion} preview />;
}

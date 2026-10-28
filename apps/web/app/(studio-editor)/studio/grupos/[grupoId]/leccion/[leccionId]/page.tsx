import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getLeccionGrupoEditor } from '@/lib/studio/datos';
import { EditorLeccionGrupo } from './_components/editor-leccion-grupo';

export const dynamic = 'force-dynamic';

/**
 * Studio · Editor de contenido de una LECCIÓN PROPIA del grupo (Opción 1A · Etapa 4C).
 * Reusa el course builder completo (`EditorDeLeccion`) para autorar el contenido de una
 * lección agregada SOLO a este grupo. Las server actions derivan `grupo_id` de la lección,
 * así que el editor se monta igual que en Programas. `notFound` si la lección no es propia.
 */
export default async function LeccionGrupoPage({
  params,
}: {
  params: Promise<{ grupoId: string; leccionId: string }>;
}) {
  const { grupoId, leccionId } = await params;
  const staff = await getSesionStaff();
  const data = await getLeccionGrupoEditor(staff.userId, grupoId, leccionId);
  if (!data) notFound();
  return <EditorLeccionGrupo data={data} />;
}

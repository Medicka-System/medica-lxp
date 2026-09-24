import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getGrupoDetalle, getDocentes, getGrupoAlumnos } from '@/lib/studio/datos';
import { GestionGrupo } from './_components/gestion-grupo';

export const dynamic = 'force-dynamic';

/**
 * Studio · Gestión de un grupo. Lee el grupo + su temario heredado + overrides
 * crudos con RLS; la vista RESUELTA de herencia y las mutaciones de override son
 * del dominio (apps/api · ver lib/studio/herencia-contrato.ts).
 */
export default async function GrupoPage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  const { grupoId } = await params;
  const staff = await getSesionStaff();
  const [grupo, docentes, alumnos] = await Promise.all([
    getGrupoDetalle(staff.userId, grupoId),
    getDocentes(staff.userId),
    getGrupoAlumnos(staff.userId, grupoId),
  ]);
  if (!grupo) notFound();
  return <GestionGrupo grupo={grupo} docentes={docentes} alumnos={alumnos} />;
}

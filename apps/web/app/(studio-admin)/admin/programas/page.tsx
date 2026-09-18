import { getSesionStaff } from '@/lib/studio/session';
import { getProgramas } from '@/lib/studio/datos';
import { ProgramasAdmin } from './_components/programas-admin';

export const dynamic = 'force-dynamic';

/**
 * Studio · Programas (vista global del admin, solo lectura). Reutiliza la lectura de
 * programas del Studio (RLS · `lxp.programas`), sin duplicar dominio (§2). La autoría
 * y el versionado viven en el Studio del diseñador.
 */
export default async function ProgramasAdminPage() {
  const staff = await getSesionStaff();
  const programas = await getProgramas(staff.userId);
  return <ProgramasAdmin programas={programas} />;
}

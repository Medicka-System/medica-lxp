import { getSesionStaff } from '@/lib/studio/session';
import { getProgramas, getProgramasCora } from '@/lib/studio/datos';
import { ProgramasOrigen } from './_components/programas-origen';

export const dynamic = 'force-dynamic';

/**
 * Studio · Programas (lista). Dos orígenes (§5B · PUENTE 1): NATIVOS del LXP (RLS) y el
 * espejo CORA (catálogo read-only + grupos vinculados). El conmutador los separa en la UI.
 */
export default async function ProgramasPage() {
  const staff = await getSesionStaff();
  const [nativos, cora] = await Promise.all([
    getProgramas(staff.userId),
    getProgramasCora(staff.userId),
  ]);
  return <ProgramasOrigen nativos={nativos} cora={cora} />;
}

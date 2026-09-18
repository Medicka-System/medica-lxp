import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos } from '@/lib/studio/datos';
import { GruposAdmin } from './_components/grupos-admin';

export const dynamic = 'force-dynamic';

/**
 * Studio · Grupos (vista global del admin, solo lectura). Reutiliza la lectura de
 * grupos del Studio (RLS · `lxp.grupos`), sin duplicar dominio (§2). Consulta y
 * seguimiento; la instancia/edición vive en el Studio de autoría.
 */
export default async function GruposAdminPage() {
  const staff = await getSesionStaff();
  const grupos = await getGrupos(staff.userId);
  return <GruposAdmin grupos={grupos} />;
}

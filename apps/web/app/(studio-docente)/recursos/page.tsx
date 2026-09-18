import { requireDocente } from '../_lib/session';
import { getRecursos } from '../_lib/datos';
import { RecursosPanel } from './_components/recursos-panel';

export const dynamic = 'force-dynamic';

/** Mis recursos (§5B). Almacén personal del docente (RLS: solo los suyos). */
export default async function RecursosPage() {
  const { userId } = await requireDocente();
  const recursos = await getRecursos(userId);
  return <RecursosPanel recursos={recursos} />;
}

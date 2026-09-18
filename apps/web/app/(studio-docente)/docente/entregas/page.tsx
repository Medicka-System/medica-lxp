import { requireDocente } from '../../_lib/session';
import { getEntregas } from '../../_lib/datos';
import { EntregasConsola } from './_components/entregas-consola';

export const dynamic = 'force-dynamic';

/**
 * Entregas (§5B). Lee las entregas con RLS (`es_staff`) y las entrega a la consola,
 * que asienta la nota con `calificarEntrega`. La pre-calificación de Eco contra la
 * rúbrica es placeholder (§7A · Sprint 5.3).
 */
export default async function EntregasPage() {
  const { userId } = await requireDocente();
  const entregas = await getEntregas(userId);
  return <EntregasConsola entregas={entregas} />;
}

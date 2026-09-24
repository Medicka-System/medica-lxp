import { requireDocente } from '../../_lib/session';
import { getEntregasVista } from '../../_lib/datos';
import { EntregasConsola } from './_components/entregas-consola';

export const dynamic = 'force-dynamic';

/**
 * Entregas (§5B) — bandeja de tareas por calificar, organizada por GRUPO × ACTIVIDAD,
 * fiel al mock aprobado. Lee BD real con RLS (`es_staff`) + roster de CORA; la nota se
 * asienta con `calificarEntrega`. Las superficies de Eco son placeholder (§7A). La
 * selección de grupo/actividad viaja por la URL (?grupo=&actividad=) para ser enlazable.
 */
export default async function EntregasPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; actividad?: string }>;
}) {
  const { userId } = await requireDocente();
  const { grupo, actividad } = await searchParams;
  const data = await getEntregasVista(userId, { grupoId: grupo, actividadId: actividad });
  return <EntregasConsola data={data} />;
}

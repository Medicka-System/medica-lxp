import { requireDocente } from '../../_lib/session';
import { getClasesData } from './_lib/datos';
import { ClasesCliente } from './_components/ClasesCliente';

export const dynamic = 'force-dynamic';

/**
 * Clases en vivo del docente (§5B/§9 · Sprint 6). El docente programa/inicia sus sesiones
 * (Zoom o MiCo+) y recupera las grabaciones, que caen en la videoteca del grupo. El video
 * corre FUERA (Zoom / equipo Mindray) — aquí solo se lanza/enlaza. Datos REALES bajo RLS
 * (`getClasesData` · web→Supabase §2); las acciones que hablan con Zoom pasan por el api.
 * Eco es PLACEHOLDER (§7A). Solo ve las clases de SUS grupos.
 */
export default async function ClasesPage() {
  const { userId } = await requireDocente();
  const data = await getClasesData(userId);
  return <ClasesCliente data={data} />;
}

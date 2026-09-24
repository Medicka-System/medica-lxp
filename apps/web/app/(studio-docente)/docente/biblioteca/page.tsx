import { requireDocente } from '../../_lib/session';
import { getCasos } from '@/lib/studio/datos';
import { CasosBanco } from '@/app/(studio)/studio/casos/_components/casos-banco';

export const dynamic = 'force-dynamic';

/**
 * Docente · BIBLIOTECA (§5B) = curación de casos. REUSA el `CasosBanco` del Studio (no
 * reconstruye); el docente ve el banco ("por curar" / publicados) y cura la verdad del
 * caso (§5B: el criterio clínico es del docente). `rutaBase` deja el drill-down y el
 * "crear caso" en el editor a pantalla completa del docente (/docente/caso/[id]).
 */
export default async function DocenteBibliotecaPage() {
  const { userId } = await requireDocente();
  const casos = await getCasos(userId);
  return <CasosBanco casos={casos} rutaBase="/docente/caso" />;
}

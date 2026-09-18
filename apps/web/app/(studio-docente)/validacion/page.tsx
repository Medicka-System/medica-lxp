import { requireDocente } from '../_lib/session';
import { getCasosPorValidar } from '../_lib/datos';
import { ValidacionConsola } from './_components/validacion-consola';

export const dynamic = 'force-dynamic';

/**
 * Validación de casos (§5B, DoD Sprint 5.5). Lee la cola de casos `pendiente` con RLS
 * (`es_staff` ve todos) y la entrega a la consola cliente, que asienta la decisión con
 * la server action `validarCaso`. Eco y el visor DICOM son placeholders (§7A / 4.7).
 */
export default async function ValidacionPage() {
  const { userId } = await requireDocente();
  const casos = await getCasosPorValidar(userId);
  return <ValidacionConsola casos={casos} />;
}

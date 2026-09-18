import { requireDocente } from '../../_lib/session';
import { getCasosPorValidar } from '../../_lib/datos';
import { ValidacionConsola } from './_components/validacion-consola';

export const dynamic = 'force-dynamic';

/**
 * Validación de casos (§5B, DoD Sprint 5.5). Lee la cola de casos `pendiente` con RLS
 * (`es_staff` ve todos) — incluida la propuesta pre-analizada por Eco (`lxp.eco_propuestas`,
 * RLS `es_docente_o_mas`) y el estudio DICOM anonimizado — y la entrega a la consola
 * cliente, que asienta la decisión con `validarCaso` y cierra la propuesta de Eco con
 * `confirmarPropuestaEco`. El visor DICOM real (Cornerstone3D) se monta en la consola.
 */
export default async function ValidacionPage() {
  const { userId } = await requireDocente();
  const casos = await getCasosPorValidar(userId);
  return <ValidacionConsola casos={casos} />;
}

import { getSesionAlumno } from '@/lib/session';
import { getCalculadorasCatalogo } from '@/lib/campus/calculadoras-datos';
import { Calculadoras } from './_components/calculadoras';

export const dynamic = 'force-dynamic';

/**
 * Calculadoras clínicas (§ Sprint 8, §6). Destacadas = cómputo cliente con fórmulas
 * estándar; el catálogo se lee de lxp.calculadoras (publicadas) con RLS (comoAlumno).
 * Ver calculadoras-contrato para el motor genérico de definiciones (PENDIENTE).
 */
export default async function CalculadorasPage() {
  const alumno = await getSesionAlumno();
  const catalogo = await getCalculadorasCatalogo(alumno.userId);
  return <Calculadoras catalogo={catalogo} />;
}

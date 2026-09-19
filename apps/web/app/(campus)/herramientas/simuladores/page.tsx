import { getSesionAlumno } from '@/lib/session';
import { getSimuladores } from './_datos';
import { SimuladoresCliente } from './_components/simuladores-cliente';

export const dynamic = 'force-dynamic';

/**
 * Simuladores IA del alumno (§7A · Sprint 7). El catálogo/progreso se lee con RLS
 * (`web → Supabase`); la sesión se evalúa en el `api` (juicio de Eco, MOCK por defecto).
 */
export default async function SimuladoresPage() {
  const alumno = await getSesionAlumno();
  const data = await getSimuladores(alumno.userId);
  return <SimuladoresCliente data={data} />;
}

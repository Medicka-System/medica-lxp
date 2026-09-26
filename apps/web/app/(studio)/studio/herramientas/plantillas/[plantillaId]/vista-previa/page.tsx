import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getPlantilla } from '@/lib/studio/datos';
import { VistaPreviaPlantilla } from '../_components/vista-previa-plantilla';

export const dynamic = 'force-dynamic';

/**
 * Vista previa de la plantilla (§6.5) — pestaña nueva, SOLO LECTURA. Lee la estructura GUARDADA
 * (el constructor autoguarda cada 2 s, así que refleja lo último) y la renderiza tal como el
 * alumno la verá al crear un reporte en "Mis reportes", reusando `CampoReporte` (el mismo control
 * del editor de captura). No recibe nada por props; RLS (`getPlantilla`) es el candado.
 */
export default async function VistaPreviaPage({
  params,
}: {
  params: Promise<{ plantillaId: string }>;
}) {
  const { plantillaId } = await params;
  const staff = await getSesionStaff();
  const plantilla = await getPlantilla(staff.userId, plantillaId);
  if (!plantilla) notFound();
  return (
    <VistaPreviaPlantilla
      nombre={plantilla.nombre}
      tipoEstudio={plantilla.tipoEstudio}
      estructura={plantilla.estructura}
    />
  );
}

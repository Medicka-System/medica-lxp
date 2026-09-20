import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getCasoBitacora, getDocentes } from '@/lib/campus/bitacora-datos';
import { CasoDetalleBitacoraCliente } from './_components/caso-detalle';

export const dynamic = 'force-dynamic';

/** Detalle de un caso de la bitácora (§4.7) — visor grande + ficha editable inline. */
export default async function CasoBitacoraPage({
  params,
}: {
  params: Promise<{ casoId: string }>;
}) {
  const { casoId } = await params;
  const alumno = await getSesionAlumno();
  const caso = await getCasoBitacora(alumno.userId, casoId);
  if (!caso) notFound();
  // Docentes sólo si el caso es editable (en revisión); si no, no hace falta.
  const docentes = caso.estado === 'pendiente' ? await getDocentes(alumno.userId) : [];
  return <CasoDetalleBitacoraCliente caso={caso} docentes={docentes} />;
}

import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getTareaAlumno } from '@/lib/campus/tarea-datos';
import { VistaTarea } from './_components/vista-tarea';

export const dynamic = 'force-dynamic';

/**
 * Tarea de la lección (§5C) — lado del alumno. Lee del MODELO NUEVO (lección tipo
 * `tarea`: lineamientos/rúbrica/valor en `lecciones.config`) con RLS (comoAlumno) y la
 * entrega al render de entrega, que reutiliza el flujo de `entregas`/validación.
 */
export default async function TareaPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const alumno = await getSesionAlumno();
  const data = await getTareaAlumno(alumno.userId, leccionId);
  if (!data) notFound();

  const puedeEntregar = alumno.accesoActivo;
  return <VistaTarea data={data} puedeEntregar={puedeEntregar} />;
}

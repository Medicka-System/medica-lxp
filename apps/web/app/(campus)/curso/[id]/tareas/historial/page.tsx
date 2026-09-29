import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getCursoCtx, getHistorial } from '../../_datos';
import { HistorialVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function HistorialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tarea?: string }>;
}) {
  const { id } = await params;
  const { tarea } = await searchParams;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const h = await getHistorial(alumno.userId, id, tarea);

  return (
    <HistorialVista cursoId={id} opciones={h.opciones} seleccion={h.seleccion} envios={h.envios} puntos={h.puntos} puntosMax={h.puntosMax} />
  );
}

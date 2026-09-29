import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getCursoCtx, getTareas } from '../_datos';
import { TareasVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function TareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const tareas = await getTareas(alumno.userId, id);

  return <TareasVista cursoId={id} contexto={ctx.contexto} tareas={tareas} />;
}

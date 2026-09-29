import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getCalificaciones, getCursoCtx } from '../_datos';
import { CalificacionesVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function CalificacionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const items = await getCalificaciones(alumno.userId, id);

  return <CalificacionesVista cursoId={id} contexto={ctx.contexto} items={items} />;
}

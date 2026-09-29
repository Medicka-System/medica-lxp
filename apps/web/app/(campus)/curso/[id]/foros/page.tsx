import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { iniciales } from '@/components/avatar';
import { getCursoCtx, getForos } from '../_datos';
import { ForosVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function ForosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const foros = await getForos(alumno.userId, id, ctx.grupoId);

  return <ForosVista contexto={ctx.contexto} miIni={iniciales(alumno.nombre)} foros={foros} />;
}

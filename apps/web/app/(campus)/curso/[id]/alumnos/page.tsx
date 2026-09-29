import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getCursoCtx, getRoster } from '../_datos';
import { AlumnosVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function AlumnosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const integrantes = await getRoster(alumno.userId, id, ctx.grupoId);

  return <AlumnosVista cursoId={id} contexto={ctx.contexto} grupoNombre={ctx.grupoNombre} integrantes={integrantes} />;
}

import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getContenido, getCursoCtx } from '../_datos';
import { ContenidoVista } from './vista';

export const dynamic = 'force-dynamic';

export default async function ContenidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const ctx = await getCursoCtx(alumno.userId, id);
  if (!ctx) notFound();
  const { avancePct, completos, modulos } = await getContenido(alumno.userId, id);

  return (
    <ContenidoVista
      programa={ctx.programa}
      grupo={ctx.grupoNombre}
      modalidad={ctx.modalidad}
      avancePct={avancePct}
      completos={completos}
      modulos={modulos}
    />
  );
}

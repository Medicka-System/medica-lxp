import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getLeccion } from '@/lib/campus/leccion-datos';
import { LectorLeccion } from './_components/lector-leccion';

export const dynamic = 'force-dynamic';

/**
 * Lección / Lectura (§ Sprint 8, §5A). Monta lxp.contenidos con RLS (comoAlumno) y
 * lo entrega al lector inmersivo (modo lectura claro/sepia/oscuro, sidebar oculto).
 */
export default async function LeccionPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const alumno = await getSesionAlumno();
  const leccion = await getLeccion(alumno.userId, leccionId);
  if (!leccion) notFound();
  return <LectorLeccion leccion={leccion} />;
}

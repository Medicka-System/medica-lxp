import { notFound, redirect } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getLeccion } from '@/lib/campus/leccion-datos';
import { LectorLeccion } from './_components/lector-leccion';

export const dynamic = 'force-dynamic';

/**
 * Lección / Lectura (§ Sprint 8, §5A). Monta lxp.contenidos con RLS (comoAlumno) y
 * lo entrega al lector inmersivo (modo lectura claro/sepia/oscuro, sidebar oculto).
 *
 * Los tipos de ACTIVIDAD del modelo nuevo (mig 0023) no se leen en el lector inmersivo:
 * `tarea` tiene su propia pantalla de render + entrega. Entrar a la lección redirige a
 * ella (así la navegación anterior/siguiente del recorrido llega a la tarea sin ver un
 * lector vacío).
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
  if (leccion.tipo === 'tarea') redirect(`/tarea/${leccion.id}`);
  return <LectorLeccion leccion={leccion} />;
}

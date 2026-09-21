import { notFound, redirect } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getLeccion } from '@/lib/campus/leccion-datos';
import { getLeccionVideo } from '@/lib/campus/leccion-video-datos';
import { LectorLeccion } from './_components/lector-leccion';
import { LeccionVideo } from './_components/leccion-video';

export const dynamic = 'force-dynamic';

/**
 * Lección / Lectura (§ Sprint 8, §5A). Enruta por el TIPO de lección del modelo nuevo
 * (mig 0023):
 *   · `video` → render propio (reproductor + transcripción + hitos), AISLADO aquí.
 *   · `tarea` → pantalla propia de render + entrega: se redirige a `/tarea/[id]` (así el
 *     recorrido anterior/siguiente llega a la tarea sin ver un lector vacío).
 *   · el resto → lector inmersivo (claro/sepia/oscuro), que a su vez enruta por `tipo`:
 *     los interactivos (h5p/xapi) se reproducen desde `lecciones.config` y el resto
 *     muestra sus bloques.
 */
export default async function LeccionPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const alumno = await getSesionAlumno();

  // Modelo nuevo: lección tipo `video` → render propio (null si no es video).
  const video = await getLeccionVideo(alumno.userId, leccionId);
  if (video) return <LeccionVideo leccion={video} />;

  const leccion = await getLeccion(alumno.userId, leccionId);
  if (!leccion) notFound();
  if (leccion.tipo === 'tarea') redirect(`/tarea/${leccion.id}`);
  return <LectorLeccion leccion={leccion} />;
}

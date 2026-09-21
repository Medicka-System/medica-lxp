import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getLeccion } from '@/lib/campus/leccion-datos';
import { getLeccionVideo } from '@/lib/campus/leccion-video-datos';
import { LectorLeccion } from './_components/lector-leccion';
import { LeccionVideo } from './_components/leccion-video';

export const dynamic = 'force-dynamic';

/**
 * Lección / Lectura (§ Sprint 8, §5A). Enruta por el TIPO de lección del modelo nuevo
 * (mig 0023): una lección tipo `video` se sirve con su render propio (reproductor +
 * transcripción + hitos); el resto de tipos cae al lector inmersivo genérico que monta
 * lxp.contenidos con RLS (comoAlumno). El dispatch mantiene el video AISLADO: no toca
 * `getLeccion` ni el render de los demás tipos.
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
  return <LectorLeccion leccion={leccion} />;
}

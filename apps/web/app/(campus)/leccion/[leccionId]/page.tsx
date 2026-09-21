import { notFound, redirect } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getLeccion, getContenidoCurso } from '@/lib/campus/leccion-datos';
import { getLeccionVideo } from '@/lib/campus/leccion-video-datos';
import { getForoDeLeccion } from '@/lib/campus/foro-datos';
import { getNotasLeccion } from '@/lib/campus/notas-datos';
import { LectorLeccion } from './_components/lector-leccion';
import { LeccionVideo } from './_components/leccion-video';
import { ForoDiscusion } from '@/app/(campus)/foro/[actividadId]/_components/foro-discusion';

export const dynamic = 'force-dynamic';

/**
 * Lección / Lectura (§ Sprint 8, §5A). Enruta por el TIPO de lección del modelo nuevo
 * (mig 0023):
 *   · `video` → render propio (reproductor + transcripción + hitos), AISLADO aquí.
 *   · `tarea` → pantalla propia de render + entrega: se redirige a `/tarea/[id]` (así el
 *     recorrido anterior/siguiente llega a la tarea sin ver un lector vacío).
 *   · `foro` → la discusión del grupo se muestra DENTRO de la lección (misma que la ruta
 *     `/foro/[actividadId]`), honrando la config del diseñador (consigna/ventana/reglas).
 *   · el resto → lector inmersivo (claro/sepia/oscuro), que a su vez enruta por `tipo`:
 *     `teoria` renderiza sus bloques de `lxp.bloques` (modelo nuevo); los interactivos
 *     (h5p/xapi) se reproducen desde `lecciones.config`.
 */
export default async function LeccionPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const alumno = await getSesionAlumno();

  // Modelo nuevo: lección tipo `video` → render propio (null si no es video). Trae el
  // menú del curso (rail) y las notas del alumno, igual que la teoría (3 columnas).
  const video = await getLeccionVideo(alumno.userId, leccionId);
  if (video) {
    const [contenidoCurso, notasVideo] = await Promise.all([
      getContenidoCurso(alumno.userId, video.contexto.programaId, video.id),
      getNotasLeccion(alumno.userId, leccionId),
    ]);
    return (
      <LeccionVideo leccion={video} contenidoCurso={contenidoCurso} notasIniciales={notasVideo} />
    );
  }

  const leccion = await getLeccion(alumno.userId, leccionId);
  if (!leccion) notFound();
  if (leccion.tipo === 'tarea') redirect(`/tarea/${leccion.id}`);

  // Foro: la discusión (actividad de respaldo · foro_mensajes) se muestra dentro de la
  // lección, honrando la config del diseñador (misma lógica que /foro/[actividadId]).
  if (leccion.tipo === 'foro') {
    const foro = await getForoDeLeccion(alumno.userId, alumno.nombre, leccion.id);
    if (foro) {
      const puedePublicar = alumno.accesoActivo && foro.grupoId !== null && foro.ventana.abierto;
      return <ForoDiscusion data={foro} puedePublicar={puedePublicar} />;
    }
  }

  // Menú del curso (rail derecho · §5A) + notas del alumno (mig 0027), en paralelo.
  const [contenidoCurso, notas] = await Promise.all([
    getContenidoCurso(alumno.userId, leccion.contexto.programaId, leccion.id),
    getNotasLeccion(alumno.userId, leccion.id),
  ]);

  return <LectorLeccion leccion={leccion} contenidoCurso={contenidoCurso} notasIniciales={notas} />;
}

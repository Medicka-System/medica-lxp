import { getSesionAlumno } from '@/lib/session';
import { softText } from '@/components/tokens';
import { getVideoteca, getGrabacionesClase } from './_lib/datos';
import { VideotecaSecciones } from './_components/videoteca-secciones';

export const dynamic = 'force-dynamic';

/**
 * Videoteca del alumno (Sprint 6). Separa en dos colecciones con división clara:
 *   · **Biblioteca de videos** → contenido instruccional de producción (lecciones/
 *     `lxp.contenidos` tipo=video), leído con RLS como el alumno.
 *   · **Mis clases grabadas** → grabaciones de sesiones en vivo (`lxp.videoteca`,
 *     `origen in ('zoom','stream')`), acumuladas por el alumno.
 * Ambas se leen en paralelo y se conmutan por pestañas (§5A · `VideotecaSecciones`).
 */
export default async function VideotecaPage() {
  const { userId } = await getSesionAlumno();
  const [{ videos, programas }, grabaciones] = await Promise.all([
    getVideoteca(userId),
    getGrabacionesClase(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-7 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Videoteca</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Videos instruccionales del curso y grabaciones de tus clases en vivo, separados para que
          distingas cada uno de un vistazo.
        </p>
      </div>

      <VideotecaSecciones videos={videos} programas={programas} grabaciones={grabaciones} />
    </div>
  );
}

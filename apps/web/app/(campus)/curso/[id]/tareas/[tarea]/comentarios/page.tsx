import { notFound } from 'next/navigation';
import { getSesionAlumno } from '@/lib/session';
import { getTareaAlumno } from '@/lib/campus/tarea-datos';
import { getCursoCtx } from '../../../_datos';
import { ComentariosVista } from './vista';

export const dynamic = 'force-dynamic';

/** [tarea] = leccionId de la tarea (modelo nuevo). Reusa el loader de tarea del alumno. */
export default async function ComentariosPage({ params }: { params: Promise<{ id: string; tarea: string }> }) {
  const { id, tarea } = await params;
  const alumno = await getSesionAlumno();
  const [ctx, data] = await Promise.all([getCursoCtx(alumno.userId, id), getTareaAlumno(alumno.userId, tarea)]);
  if (!ctx || !data) notFound();

  return (
    <ComentariosVista
      cursoId={id}
      titulo={data.titulo}
      contexto={ctx.contexto}
      nota={data.entrega?.nota ?? null}
      valor={typeof data.valor === 'number' && data.valor > 0 ? data.valor : 10}
      feedback={data.entrega?.feedback ?? null}
      rubricaNombre={data.rubrica?.nombre ?? null}
      criterios={data.rubrica?.criterios ?? []}
    />
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireDocente } from '../../../_lib/session';
import { getRecursoDetalle } from '@/lib/studio/datos';
import { DetalleRecurso } from '@/app/(studio)/studio/contenido/[recursoId]/_components/detalle-recurso';

export const dynamic = 'force-dynamic';

/**
 * Docente · Detalle de un recurso de la biblioteca (§5B). REUSA `DetalleRecurso`; en modo
 * `soloLectura` (el docente consulta/usa, no reemplaza/elimina — eso es del diseñador).
 */
export default async function DocenteRecursoDetallePage({
  params,
}: {
  params: Promise<{ recursoId: string }>;
}) {
  const { recursoId } = await params;
  const { userId } = await requireDocente();
  const { recurso, pendienteDb } = await getRecursoDetalle(userId, recursoId);

  if (pendienteDb) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-8 pb-10 pt-16 text-center">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">Biblioteca de contenido pendiente</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-foreground-soft">
          La tabla <span className="tabular-id">lxp.recursos</span> aún no está disponible.
        </p>
        <Link
          href="/docente/recursos-biblioteca"
          className="mt-5 inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground hover:bg-accent"
        >
          Volver a Recursos
        </Link>
      </div>
    );
  }

  if (!recurso) notFound();
  return <DetalleRecurso recurso={recurso} rutaBase="/docente/recursos-biblioteca" soloLectura />;
}

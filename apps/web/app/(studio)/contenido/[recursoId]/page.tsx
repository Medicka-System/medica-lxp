import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSesionStaff } from '@/lib/studio/session';
import { getRecursoDetalle } from '@/lib/studio/datos';
import { DetalleRecurso } from './_components/detalle-recurso';

export const dynamic = 'force-dynamic';

/** Studio · Detalle de un recurso de la biblioteca. */
export default async function RecursoPage({
  params,
}: {
  params: Promise<{ recursoId: string }>;
}) {
  const { recursoId } = await params;
  const staff = await getSesionStaff();
  const { recurso, pendienteDb } = await getRecursoDetalle(staff.userId, recursoId);

  if (pendienteDb) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-8 pb-10 pt-16 text-center">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">Biblioteca de contenido pendiente</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-foreground-soft">
          La tabla <span className="tabular-id">lxp.recursos</span> y el pipeline de ingesta aún no
          existen (pendiente de DB/API). El detalle se poblará solo cuando el dominio esté disponible.
        </p>
        <Link
          href="/contenido"
          className="mt-5 inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground hover:bg-accent"
        >
          Volver a Contenido
        </Link>
      </div>
    );
  }

  if (!recurso) notFound();
  return <DetalleRecurso recurso={recurso} />;
}

import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la Videoteca: cabecera + pestañas (dos colecciones) + controles + grid. */
export default function CargandoVideoteca() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-7 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Pestañas: Biblioteca de videos · Mis clases grabadas */}
      <div className="mt-6 flex gap-1.5">
        <Skeleton className="h-10 w-[190px] rounded-full" />
        <Skeleton className="h-10 w-[190px] rounded-full" />
      </div>

      <Skeleton className="mt-4 h-4 w-96 max-w-full" />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 min-w-[240px] flex-1 rounded-full" />
        <Skeleton className="h-11 w-[280px] max-w-full rounded-full" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[248px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

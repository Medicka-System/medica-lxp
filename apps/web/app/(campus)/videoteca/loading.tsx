import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la Videoteca: cabecera + controles + grid 3×n de tarjetas de video. */
export default function CargandoVideoteca() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-7 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 min-w-[240px] flex-1 rounded-full" />
        <Skeleton className="h-11 w-[280px] max-w-full rounded-full" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[248px] rounded-xl" />
        ))}
      </div>

      <div className="mt-10 space-y-3">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Simuladores: encabezado + hero/repasos + dos tipos + filtros + grid. */
export default function CargandoSimuladores() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-12 w-44 rounded-[10px]" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-[180px] rounded-xl" />
        <Skeleton className="h-[180px] rounded-xl" />
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Skeleton className="h-12 w-[280px] max-w-full rounded-full" />
        <Skeleton className="ml-auto h-12 w-[200px] rounded-full" />
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

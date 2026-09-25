import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Entregas: selectores + resumen + lista, con el riel de Eco a la derecha. */
export default function CargandoEntregas() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-6 pt-5">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-10 w-[200px] rounded-[10px]" />
          <Skeleton className="h-10 w-[300px] rounded-[10px]" />
          <Skeleton className="h-10 w-[220px] rounded-[10px]" />
          <Skeleton className="ml-auto h-11 w-[220px] rounded-[10px]" />
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] min-w-0 flex-1 rounded-[11px]" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-[11px]" />
        <div className="space-y-px rounded-xl border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 px-[18px] py-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-6 w-[150px] rounded-full" />
              <Skeleton className="h-5 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-[260px] w-14 shrink-0 rounded-[14px]" />
    </div>
  );
}

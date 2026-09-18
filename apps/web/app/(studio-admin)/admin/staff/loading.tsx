import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Staff: cabecera + 4 totales + filtros + tabla de 7 filas. */
export default function CargandoStaff() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-36 rounded-[10px]" />
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      </div>
      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="mt-5 flex gap-2.5">
        <Skeleton className="h-10 w-[260px] rounded-[9px]" />
        <Skeleton className="h-10 w-80 rounded-full" />
      </div>
      <div className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-[18px] py-3.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

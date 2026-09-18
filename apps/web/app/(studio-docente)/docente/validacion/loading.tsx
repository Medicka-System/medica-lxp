import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Validación: bandeja (izq) + detalle con visor (centro) + rail Eco. */
export default function CargandoValidacion() {
  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      <aside className="flex w-[340px] shrink-0 flex-col gap-3 border-r border-border bg-card p-4">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-9 w-full rounded-[9px]" />
        <Skeleton className="h-9 w-full rounded-[9px]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2.5 p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
        <div className="flex-1 space-y-4 px-5 pt-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
        </div>
      </div>
      <div className="w-14 shrink-0 border-l border-border bg-card" />
    </div>
  );
}

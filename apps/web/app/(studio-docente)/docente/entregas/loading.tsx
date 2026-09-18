import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Entregas: bandeja (izq) + detalle (respuesta + Eco + calificar). */
export default function CargandoEntregas() {
  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      <aside className="flex w-[340px] shrink-0 flex-col gap-3 border-r border-border bg-card p-4">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="h-9 w-full rounded-[9px]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2.5 p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </aside>
      <div className="mx-auto w-full max-w-[860px] space-y-4 px-6 pt-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
        </div>
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[110px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>
    </div>
  );
}

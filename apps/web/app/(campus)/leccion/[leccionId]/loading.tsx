import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la lección: header en tono + columna de lectura. */
export default function CargandoLeccion() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background">
      <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
        <Skeleton className="h-8 w-20 rounded-control" />
        <div className="mx-auto flex flex-col items-center gap-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-[760px] px-5 py-10 sm:px-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-3/4" />
        <Skeleton className="mt-3 h-5 w-2/3" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

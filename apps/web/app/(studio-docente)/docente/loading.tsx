import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del Inicio del docente: Eco + tres colas + grupos + rail. */
export default function CargandoInicio() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-6">
      <Skeleton className="h-[132px] w-full rounded-[14px]" />
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Skeleton className="h-4 w-40 rounded-md" />
          <div className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[236px] w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-4 w-32 rounded-md" />
          <div className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-border px-[18px] py-4 first:border-t-0">
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-5">
          <Skeleton className="h-[196px] w-full rounded-xl" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

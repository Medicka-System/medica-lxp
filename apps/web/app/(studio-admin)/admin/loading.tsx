import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del Centro de control: cabecera + 4 KPIs + fila de 3 tarjetas (imita la forma). */
export default function CargandoCentroControl() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="ml-auto flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-[10px]" />
          ))}
        </div>
      </div>

      <Skeleton className="mt-6 h-4 w-40 rounded-md" />
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <Skeleton className="h-7 w-32 rounded-md" />
            <Skeleton className="mt-4 h-9 w-24 rounded-md" />
            <Skeleton className="mt-3 h-5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid gap-3.5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="mt-4 h-[132px] w-full rounded-lg" />
            <Skeleton className="mt-4 h-5 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

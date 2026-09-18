import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Grupos (admin): cabecera + 4 totales + filtros + tabla. */
export default function CargandoGruposAdmin() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-4 w-[30rem] max-w-full rounded-md" />
      </div>
      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="mt-5 flex gap-2.5">
        <Skeleton className="h-10 w-[280px] rounded-[9px]" />
        <Skeleton className="h-10 w-80 rounded-full" />
      </div>
      <div className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-[18px] py-3.5">
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

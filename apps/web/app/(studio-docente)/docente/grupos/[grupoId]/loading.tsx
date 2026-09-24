import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del detalle: cabecera + 4 KPIs + filtros + tabla de alumnos + rail Eco. */
export default function CargandoGrupo() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-8 pt-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-[9px]" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-md" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-5 h-9 w-full max-w-[520px] rounded-full" />
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
          <Skeleton className="h-10 w-full rounded-none" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-5 flex-[1.5] rounded-md" />
              <Skeleton className="h-4 flex-[1.1] rounded-md" />
              <Skeleton className="h-5 w-[238px] rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-40 w-14 shrink-0 rounded-[14px]" />
    </div>
  );
}

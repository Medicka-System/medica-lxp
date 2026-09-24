import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mis grupos: header + banda Eco + grid de cards + rail Eco. */
export default function CargandoGrupos() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-8 pt-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
          <Skeleton className="ml-auto h-9 w-52 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[14px] border border-border bg-card p-5 shadow-rest">
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
              <Skeleton className="mt-4 h-8 w-full rounded-md" />
              <Skeleton className="mt-4 h-16 w-full rounded-[11px]" />
              <Skeleton className="mt-4 h-11 w-full rounded-[10px]" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-40 w-14 shrink-0 rounded-[14px]" />
    </div>
  );
}

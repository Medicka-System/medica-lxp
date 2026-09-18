import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mis recursos: header + alta + lista. */
export default function CargandoRecursos() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-8 pb-10 pt-7">
      <Skeleton className="h-6 w-36 rounded-md" />
      <Skeleton className="mt-2 h-4 w-80 rounded-md" />
      <Skeleton className="mt-6 h-[180px] w-full rounded-xl" />
      <Skeleton className="mt-6 h-4 w-28 rounded-md" />
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border px-[18px] py-3.5 first:border-t-0">
            <Skeleton className="h-9 w-9 rounded-[9px]" />
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-[9px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

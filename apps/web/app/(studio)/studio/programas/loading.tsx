import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Programas: imita header + filtros + tabla de 8 filas. */
export default function CargandoProgramas() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-11 w-44 rounded-[10px]" />
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-[320px] rounded-[9px]" />
        <Skeleton className="h-10 w-64 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-[9px]" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

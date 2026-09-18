import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Grupos: header + filtros + tabla de 8 filas. */
export default function CargandoGrupos() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-[290px] rounded-[9px]" />
        <Skeleton className="h-10 w-40 rounded-[9px]" />
        <Skeleton className="h-10 w-72 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3.5">
            <Skeleton className="h-8 w-14 rounded-[7px]" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

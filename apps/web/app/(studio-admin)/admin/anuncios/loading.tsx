import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Anuncios: cabecera + filtros + lista de 5 filas. */
export default function CargandoAnuncios() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-[28rem] max-w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>
      <div className="mt-5 flex gap-2.5">
        <Skeleton className="h-10 w-72 rounded-full" />
        <Skeleton className="h-10 w-[250px] rounded-[9px]" />
      </div>
      <div className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-[18px] py-3.5">
            <Skeleton className="h-9 flex-[1.8] rounded-md" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

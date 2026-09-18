import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del seguimiento de un grupo: cabecera + aviso + temario. */
export default function CargandoGrupo() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-10 pt-6">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="mt-3 h-7 w-64 rounded-md" />
      <Skeleton className="mt-2 h-4 w-80 rounded-md" />
      <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      <Skeleton className="mt-6 h-4 w-40 rounded-md" />
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 first:border-t-0">
            <Skeleton className="h-8 w-8 rounded-[9px]" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

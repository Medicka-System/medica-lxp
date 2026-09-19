import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del detalle de recurso: preview + metadatos | dónde se usa + versiones. */
export default function CargandoRecurso() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-44 rounded-full" />
        <Skeleton className="h-12 w-48 rounded-[10px]" />
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-3 p-6">
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

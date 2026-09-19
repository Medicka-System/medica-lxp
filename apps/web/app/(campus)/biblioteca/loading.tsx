import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la Biblioteca: encabezado + filtros + grid de casos. */
export default function CargandoBiblioteca() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-11 flex-1 rounded-full" />
        <Skeleton className="h-11 w-44 rounded-control" />
        <Skeleton className="h-11 w-44 rounded-control" />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

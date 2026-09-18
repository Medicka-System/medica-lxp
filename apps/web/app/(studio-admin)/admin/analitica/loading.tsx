import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Analítica: cabecera + capa de tarjetas + panel Eco + más tarjetas. */
export default function CargandoAnalitica() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>
      <Skeleton className="mt-6 h-4 w-52 rounded-md" />
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-4 w-56 rounded-md" />
      <Skeleton className="mt-3.5 h-48 rounded-xl" />
      <div className="mt-3.5 grid gap-3.5 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Calculadoras: encabezado + grid de tarjetas de cálculo. */
export default function CargandoCalculadoras() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[260px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

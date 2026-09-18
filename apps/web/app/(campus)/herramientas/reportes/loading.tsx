import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mis reportes: encabezado + 4 tarjetas "qué me falta" + filtros + tabla. */
export default function CargandoReportes() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-12 w-40 rounded-[10px]" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Skeleton className="h-12 w-[420px] max-w-full rounded-full" />
        <Skeleton className="ml-auto h-12 w-[280px] rounded-full" />
      </div>

      <Skeleton className="mt-4 h-[360px] w-full rounded-xl" />
    </div>
  );
}

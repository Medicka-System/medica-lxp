import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mis cursos: encabezado + grid de tarjetas de curso. */
export default function CargandoCursos() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-11 w-44 rounded-control" />
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[320px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

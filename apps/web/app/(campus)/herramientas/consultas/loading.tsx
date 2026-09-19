import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la bandeja de consultas del alumno. */
export default function CargandoConsultas() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="mt-2 h-7 w-40 rounded-md" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-[10px]" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

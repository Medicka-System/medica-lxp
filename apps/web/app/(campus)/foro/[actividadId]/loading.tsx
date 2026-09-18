import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del foro: encabezado, composer del tema y un par de hilos. */
export default function CargandoForo() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-6">
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="mt-4 h-4 w-64 rounded-md" />
      <Skeleton className="mt-2 h-7 w-96 max-w-full rounded-md" />
      <Skeleton className="mt-3 h-4 w-full max-w-[66ch] rounded-md" />

      <Skeleton className="mt-6 h-56 w-full rounded-xl" />

      <Skeleton className="mt-7 h-5 w-36 rounded-md" />
      <div className="mt-3 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

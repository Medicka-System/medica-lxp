import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del hilo de una consulta. */
export default function CargandoHilo() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="mt-4 h-6 w-72 max-w-full rounded-md" />
      <Skeleton className="mt-2 h-4 w-40 rounded-md" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={`h-16 w-[70%] rounded-2xl ${i % 2 ? 'ml-auto' : ''}`} />
        ))}
      </div>
      <Skeleton className="mt-6 h-28 w-full rounded-xl" />
    </div>
  );
}

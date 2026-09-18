import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del Ateneo: imita el muro (composer + posts) y el rail social. */
export default function CargandoAteneo() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0 space-y-5">
          <Skeleton className="h-28 rounded-xl" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[340px] rounded-xl" />
          ))}
        </div>
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

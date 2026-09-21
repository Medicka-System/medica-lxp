import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la tarea: encabezado, meta, lineamientos, rúbrica y composer. */
export default function CargandoTarea() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-6">
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="mt-4 h-4 w-64 rounded-md" />
      <Skeleton className="mt-2 h-7 w-96 max-w-full rounded-md" />

      <div className="mt-3 flex gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <Skeleton className="mt-4 h-4 w-full max-w-[66ch] rounded-md" />
      <Skeleton className="mt-2 h-4 w-3/4 max-w-[66ch] rounded-md" />

      <Skeleton className="mt-5 h-32 w-full rounded-xl" />
      <Skeleton className="mt-6 h-52 w-full rounded-xl" />
    </div>
  );
}

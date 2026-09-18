import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del detalle de staff: identidad + dos columnas. */
export default function CargandoDetalleStaff() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px]" />
        <Skeleton className="h-[52px] w-[52px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

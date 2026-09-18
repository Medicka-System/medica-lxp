import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del expediente: identidad + dos columnas (cifras/competencia + rail). */
export default function CargandoExpediente() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px]" />
        <Skeleton className="h-[52px] w-[52px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-11 w-36 rounded-[10px]" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

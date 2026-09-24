import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Clases: header + (clase de hoy + próximas + grabaciones) | rail. */
export default function CargandoClases() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="mt-2 h-4 w-[28rem] max-w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Skeleton className="h-[196px] w-full rounded-2xl" />
          <Skeleton className="mt-5 h-[220px] w-full rounded-[14px]" />
          <div className="mt-5 grid gap-3.5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <Skeleton className="h-[320px] w-full rounded-[14px]" />
          <Skeleton className="mt-4 h-[190px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

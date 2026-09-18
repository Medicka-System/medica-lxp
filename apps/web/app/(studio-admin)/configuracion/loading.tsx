import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del hub de Configuración: cabecera + 3 grupos × 3 tarjetas de área. */
export default function CargandoConfiguracion() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-72 rounded-md" />
          <Skeleton className="h-4 w-[24rem] max-w-full rounded-md" />
        </div>
        <Skeleton className="ml-auto h-10 w-[300px] rounded-[9px]" />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g}>
            <Skeleton className="h-3.5 w-40 rounded-md" />
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[168px] rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

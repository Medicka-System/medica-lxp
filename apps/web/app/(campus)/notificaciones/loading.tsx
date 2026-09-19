import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del centro de notificaciones: encabezado, acciones y una lista de avisos. */
export default function CargandoNotificaciones() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="mt-2 h-7 w-56 rounded-md" />
          <Skeleton className="mt-2 h-4 w-32 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-[10px]" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

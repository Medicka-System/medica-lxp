import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Certificados: encabezado + avance/verificación + grids. */
export default function CargandoCertificados() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[220px] rounded-xl" />
      </div>
      <Skeleton className="mt-10 h-5 w-40" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[160px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

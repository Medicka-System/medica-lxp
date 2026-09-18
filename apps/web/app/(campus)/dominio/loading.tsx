import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mi dominio: imita panorama (anillo) + 4 dominios + repasos + hitos. */
export default function CargandoDominio() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.55fr]">
        <Skeleton className="h-[220px] rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-7 h-40 rounded-xl" />
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

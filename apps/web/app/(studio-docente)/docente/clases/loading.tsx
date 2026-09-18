import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Clases: header + aviso + grid de grupos. */
export default function CargandoClases() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-10 pt-7">
      <Skeleton className="h-6 w-40 rounded-md" />
      <Skeleton className="mt-2 h-4 w-96 rounded-md" />
      <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      <Skeleton className="mt-6 h-4 w-28 rounded-md" />
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[188px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

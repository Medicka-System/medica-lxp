import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Casos: header + bandejas + facetas | galería. */
export default function CargandoCasos() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-11 w-36 rounded-[10px]" />
      </div>
      <Skeleton className="mt-4 h-9 w-96 rounded-full" />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-xl" />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/3] w-full rounded-t-xl" />
              <div className="space-y-2 rounded-b-xl border border-t-0 border-border p-3.5">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

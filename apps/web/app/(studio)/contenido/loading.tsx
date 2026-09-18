import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Contenido: header + filtros + cuadrícula de recursos. */
export default function CargandoContenido() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-8 pb-10 pt-7">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-[300px] rounded-[9px]" />
        <Skeleton className="h-10 w-80 rounded-full" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[16/9] w-full rounded-t-xl" />
            <div className="space-y-2 rounded-b-xl border border-t-0 border-border p-3.5">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Mis grupos: header + tabla de grupos. */
export default function CargandoGrupos() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex items-end justify-between gap-3.5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-[18px] py-4">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

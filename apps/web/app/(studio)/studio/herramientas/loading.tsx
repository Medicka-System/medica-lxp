import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Herramientas: header + sub-nav + barra + tabla. Cubre las tres. */
export default function CargandoHerramientas() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-[38px] w-[520px] rounded-full" />
      <div className="mt-4 flex items-center gap-2.5">
        <Skeleton className="h-10 w-[280px] rounded-[9px]" />
        <Skeleton className="ml-auto h-11 w-40 rounded-[10px]" />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-[9px]" />
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-[9px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

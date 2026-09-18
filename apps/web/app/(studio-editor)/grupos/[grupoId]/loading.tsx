import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de la gestión de grupo: header navy + franja + 3 columnas. */
export default function CargandoGrupo() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px] bg-white/15" />
        <Skeleton className="h-5 w-64 rounded-md bg-white/15" />
        <Skeleton className="ml-auto h-[38px] w-36 rounded-[9px] bg-white/15" />
      </div>
      <Skeleton className="h-[52px] w-full rounded-none" />
      <div className="flex min-h-0 flex-1">
        <div className="w-[328px] shrink-0 space-y-3 border-r border-border bg-card p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
          ))}
        </div>
        <div className="flex-1 space-y-3 px-6 py-5">
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-12 w-full rounded-[11px]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="w-[316px] shrink-0 space-y-3 border-l border-border bg-card p-5">
          <Skeleton className="h-16 w-full rounded-[11px]" />
          <Skeleton className="h-24 w-full rounded-[11px]" />
        </div>
      </div>
    </div>
  );
}

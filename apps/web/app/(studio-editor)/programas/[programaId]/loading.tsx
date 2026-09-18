import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del builder: header navy + franja + 3 columnas (estructura/lienzo/publicación). */
export default function CargandoBuilder() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px] bg-white/15" />
        <Skeleton className="h-5 w-56 rounded-md bg-white/15" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-[38px] w-28 rounded-[9px] bg-white/15" />
          <Skeleton className="h-[38px] w-24 rounded-[9px] bg-white/15" />
        </div>
      </div>
      <Skeleton className="h-[52px] w-full rounded-none" />
      <div className="flex min-h-0 flex-1">
        <div className="w-[324px] shrink-0 space-y-2 border-r border-border bg-card p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-[9px]" />
          ))}
        </div>
        <div className="flex-1 space-y-3 px-7 py-6">
          <Skeleton className="h-4 w-64 rounded-md" />
          <Skeleton className="h-8 w-96 rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[11px]" />
          ))}
        </div>
        <div className="w-[316px] shrink-0 space-y-3 border-l border-border bg-card p-5">
          <Skeleton className="h-8 w-full rounded-full" />
          <Skeleton className="h-24 w-full rounded-[11px]" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

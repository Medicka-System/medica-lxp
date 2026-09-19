import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del editor de caso: header navy + visor | panel de autoría. */
export default function CargandoEditorCaso() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px] bg-white/15" />
        <Skeleton className="h-5 w-64 rounded-md bg-white/15" />
        <Skeleton className="ml-auto h-[38px] w-44 rounded-[9px] bg-white/15" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 bg-sidebar" />
        <aside className="w-[452px] shrink-0 space-y-3 border-l border-border bg-card p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
          ))}
          <Skeleton className="h-40 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}

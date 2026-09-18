import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del editor de teoría: header navy + lienzo central + panel lateral. */
export default function CargandoTeoria() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Skeleton className="h-[38px] w-[38px] rounded-[9px] bg-white/15" />
        <Skeleton className="h-5 w-72 rounded-md bg-white/15" />
        <Skeleton className="ml-auto h-[38px] w-24 rounded-[9px] bg-white/15" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 px-6 py-7">
          <div className="mx-auto w-full max-w-[820px] space-y-3">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-8 w-96 rounded-md" />
            <Skeleton className="h-11 w-full rounded-t-xl" />
            <Skeleton className="h-[420px] w-full rounded-b-xl" />
          </div>
        </div>
        <div className="hidden w-[316px] shrink-0 space-y-3 border-l border-border bg-card p-5 lg:block">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-28 w-full rounded-[11px]" />
          <Skeleton className="h-24 w-full rounded-[11px]" />
        </div>
      </div>
    </div>
  );
}

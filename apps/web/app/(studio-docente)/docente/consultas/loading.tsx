import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton de Consultas: bandeja (izq) · hilo (centro) · Eco (der) — imita el layout real. */
export default function CargandoConsultas() {
  return (
    <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1400px] gap-3.5 px-5 pb-5 pt-5">
      <aside className="flex w-[330px] shrink-0 flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="h-[38px] w-full rounded-[9px]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-44 rounded" />
            </div>
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col rounded-[14px] border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-[18px] py-3.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-[18px]">
          <Skeleton className="h-16 w-2/3 rounded-[14px]" />
          <Skeleton className="ml-auto h-16 w-2/3 rounded-[14px]" />
          <Skeleton className="h-14 w-1/2 rounded-[14px]" />
        </div>
        <div className="border-t border-border p-[18px]">
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
      <aside className="hidden w-[340px] shrink-0 flex-col gap-3 rounded-[14px] border border-[color:var(--info-border)] bg-card p-3.5 lg:flex">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </aside>
    </div>
  );
}

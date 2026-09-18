import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del editor de IA / Eco: cabecera + prompts + parámetros + modelos. */
export default function CargandoIaConfig() {
  return (
    <div className="mx-auto w-full max-w-[980px] px-6 pb-24 pt-5">
      <Skeleton className="h-4 w-56 rounded-md" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-4 w-[28rem] max-w-full rounded-md" />
      </div>

      {/* prompts */}
      <div className="mt-6 rounded-xl border border-border bg-card p-[18px] shadow-rest">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="mt-4 h-[168px] w-full rounded-[9px]" />
        <Skeleton className="mt-5 h-[168px] w-full rounded-[9px]" />
      </div>

      {/* parámetros */}
      <div className="mt-6 rounded-xl border border-border bg-card p-[18px] shadow-rest">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-[9px]" />
          ))}
        </div>
      </div>

      {/* modelos */}
      <div className="mt-6 rounded-xl border border-border bg-card p-[18px] shadow-rest">
        <Skeleton className="h-5 w-64 rounded-md" />
        <div className="mt-4 space-y-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

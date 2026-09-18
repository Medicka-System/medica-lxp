import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton del Home: imita hero + (continuar | pulso) + comunidad + agenda. */
export default function CargandoInicio() {
  return (
    <div className="pb-10">
      <div className="bg-sidebar">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-8">
          <div className="min-w-0">
            <Skeleton className="h-[26px] w-40 rounded-full bg-white/15" />
            <Skeleton className="mt-4 h-9 w-4/5 bg-white/15" />
            <Skeleton className="mt-3 h-4 w-full max-w-[52ch] bg-white/10" />
            <Skeleton className="mt-2 h-4 w-3/4 bg-white/10" />
            <Skeleton className="mt-5 h-12 w-36 rounded-[11px] bg-white/20" />
          </div>
          <Skeleton className="hidden aspect-[16/10] w-full rounded-2xl bg-white/10 lg:block" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-5 pt-7 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-64" />
        <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_316px]">
          <Skeleton className="h-[184px] rounded-2xl" />
          <Skeleton className="h-[184px] rounded-2xl" />
        </section>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

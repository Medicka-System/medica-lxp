import { Skeleton } from '@/components/ui/skeleton';

/** Fallback genérico del Campus mientras resuelve la sesión/datos del segmento. */
export default function CargandoCampus() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-6 h-[360px] rounded-xl" />
    </div>
  );
}

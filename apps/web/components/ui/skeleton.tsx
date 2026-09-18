import { cn } from '@/lib/utils';

/** Skeleton base — bloque con pulso suave sobre el track. Respeta reduced-motion
 *  (motion-reduce:animate-none). Se usa en los loading.tsx para imitar la forma. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[color:var(--track)] motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

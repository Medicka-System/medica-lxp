import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — shadcn PERSONALIZADO (§5A). Radio 12 (o 16 con `lg`), borde e/ sombra
 * de reposo única. Es el contenedor base que reutilizan todas las pantallas.
 */
export function Card({
  className,
  lg = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lg?: boolean }) {
  return (
    <div
      className={cn(
        'border border-border bg-card shadow-rest',
        lg ? 'rounded-2xl' : 'rounded-xl',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15.5px] font-bold leading-tight', className)} {...props} />;
}

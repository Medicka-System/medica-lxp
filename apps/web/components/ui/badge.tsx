import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge — shadcn PERSONALIZADO (§5A). Chip de estado en pill. Regla de color:
 * warning (ámbar) para lo pendiente/práctica, info (índigo) para sesión/validación,
 * destructive (rojo) SOLO dinero vencido. Nada de defaults.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill font-bold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        accent: 'bg-accent text-accent-foreground',
        primary: 'bg-primary text-primary-foreground',
        warning: 'border border-warning-border bg-warning-surface text-warning-foreground',
        info: 'border border-info-border bg-info-surface text-info-foreground',
        destructive:
          'border border-destructive-border bg-destructive-surface text-destructive-foreground',
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5 text-[11.5px]',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { badgeVariants };

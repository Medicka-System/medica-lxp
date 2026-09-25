'use client';

/**
 * Wrapper ÚNICO de gráficas (§5A). Envuelve Recharts para que TODA gráfica de la app
 * salga con el carácter del proyecto —no los defaults de Recharts—: rellenos planos con
 * tokens (`var(--primary)`…), SIN gradientes ni sombras, caps redondeados, ejes y
 * tipografía §5A. Los medidores simples (barras/proporción/KPI) van en CSS, no aquí.
 *
 * SSR-safe: `ResponsiveContainer` mide el contenedor → solo se monta en cliente (guard
 * `mounted`); antes reserva el alto para no romper el layout ni la hidratación (Next 16).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

/** Props §5A compartidos para ejes y grilla (tipografía/colores del sistema). */
export const EJE = {
  tick: { fontSize: 10, fill: 'var(--muted-foreground)' } as const,
  stroke: 'var(--border)',
  tickLine: false as const,
  axisLine: false as const,
};

export const GRID = {
  stroke: 'var(--border)',
  vertical: false as const,
  strokeDasharray: '2 4',
} as const;

/** Tooltip tematizado (card + borde + radio §5A, mono para cifras). Sin sombras default. */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[9px] border border-border bg-card px-2.5 py-2 text-[11px] shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      {label !== undefined && <p className="mb-1 font-bold text-foreground">{label}</p>}
      <ul className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-mono font-bold tabular-nums text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Contenedor SSR-safe. Recibe UN elemento de gráfica de Recharts (AreaChart/BarChart/…)
 * ya configurado con tokens §5A. Reserva el alto en el servidor; monta el chart en cliente.
 */
export function Chart({ height = 140, children }: { height?: number; children: ReactElement }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ height }} aria-hidden className="w-full" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

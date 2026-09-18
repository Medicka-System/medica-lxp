'use client';

/**
 * Visuales animados de "Mi dominio" (§5A): anillo de competencia, barras y línea de
 * tendencia. Animan al montar y se detienen con prefers-reduced-motion (sin
 * keyframes externos). Client components porque leen el matchMedia y animan.
 */

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const cb = () => setReduce(mq.matches);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  return reduce;
}

export function Anillo({ pct, size = 200, grosor = 14 }: { pct: number; size?: number; grosor?: number }) {
  const reduce = useReducedMotion();
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const r = size / 2 - grosor / 2 - 6;
  const c = 2 * Math.PI * r;
  const lleno = c * (1 - pct / 100);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Competencia general ${pct} por ciento`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={grosor} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={reduce || listo ? lleno : c}
        style={{ transition: reduce ? 'none' : 'stroke-dashoffset 1.1s cubic-bezier(.22,.8,.26,1)' }}
      />
    </svg>
  );
}

export function Tendencia({ serie, sube }: { serie: number[]; sube: boolean }) {
  const w = 110, h = 44;
  const min = Math.min(...serie) - 4;
  const max = Math.max(...serie) + 4;
  const span = max - min || 1;
  const pts = serie.map((v, i) => [(i * w) / Math.max(1, serie.length - 1), h - ((v - min) / span) * h] as const);
  const color = sube ? 'var(--primary)' : 'var(--warning)';
  const ultimo = pts[pts.length - 1] ?? ([0, 0] as const);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ultimo[0]} cy={ultimo[1]} r={3.5} fill={color} />
    </svg>
  );
}

export function Barra({ pct, alerta, alto = 8 }: { pct: number; alerta?: boolean; alto?: number }) {
  const reduce = useReducedMotion();
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div className="overflow-hidden rounded-full bg-[color:var(--track)]" style={{ height: alto }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${reduce || listo ? pct : 0}%`,
          background: alerta ? 'var(--warning)' : 'var(--primary)',
          transition: reduce ? 'none' : 'width .9s cubic-bezier(.22,.8,.26,1)',
        }}
      />
    </div>
  );
}

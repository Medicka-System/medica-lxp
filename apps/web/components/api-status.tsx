'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from '@campus/shared';
import { cn } from '@/lib/utils';

type Estado = 'cargando' | 'ok' | 'error';

/**
 * Sonda de salud de la API de dominio (Sprint 0): consulta `GET /health` y
 * muestra "API OK" cuando responde. Verifica de punta a punta que web alcanza api.
 */
export function ApiStatus() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [data, setData] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    fetch(`${base}/health`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<HealthStatus>)
      .then((d) => {
        setData(d);
        setEstado(d.status === 'ok' ? 'ok' : 'error');
      })
      .catch(() => setEstado('error'));
  }, []);

  const etiqueta =
    estado === 'ok' ? 'API OK' : estado === 'error' ? 'API sin conexión' : 'Consultando API…';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-meta font-semibold',
        estado === 'ok' && 'border-accent-foreground/20 bg-accent text-accent-foreground',
        estado === 'error' && 'border-warning-border bg-warning-surface text-warning-foreground',
        estado === 'cargando' && 'border-border bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-pill',
          estado === 'ok' && 'bg-primary',
          estado === 'error' && 'bg-warning',
          estado === 'cargando' && 'bg-muted-foreground',
        )}
        aria-hidden
      />
      {etiqueta}
      {data ? <span className="tabular-id text-muted-foreground">· v{data.version}</span> : null}
    </div>
  );
}

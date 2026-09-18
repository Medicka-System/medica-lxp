import { Play } from 'lucide-react';
import { mono, tramaEstilo } from '@/components/tokens';

/**
 * Marco de cine-loop (§9): el visor real es Cornerstone3D (Sprint 4.7). Aquí es el
 * gancho visual — trama navy + botón de play. Sin estado (server component).
 */
export function LoopFrame({
  etiqueta,
  duracion,
  tamano = 46,
  claro = false,
}: {
  etiqueta?: string;
  duracion?: string;
  tamano?: number;
  claro?: boolean;
}) {
  return (
    <>
      <span aria-hidden className="absolute inset-0" style={{ background: tramaEstilo }} />
      <span
        aria-hidden
        style={{ width: tamano, height: tamano }}
        className={`relative grid place-items-center rounded-full ${claro ? 'bg-white/[0.92]' : 'bg-primary'} text-[color:var(--sidebar)]`}
      >
        <Play style={{ width: tamano * 0.42, height: tamano * 0.42 }} strokeWidth={2} />
      </span>
      {etiqueta && (
        <span className={`${mono} absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.14em]`} style={{ color: 'var(--hero-ink-muted)' }}>
          {etiqueta}
        </span>
      )}
      {duracion && (
        <span className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`} style={{ background: 'rgba(15,45,82,.85)' }}>
          {duracion}
        </span>
      )}
    </>
  );
}

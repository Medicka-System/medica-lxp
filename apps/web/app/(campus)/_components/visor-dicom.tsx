/**
 * ══════════════════════════════════════════════════════════════════════════════
 * VisorDicom — PLACEHOLDER (§ Sprint 4.7 · Cornerstone3D)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El visor DICOM real (ver + anotar cine-loops, navegar series) es una pieza aparte
 * que monta Cornerstone3D sobre el estudio ANONIMIZADO en object storage (worker
 * `procesar-dicom`, §8). Aquí solo dejamos el HUECO: una superficie navy con la
 * trama del sistema y la etiqueta del plano, más los badges de "loop" y "piezas".
 * Cuando exista el visor real, se reemplaza este componente sin tocar la bitácora
 * ni el Ateneo (ambos lo consumen).
 *
 * PENDIENTE 4.7: recibir `estudioRef` + `series` y renderizar el visor real.
 */

import { mono, tramaEstilo } from '@/components/tokens';

export function VisorDicomPlaceholder({
  etiqueta,
  alto = 156,
  loop,
  piezas,
  radio = 'rounded-none',
}: {
  /** Plano/órgano a mostrar como leyenda (p. ej. "riñón derecho · longitudinal"). */
  etiqueta: string;
  alto?: number;
  /** Muestra el badge "loop" (cine-loop multi-frame). */
  loop?: boolean;
  /** Nº de piezas/instancias del estudio (badge inferior). */
  piezas?: number;
  radio?: string;
}) {
  return (
    <div
      aria-hidden
      className={`relative grid w-full place-items-center overflow-hidden ${radio}`}
      style={{ height: alto, background: 'var(--wave-0)' }}
      data-visor="placeholder"
    >
      <div className="absolute inset-0" style={{ background: tramaEstilo }} />
      <span
        className={`relative ${mono} px-3 text-center text-[9.5px] uppercase tracking-[0.14em]`}
        style={{ color: 'var(--hero-ink-muted)' }}
      >
        {etiqueta}
      </span>
      {loop && (
        <span
          className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: 'rgba(15,45,82,.82)', color: 'var(--hero-ink)' }}
        >
          loop
        </span>
      )}
      {piezas !== undefined && piezas > 0 && (
        <span
          className={`absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold ${mono}`}
          style={{ background: 'rgba(15,45,82,.82)', color: 'var(--hero-ink)' }}
        >
          {piezas} {piezas === 1 ? 'pieza' : 'piezas'}
        </span>
      )}
    </div>
  );
}

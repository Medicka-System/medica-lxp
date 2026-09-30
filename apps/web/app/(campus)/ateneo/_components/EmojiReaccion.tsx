'use client';

/**
 * `EmojiReaccion` — render de UN emoji de reacción del Ateneo con Lottie (§3 · lottie-react).
 * SOLO capa visual: el tipo/modelo no cambia; el glifo sale de `REACCIONES[tipo].emoji`.
 *
 * Rendimiento (§ feed puede tener muchos posts):
 *   · `lottie-react` se carga LAZY (`next/dynamic`, sin SSR) → lottie-web NO entra al bundle
 *     inicial ni al server; llega solo cuando se pinta una reacción animada.
 *   · Hasta montar en cliente (o si `animar=false`) se muestra el GLIFO estático — cero
 *     instancias Lottie. Se usa `animar={false}` en los contadores diminutos (burbujas top)
 *     para no montar N players en el feed; se anima el picker (efímero, solo al abrir) y la
 *     reacción propia (botón).
 */

import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentType } from 'react';
import type { LottieProps } from 'lottie-react';
import { REACCIONES, type TipoReaccion } from './tipos';
import { LOTTIE_REACCION } from './reacciones-lottie';
import { useMovimientoReducido } from './use-movimiento-reducido';

// Lazy: lottie-web NO entra al bundle inicial ni al SSR. Export nombrado `Lottie` (lottie-react
// v3); se castea al tipo de props del player (next/dynamic no lo infiere del named export).
const LottiePlayer = dynamic(() => import('lottie-react').then((m) => m.Lottie), {
  ssr: false,
}) as ComponentType<LottieProps>;

export function EmojiReaccion({
  tipo,
  size = 24,
  animar = true,
}: {
  tipo: TipoReaccion;
  /** Lado del cuadro en px (el glifo/animación se ajusta dentro). */
  size?: number;
  /** `false`: glifo estático (sin instancia Lottie) — para indicadores diminutos. */
  animar?: boolean;
}) {
  const emoji = REACCIONES[tipo].emoji;
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  // Deuda saldada (§5A): Lottie corre en JS (lottie-web), así que la red CSS de
  // reduced-motion NO lo detiene. Con movimiento reducido —por el SO o por el toggle
  // "Reducir animaciones"— NO montamos el player: caemos al glifo estático (mismo
  // fallback de siempre), sin bucle ni autoplay.
  const reducido = useMovimientoReducido();

  // Glifo estático: SSR, primer render, modo no-animado o movimiento reducido (evita
  // mismatch de hidratación y mantiene el emoji SIEMPRE visible aunque el chunk de
  // Lottie aún no cargue).
  if (!animar || !montado || reducido) {
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.86),
          lineHeight: 1,
        }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <LottiePlayer src={LOTTIE_REACCION[tipo]} loop autoplay style={{ width: size, height: size }} />
    </span>
  );
}

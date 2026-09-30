'use client';

/**
 * `useMovimientoReducido` — `true` si el usuario pidió MENOS movimiento por CUALQUIERA
 * de los dos disparadores del sistema (§5A · misma red que globals.css):
 *   1. preferencia del SO — `@media (prefers-reduced-motion: reduce)`.
 *   2. toggle "Reducir animaciones" de Ajustes — atributo `[data-reducir-animaciones]`
 *      en `<html>` (lo escribe modo-lectura.tsx).
 *
 * Reactivo a ambos: escucha el cambio de la media query y observa el atributo con un
 * MutationObserver. Es para gates en JS (p. ej. Lottie/lottie-web, que el CSS global
 * NO puede recortar porque anima en <canvas>/SVG por JS); las animaciones CSS ya se
 * recortan solas con la red global. SSR-safe: arranca en `false` y se corrige al montar.
 */

import { useEffect, useState } from 'react';

export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const html = document.documentElement;
    const leer = () => setReducido(mql.matches || html.hasAttribute('data-reducir-animaciones'));
    leer();

    mql.addEventListener('change', leer);
    const mo = new MutationObserver(leer);
    mo.observe(html, { attributes: true, attributeFilter: ['data-reducir-animaciones'] });

    return () => {
      mql.removeEventListener('change', leer);
      mo.disconnect();
    };
  }, []);

  return reducido;
}

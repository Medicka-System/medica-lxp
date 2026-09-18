'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { acotarIndice, intervaloMs, siguienteIndice } from './cine';

export interface UseCineLoopOpts {
  /** Número de frames de la serie visible. */
  total: number;
  /** Cuadros por segundo. */
  fps: number;
  /** Volver al inicio al terminar (default true). */
  loop?: boolean;
  /** Callback cada vez que cambia el frame visible (lo consume el motor). */
  onFrame?: (indice: number) => void;
}

export interface CineLoop {
  /** Frame visible (0-based). */
  indice: number;
  reproduciendo: boolean;
  reproducir: () => void;
  pausar: () => void;
  alternar: () => void;
  /** Salta a un frame concreto (acota/envuelve el índice). */
  irA: (indice: number) => void;
  siguiente: () => void;
  anterior: () => void;
}

/**
 * Reproductor de cine-loop. Usa `setInterval` (no rAF) para un ritmo estable e
 * independiente del refresco de pantalla, y para que sea testeable con fake
 * timers. La lógica de avance vive en `cine.ts`.
 */
export function useCineLoop({
  total,
  fps,
  loop = true,
  onFrame,
}: UseCineLoopOpts): CineLoop {
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);

  // Refs para leer valores frescos dentro del intervalo sin re-crearlo.
  const onFrameRef = useRef(onFrame);
  const loopRef = useRef(loop);
  const totalRef = useRef(total);
  useEffect(() => {
    onFrameRef.current = onFrame;
    loopRef.current = loop;
    totalRef.current = total;
  }, [onFrame, loop, total]);

  const aplicar = useCallback((indice: number) => {
    setIndice(indice);
    onFrameRef.current?.(indice);
  }, []);

  // Si la serie cambia (menos frames), reencuadra el índice y detén si aplica.
  useEffect(() => {
    setIndice((prev) => Math.min(prev, Math.max(total - 1, 0)));
    if (total <= 1) setReproduciendo(false);
  }, [total]);

  // El reloj: solo corre si `reproduciendo` y hay más de un frame.
  useEffect(() => {
    if (!reproduciendo || total <= 1) return;
    const id = setInterval(() => {
      setIndice((actual) => {
        const { indice: prox, detener } = siguienteIndice(
          actual,
          totalRef.current,
          loopRef.current,
        );
        onFrameRef.current?.(prox);
        if (detener) setReproduciendo(false);
        return prox;
      });
    }, intervaloMs(fps));
    return () => clearInterval(id);
  }, [reproduciendo, fps, total]);

  const reproducir = useCallback(() => {
    if (totalRef.current > 1) setReproduciendo(true);
  }, []);
  const pausar = useCallback(() => setReproduciendo(false), []);
  const alternar = useCallback(
    () => setReproduciendo((r) => (totalRef.current > 1 ? !r : false)),
    [],
  );

  const irA = useCallback(
    (destino: number) => aplicar(acotarIndice(destino, totalRef.current)),
    [aplicar],
  );
  const siguiente = useCallback(
    () => aplicar(acotarIndice(indice + 1, totalRef.current)),
    [aplicar, indice],
  );
  const anterior = useCallback(
    () => aplicar(acotarIndice(indice - 1, totalRef.current)),
    [aplicar, indice],
  );

  return {
    indice,
    reproduciendo,
    reproducir,
    pausar,
    alternar,
    irA,
    siguiente,
    anterior,
  };
}

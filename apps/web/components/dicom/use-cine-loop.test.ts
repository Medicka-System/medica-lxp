import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCineLoop } from './use-cine-loop';

describe('useCineLoop', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('empieza en el frame 0 y pausado', () => {
    const { result } = renderHook(() => useCineLoop({ total: 5, fps: 10 }));
    expect(result.current.indice).toBe(0);
    expect(result.current.reproduciendo).toBe(false);
  });

  it('avanza frames al reproducir y notifica onFrame', () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() => useCineLoop({ total: 3, fps: 10, onFrame }));
    act(() => result.current.reproducir());
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.indice).toBe(1);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.indice).toBe(2);
    expect(onFrame).toHaveBeenCalledWith(1);
    expect(onFrame).toHaveBeenCalledWith(2);
  });

  it('repite en bucle sin detenerse', () => {
    const { result } = renderHook(() => useCineLoop({ total: 2, fps: 10, loop: true }));
    act(() => result.current.reproducir());
    act(() => vi.advanceTimersByTime(100)); // 0 -> 1
    act(() => vi.advanceTimersByTime(100)); // 1 -> 0
    expect(result.current.indice).toBe(0);
    expect(result.current.reproduciendo).toBe(true);
  });

  it('se detiene en el último frame sin loop', () => {
    const { result } = renderHook(() => useCineLoop({ total: 2, fps: 10, loop: false }));
    act(() => result.current.reproducir());
    act(() => vi.advanceTimersByTime(100)); // 0 -> 1 (último)
    act(() => vi.advanceTimersByTime(100)); // permanece, detiene
    expect(result.current.indice).toBe(1);
    expect(result.current.reproduciendo).toBe(false);
  });

  it('no reproduce una serie de un solo frame', () => {
    const { result } = renderHook(() => useCineLoop({ total: 1, fps: 10 }));
    act(() => result.current.reproducir());
    expect(result.current.reproduciendo).toBe(false);
  });

  it('pausa detiene el avance', () => {
    const { result } = renderHook(() => useCineLoop({ total: 5, fps: 10 }));
    act(() => result.current.reproducir());
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.pausar());
    const congelado = result.current.indice;
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.indice).toBe(congelado);
  });

  it('irA / siguiente / anterior envuelven el índice', () => {
    const { result } = renderHook(() => useCineLoop({ total: 3, fps: 10 }));
    act(() => result.current.irA(5)); // 5 % 3 = 2
    expect(result.current.indice).toBe(2);
    act(() => result.current.siguiente()); // 2 -> 0
    expect(result.current.indice).toBe(0);
    act(() => result.current.anterior()); // 0 -> 2
    expect(result.current.indice).toBe(2);
  });
});

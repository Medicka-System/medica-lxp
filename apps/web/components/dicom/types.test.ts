import { describe, expect, it } from 'vitest';
import { esCineLoop, fpsEfectivo } from './types';

describe('esCineLoop', () => {
  it('true solo con más de un frame', () => {
    expect(esCineLoop({ frames: [{ imageId: 'a', indice: 0 }] })).toBe(false);
    expect(
      esCineLoop({
        frames: [
          { imageId: 'a', indice: 0 },
          { imageId: 'b', indice: 1 },
        ],
      }),
    ).toBe(true);
    expect(esCineLoop({ frames: [] })).toBe(false);
  });
});

describe('fpsEfectivo', () => {
  it('default 30 si no hay fps', () => {
    expect(fpsEfectivo({})).toBe(30);
  });
  it('respeta el fps dado', () => {
    expect(fpsEfectivo({ fps: 24 })).toBe(24);
  });
  it('acota a un rango sano y corrige inválidos', () => {
    expect(fpsEfectivo({ fps: 0 })).toBe(30);
    expect(fpsEfectivo({ fps: -10 })).toBe(30);
    expect(fpsEfectivo({ fps: 500 })).toBe(120);
    expect(fpsEfectivo({ fps: Number.NaN })).toBe(30);
  });
});

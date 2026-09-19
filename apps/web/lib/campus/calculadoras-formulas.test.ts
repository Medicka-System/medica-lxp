import { describe, expect, it } from 'vitest';
import {
  aNumero,
  edadGestacionalLcc,
  feviTeichholz,
  volumenVesical,
  volumenTeichholz,
} from './calculadoras-formulas';

describe('aNumero', () => {
  it('acepta punto y coma decimal', () => {
    expect(aNumero('4.5')).toBe(4.5);
    expect(aNumero('4,5')).toBe(4.5);
  });
  it('devuelve null para vacío o no numérico', () => {
    expect(aNumero('')).toBeNull();
    expect(aNumero('  ')).toBeNull();
    expect(aNumero('abc')).toBeNull();
  });
});

describe('volumenVesical (elipsoide 0.52·L·An·Al)', () => {
  it('calcula el volumen en mL', () => {
    // 0.52 * 8 * 6 * 5 = 124.8
    expect(volumenVesical(8, 6, 5)).toBe(124.8);
  });
});

describe('feviTeichholz', () => {
  it('exige diámetro sistólico menor al diastólico', () => {
    expect(feviTeichholz(4.5, 4.5)).toBeNull();
    expect(feviTeichholz(3, 4)).toBeNull();
    expect(feviTeichholz(0, 2)).toBeNull();
  });
  it('calcula FEVI normal desde diámetros típicos', () => {
    // DVITD 4.8, DVITS 3.0 → FEVI ~ 66%
    const r = feviTeichholz(4.8, 3.0);
    expect(r).not.toBeNull();
    expect(r!.fevi).toBeGreaterThanOrEqual(60);
    expect(r!.fevi).toBeLessThanOrEqual(72);
    expect(r!.vdf).toBeGreaterThan(r!.vsf);
  });
  it('coincide con la fórmula de volumen de Teichholz', () => {
    const vdf = volumenTeichholz(5);
    // 7·125 / 7.4 = 118.24…
    expect(Math.round(vdf)).toBe(118);
  });
});

describe('edadGestacionalLcc (Robinson-Fleming)', () => {
  it('rechaza LCC fuera de rango', () => {
    expect(edadGestacionalLcc(1)).toBeNull();
    expect(edadGestacionalLcc(96)).toBeNull();
  });
  it('estima ~12 semanas para LCC de 55 mm', () => {
    // días = 8.052·√55 + 23.73 ≈ 83.5 → 11s 6d / 12s 0d
    const r = edadGestacionalLcc(55);
    expect(r).not.toBeNull();
    expect(r!.semanas).toBe(11);
    expect(r!.restoDias).toBeGreaterThanOrEqual(6);
  });
});

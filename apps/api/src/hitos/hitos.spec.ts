import { detectarHitos } from '@campus/shared';

describe('Detección de hitos por horas', () => {
  it('no marca nada bajo el primer umbral', () => {
    expect(detectarHitos(50, [])).toEqual([]);
  });

  it('marca el primer hito al cruzar 100 h', () => {
    expect(detectarHitos(150, [])).toEqual([{ tipo: 'horas_100', horas_umbral: 100 }]);
  });

  it('marca solo los hitos nuevos (no re-emite los ya alcanzados)', () => {
    const nuevos = detectarHitos(1200, ['horas_100']);
    expect(nuevos.map((h) => h.tipo)).toEqual(['horas_500', 'horas_1000']);
  });

  it('no repite hitos ya registrados', () => {
    expect(detectarHitos(1000, ['horas_100', 'horas_500', 'horas_1000'])).toEqual([]);
  });
});

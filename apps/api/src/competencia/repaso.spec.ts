import { estaEnCaida, proximoRepaso, retencion } from '@campus/shared';

describe('Curva de olvido y repaso espaciado', () => {
  it('retención: 1 sin tiempo, decae con Δt, se clampa en negativos', () => {
    expect(retencion(0, 30)).toBeCloseTo(1, 6);
    expect(retencion(30, 30)).toBeCloseTo(Math.exp(-1), 6);
    expect(retencion(-10, 30)).toBeCloseTo(1, 6); // Δt negativo → 0
  });

  it('estaEnCaida usa el umbral de decaimiento', () => {
    expect(estaEnCaida(20)).toBe(true);
    expect(estaEnCaida(15)).toBe(true);
    expect(estaEnCaida(10)).toBe(false);
  });

  it('proximoRepaso agenda hacia el futuro desde la última práctica', () => {
    const ahora = new Date('2026-01-01T00:00:00.000Z');
    const ultima = '2026-01-01T00:00:00.000Z';
    const fecha = proximoRepaso(ultima, 0, 'adquisicion', ahora);
    // baseDias = -30*ln(0.75) ≈ 8.63; factorNivel(0)=1 → ~8-9 días después
    const dias = (new Date(fecha).getTime() - new Date(ultima).getTime()) / 86_400_000;
    expect(dias).toBeGreaterThan(8);
    expect(dias).toBeLessThan(10);
  });

  it('nunca agenda un repaso en el pasado', () => {
    const ahora = new Date('2026-01-01T00:00:00.000Z');
    const ultima = '2020-01-01T00:00:00.000Z'; // muy vieja
    const fecha = proximoRepaso(ultima, 0, 'adquisicion', ahora);
    expect(fecha).toBe(ahora.toISOString());
  });

  it('mayor nivel ⇒ intervalo de repaso más largo', () => {
    const ahora = new Date('2026-01-01T00:00:00.000Z');
    const ultima = '2026-01-01T00:00:00.000Z';
    const bajo = new Date(proximoRepaso(ultima, 0, 'interpretacion', ahora)).getTime();
    const alto = new Date(proximoRepaso(ultima, 100, 'interpretacion', ahora)).getTime();
    expect(alto).toBeGreaterThan(bajo);
  });
});

import {
  calcularCompetencia,
  horasTotales,
  type CasoParaCompetencia,
} from '@campus/shared';

describe('Motor de competencia (calcularCompetencia)', () => {
  it('suma horas por dominio y satura el nivel en 100', () => {
    const ahora = new Date('2026-01-31T00:00:00.000Z');
    const casos: CasoParaCompetencia[] = [
      { dominio_iaim: 'adquisicion', horas_estimadas: 10, fecha: ahora.toISOString() },
      { dominio_iaim: 'adquisicion', horas_estimadas: 5, fecha: ahora.toISOString() },
    ];
    const [comp] = calcularCompetencia(casos, ahora);
    expect(comp?.horas).toBe(15);
    // nivelBruto = min(100, 15*4)=60; sin decaimiento (práctica = ahora)
    expect(comp?.nivel).toBe(60);
    expect(comp?.decaimiento).toBe(0);
  });

  it('aplica la curva de olvido según τ del dominio (Adquisición decae rápido)', () => {
    const ahora = new Date('2026-01-31T00:00:00.000Z');
    const hace30dias = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const casos: CasoParaCompetencia[] = [
      { dominio_iaim: 'adquisicion', horas_estimadas: 25, fecha: hace30dias }, // nivelBruto 100
    ];
    const [comp] = calcularCompetencia(casos, ahora);
    // τ=30, Δt=30 → retención=e^-1≈0.3679 → nivel≈37, decaimiento≈63
    expect(comp?.nivel).toBe(37);
    expect(comp?.decaimiento).toBe(63);
  });

  it('devuelve un dominio por grupo, ordenado por I-AIM', () => {
    const ahora = new Date('2026-01-31T00:00:00.000Z');
    const f = ahora.toISOString();
    const casos: CasoParaCompetencia[] = [
      { dominio_iaim: 'interpretacion', horas_estimadas: 2, fecha: f },
      { dominio_iaim: 'indicacion', horas_estimadas: 2, fecha: f },
      { dominio_iaim: 'interpretacion', horas_estimadas: 3, fecha: f },
    ];
    const res = calcularCompetencia(casos, ahora);
    expect(res.map((r) => r.dominio_iaim)).toEqual(['indicacion', 'interpretacion']);
    expect(res.find((r) => r.dominio_iaim === 'interpretacion')?.horas).toBe(5);
  });

  it('horasTotales suma todos los casos', () => {
    const casos: CasoParaCompetencia[] = [
      { dominio_iaim: 'indicacion', horas_estimadas: 1.5, fecha: '2026-01-01T00:00:00Z' },
      { dominio_iaim: 'adquisicion', horas_estimadas: 2.25, fecha: '2026-01-01T00:00:00Z' },
    ];
    expect(horasTotales(casos)).toBe(3.75);
  });
});

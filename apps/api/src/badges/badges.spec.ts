import {
  badgesAOtorgar,
  cumpleReglaBadge,
  type BadgeCatalogo,
  type ContextoBadges,
} from '@campus/shared';

const ctxBase: ContextoBadges = {
  casosAprobados: 1,
  horasTotales: 5,
  nivelPorDominio: { adquisicion: 70, interpretacion: 65 },
  hitos: ['horas_100'],
};

describe('Reglas de badges', () => {
  it('regla por casos', () => {
    expect(cumpleReglaBadge({ tipo: 'casos', umbral: 1 }, ctxBase)).toBe(true);
    expect(cumpleReglaBadge({ tipo: 'casos', umbral: 5 }, ctxBase)).toBe(false);
  });

  it('regla por competencia (todos los dominios ≥ umbral)', () => {
    expect(cumpleReglaBadge({ tipo: 'competencia', umbral: 60 }, ctxBase)).toBe(true);
    expect(cumpleReglaBadge({ tipo: 'competencia', umbral: 68 }, ctxBase)).toBe(false);
  });

  it('regla por competencia de un dominio específico', () => {
    expect(
      cumpleReglaBadge({ tipo: 'competencia', umbral: 70, dominio: 'adquisicion' }, ctxBase),
    ).toBe(true);
  });

  it('regla por hito', () => {
    expect(cumpleReglaBadge({ tipo: 'hito', hito: 'horas_100' }, ctxBase)).toBe(true);
    expect(cumpleReglaBadge({ tipo: 'hito', hito: 'horas_500' }, ctxBase)).toBe(false);
  });

  it('badgesAOtorgar: solo automáticos, cumplidos y no otorgados', () => {
    const catalogo: BadgeCatalogo[] = [
      { id: 'b1', clave: 'primer_caso', regla: { tipo: 'casos', umbral: 1 } },
      { id: 'b2', clave: 'manual', regla: null }, // manual → nunca automático
      { id: 'b3', clave: 'centurion', regla: { tipo: 'hito', hito: 'horas_100' } },
    ];
    expect(badgesAOtorgar(catalogo, ctxBase, [])).toEqual(['b1', 'b3']);
    expect(badgesAOtorgar(catalogo, ctxBase, ['b1'])).toEqual(['b3']);
  });
});

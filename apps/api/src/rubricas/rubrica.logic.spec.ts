import { validarCriterios } from './rubrica.logic';

describe('validarCriterios (rúbrica catálogo · §5B)', () => {
  it('acepta criterios con pesos que suman 100 y los normaliza', () => {
    const r = validarCriterios([
      { criterio: ' Adquisición ', peso: 40, descripcion: ' calidad de imagen ' },
      { criterio: 'Interpretación', peso: 60 },
    ]);
    expect(r).toEqual([
      { criterio: 'Adquisición', peso: 40, descripcion: 'calidad de imagen' },
      { criterio: 'Interpretación', peso: 60 },
    ]);
  });

  it('acepta rúbrica cualitativa (todos los pesos en 0)', () => {
    const r = validarCriterios([
      { criterio: 'Hallazgos', peso: 0 },
      { criterio: 'Diagnóstico', peso: 0 },
    ]);
    expect(r).toHaveLength(2);
  });

  it('rechaza si los pesos ponderados no suman 100', () => {
    expect(() => validarCriterios([{ criterio: 'A', peso: 40 }, { criterio: 'B', peso: 40 }])).toThrow(
      /suman 80/,
    );
  });

  it('rechaza criterio sin nombre', () => {
    expect(() => validarCriterios([{ criterio: '  ', peso: 100 }])).toThrow(/sin nombre/i);
  });

  it('rechaza peso fuera de rango', () => {
    expect(() => validarCriterios([{ criterio: 'A', peso: 120 }])).toThrow(/entre 0 y 100/);
  });

  it('rechaza arreglo vacío o no-arreglo', () => {
    expect(() => validarCriterios([])).toThrow(/al menos un criterio/);
    expect(() => validarCriterios('nope')).toThrow();
  });
});

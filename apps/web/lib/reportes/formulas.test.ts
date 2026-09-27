import { describe, expect, it } from 'vitest';
import { CATALOGO_FORMULAS, evaluarCampoCalculado, etiquetaFormula, IDS_FORMULA } from './formulas';

// Atajo: corre una fórmula del catálogo con entradas resueltas por nombre.
const run = (id: keyof typeof CATALOGO_FORMULAS, e: Record<string, unknown>, decimales?: number) =>
  CATALOGO_FORMULAS[id].calcular(e, { decimales });

describe('catálogo de fórmulas', () => {
  it('expone las 7 fórmulas', () => {
    expect(IDS_FORMULA).toHaveLength(7);
  });

  describe('edad_paciente', () => {
    it('años cumplidos', () => {
      expect(run('edad_paciente', { fecha_estudio: '2026-01-01', fecha_nacimiento: '1990-01-01' })).toBe('36');
    });
    it('aún no cumple el año → uno menos', () => {
      expect(run('edad_paciente', { fecha_estudio: '2026-06-30', fecha_nacimiento: '1990-12-31' })).toBe('35');
    });
    it('entrada faltante → vacío', () => {
      expect(run('edad_paciente', { fecha_estudio: '2026-01-01' })).toBe('');
    });
    it('fecha inválida → vacío', () => {
      expect(run('edad_paciente', { fecha_estudio: 'xx', fecha_nacimiento: '1990-01-01' })).toBe('');
    });
  });

  describe('edad_gestacional_fum', () => {
    it('formato semanas.días', () => {
      // 157 días = 22 sem 3 días
      expect(run('edad_gestacional_fum', { fecha_estudio: '2026-06-07', fum: '2026-01-01' })).toBe('22.3');
    });
    it('exactas 12 semanas', () => {
      expect(run('edad_gestacional_fum', { fecha_estudio: '2026-03-26', fum: '2026-01-01' })).toBe('12.0');
    });
    it('FUM futura → vacío (días negativos)', () => {
      expect(run('edad_gestacional_fum', { fecha_estudio: '2026-01-01', fum: '2026-06-01' })).toBe('');
    });
    it('FUM faltante → vacío', () => {
      expect(run('edad_gestacional_fum', { fecha_estudio: '2026-06-07' })).toBe('');
    });
  });

  describe('fpp', () => {
    it('FUM + 280 días', () => {
      expect(run('fpp', { fum: '2026-01-01' })).toBe('2026-10-08');
    });
    it('faltante → vacío', () => {
      expect(run('fpp', {})).toBe('');
    });
  });

  describe('volumen_elipsoide', () => {
    it('l × a × p × 0.523 (1 decimal por defecto)', () => {
      // 5 × 4 × 3 × 0.523 = 31.38
      expect(run('volumen_elipsoide', { largo: 5, ancho: 4, profundidad: 3 })).toBe('31.4');
    });
    it('respeta decimales del campo', () => {
      expect(run('volumen_elipsoide', { largo: 5, ancho: 4, profundidad: 3 }, 2)).toBe('31.38');
    });
    it('acepta strings con coma decimal', () => {
      expect(run('volumen_elipsoide', { largo: '5', ancho: '4', profundidad: '3,0' })).toBe('31.4');
    });
    it('falta un eje → vacío', () => {
      expect(run('volumen_elipsoide', { largo: 5, ancho: 4 })).toBe('');
    });
  });

  describe('indice_resistencia', () => {
    it('(VPS − VTD) / VPS (2 decimales)', () => {
      // (80 - 20) / 80 = 0.75
      expect(run('indice_resistencia', { vps: 80, vtd: 20 })).toBe('0.75');
    });
    it('VPS = 0 → vacío (no divide por cero)', () => {
      expect(run('indice_resistencia', { vps: 0, vtd: 0 })).toBe('');
    });
    it('VTD faltante → vacío', () => {
      expect(run('indice_resistencia', { vps: 80 })).toBe('');
    });
  });

  describe('peso_fetal_hadlock', () => {
    it('Hadlock 4 parámetros → gramos (redondeado)', () => {
      // DBP 9.2, CC 33, CA 30, FL 7 cm → ~2494 g (referencia Hadlock 1985)
      const r = run('peso_fetal_hadlock', { dbp: 9.2, cc: 33, ca: 30, femur: 7 });
      expect(Number(r)).toBeGreaterThan(2300);
      expect(Number(r)).toBeLessThan(2700);
      expect(r).not.toContain('.'); // 0 decimales por defecto
    });
    it('falta el fémur → vacío', () => {
      expect(run('peso_fetal_hadlock', { dbp: 9.2, cc: 33, ca: 30 })).toBe('');
    });
  });

  describe('ila', () => {
    it('suma de los 4 cuadrantes', () => {
      expect(run('ila', { q1: 30, q2: 25, q3: 40, q4: 35 })).toBe('130');
    });
    it('un cuadrante faltante → vacío', () => {
      expect(run('ila', { q1: 30, q2: 25, q3: 40 })).toBe('');
    });
  });
});

describe('evaluarCampoCalculado (resuelve entradas por campoId contra la fuente)', () => {
  it('mapea entradas a campos del reporte y calcula', () => {
    const campo = {
      formula: 'indice_resistencia',
      entradas: { vps: 'campoVps', vtd: 'campoVtd' },
    };
    const fuente = { campoVps: '80', campoVtd: '20' };
    expect(evaluarCampoCalculado(campo, fuente)).toBe('0.75');
  });
  it('entrada no mapeada → vacío (no crash)', () => {
    const campo = { formula: 'indice_resistencia', entradas: { vps: 'campoVps' } };
    expect(evaluarCampoCalculado(campo, { campoVps: '80' })).toBe('');
  });
  it('fórmula ausente/desconocida → vacío', () => {
    expect(evaluarCampoCalculado({}, {})).toBe('');
    expect(evaluarCampoCalculado({ formula: 'no_existe' }, {})).toBe('');
  });
});

describe('etiquetaFormula', () => {
  it('devuelve el rótulo del catálogo', () => {
    expect(etiquetaFormula('fpp')).toBe('Fecha probable de parto');
  });
  it('id desconocido → vacío', () => {
    expect(etiquetaFormula('nope')).toBe('');
    expect(etiquetaFormula(undefined)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import {
  CATALOGO_FORMULAS,
  evaluarCampoCalculado,
  etiquetaFormula,
  IDS_FORMULA,
  recalcularFormulas,
  type CampoConFormula,
} from './formulas';

// Atajo: corre una fórmula del catálogo con entradas resueltas por nombre.
const run = (id: keyof typeof CATALOGO_FORMULAS, e: Record<string, unknown>, decimales?: number) =>
  CATALOGO_FORMULAS[id].calcular(e, { decimales });

describe('catálogo de fórmulas', () => {
  it('expone las 7 fórmulas', () => {
    expect(IDS_FORMULA).toHaveLength(7);
  });

  describe('edad_paciente', () => {
    it('años cumplidos (mismo día)', () => {
      expect(run('edad_paciente', { fecha_estudio: '2026-01-01', fecha_nacimiento: '1990-01-01' })).toBe('36');
    });
    it('cumpleaños YA pasó en el año del estudio', () => {
      // nace en junio, estudio en septiembre → ya cumplió: 43
      expect(run('edad_paciente', { fecha_estudio: '2024-09-01', fecha_nacimiento: '1981-06-15' })).toBe('43');
    });
    it('cumpleaños AÚN no llega en el año del estudio → uno menos', () => {
      // nace en junio, estudio en enero → todavía no cumple: 42
      expect(run('edad_paciente', { fecha_estudio: '2024-01-01', fecha_nacimiento: '1981-06-15' })).toBe('42');
    });
    it('el día exacto del cumpleaños ya cuenta el año', () => {
      expect(run('edad_paciente', { fecha_estudio: '2024-06-15', fecha_nacimiento: '1981-06-15' })).toBe('43');
    });
    it('un día antes del cumpleaños aún no cuenta', () => {
      expect(run('edad_paciente', { fecha_estudio: '2024-06-14', fecha_nacimiento: '1981-06-15' })).toBe('42');
    });
    it('límite mismo día/mes (regresión del bug /365.25 que daba uno menos)', () => {
      // Exactamente en el cumpleaños nº43; dias/365.25 devolvía 42, el calendario da 43.
      expect(run('edad_paciente', { fecha_estudio: '2024-01-01', fecha_nacimiento: '1981-01-01' })).toBe('43');
    });
    it('estudio anterior al nacimiento → vacío', () => {
      expect(run('edad_paciente', { fecha_estudio: '1980-01-01', fecha_nacimiento: '1990-01-01' })).toBe('');
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

describe('recalcularFormulas (regla A+B del llenado)', () => {
  // Un campo IR (índice de resistencia) que lee vps/vtd de otros campos del reporte.
  const campoIR: CampoConFormula = {
    id: 'ir',
    campo: { formula: 'indice_resistencia', entradas: { vps: 'cVps', vtd: 'cVtd' } },
  };

  it('calcula e inyecta cuando hay insumos (primer cálculo, sin fuente anterior)', () => {
    const manual = new Set<string>();
    const upd = recalcularFormulas([campoIR], { cVps: '80', cVtd: '20' }, null, manual);
    expect(upd).toEqual({ ir: '0.75' });
  });

  it('RECÁLCULO se dispara al cambiar una fuente (aunque hubiera edición manual)', () => {
    const manual = new Set<string>(['ir']); // el médico había editado el valor a mano
    const prev = { cVps: '80', cVtd: '20' };
    const ahora = { cVps: '100', cVtd: '20' }; // cambió VPS → los insumos mandan
    const upd = recalcularFormulas([campoIR], ahora, prev, manual);
    expect(manual.has('ir')).toBe(false); // marca manual limpiada
    expect(upd).toEqual({ ir: '0.80' }); // (100-20)/100
  });

  it('RESPETA el valor manual mientras NINGUNA fuente cambie', () => {
    const manual = new Set<string>(['ir']);
    const prev = { cVps: '80', cVtd: '20' };
    const ahora = { cVps: '80', cVtd: '20' }; // sin cambios en fuentes
    const upd = recalcularFormulas([campoIR], ahora, prev, manual);
    expect(manual.has('ir')).toBe(true); // sigue marcado como manual
    expect(upd.ir).toBeUndefined(); // no se pisa el valor del médico
  });

  it('recalcula al cambiar CUALQUIER fuente (no solo la primera)', () => {
    const manual = new Set<string>(['ir']);
    const prev = { cVps: '80', cVtd: '20' };
    const ahora = { cVps: '80', cVtd: '40' }; // cambió VTD
    const upd = recalcularFormulas([campoIR], ahora, prev, manual);
    expect(manual.has('ir')).toBe(false);
    expect(upd).toEqual({ ir: '0.50' }); // (80-40)/80
  });

  it('sin insumos suficientes no inyecta nada (no pisa con vacío)', () => {
    const manual = new Set<string>();
    const upd = recalcularFormulas([campoIR], { cVps: '80' }, null, manual);
    expect(upd.ir).toBeUndefined();
  });
});

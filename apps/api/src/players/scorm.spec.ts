import { interpretarCmi } from './scorm';

describe('interpretarCmi', () => {
  it('SCORM 1.2 passed con score raw/max → aprobado y porcentaje', () => {
    const v = interpretarCmi({
      'cmi.core.lesson_status': 'passed',
      'cmi.core.score.raw': '80',
      'cmi.core.score.max': '100',
    });
    expect(v.completado).toBe(true);
    expect(v.aprobado).toBe(true);
    expect(v.porcentaje).toBe(80);
    expect(v.scaled).toBeCloseTo(0.8);
  });

  it('SCORM 1.2 failed → reprobado', () => {
    const v = interpretarCmi({ 'cmi.core.lesson_status': 'failed', 'cmi.core.score.raw': '40' });
    expect(v.aprobado).toBe(false);
    expect(v.completado).toBe(false);
  });

  it('SCORM 2004 completed + success passed + score.scaled', () => {
    const v = interpretarCmi({
      completion_status: 'completed',
      success_status: 'passed',
      'score.scaled': '0.95',
    });
    expect(v.completado).toBe(true);
    expect(v.aprobado).toBe(true);
    expect(v.porcentaje).toBe(95);
  });

  it('incomplete sin score → ni completado ni veredicto', () => {
    const v = interpretarCmi({ 'cmi.core.lesson_status': 'incomplete' });
    expect(v.completado).toBe(false);
    expect(v.aprobado).toBeNull();
    expect(v.porcentaje).toBe(0);
    expect(v.scaled).toBeNull();
  });

  it('acepta claves con y sin prefijo cmi.', () => {
    const v = interpretarCmi({ lesson_status: 'completed' });
    expect(v.completado).toBe(true);
  });
});

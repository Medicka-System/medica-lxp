import { describe, expect, it } from 'vitest';
import { comoTareaConfig } from './tarea-contrato';

describe('comoTareaConfig', () => {
  it('devuelve defaults seguros para config vacío', () => {
    const c = comoTareaConfig({});
    expect(c.rubricaId).toBeNull();
    expect(c.lineamientos).toBe('');
    expect(c.valor).toBeUndefined();
    expect(c.entrega).toBe('archivo');
  });

  it('conserva rúbrica, lineamientos, valor y formato válidos', () => {
    const c = comoTareaConfig({
      rubricaId: 'rub-1',
      lineamientos: '<p>Sube tu caso</p>',
      valor: 10,
      entrega: 'ambos',
    });
    expect(c.rubricaId).toBe('rub-1');
    expect(c.lineamientos).toBe('<p>Sube tu caso</p>');
    expect(c.valor).toBe(10);
    expect(c.entrega).toBe('ambos');
  });

  it('normaliza valor negativo a undefined y formato inválido a archivo', () => {
    const c = comoTareaConfig({ valor: -5, entrega: 'raro' as never });
    expect(c.valor).toBeUndefined();
    expect(c.entrega).toBe('archivo');
  });

  it('rubricaId vacío queda en null', () => {
    expect(comoTareaConfig({ rubricaId: '' }).rubricaId).toBeNull();
    expect(comoTareaConfig(null).rubricaId).toBeNull();
  });
});

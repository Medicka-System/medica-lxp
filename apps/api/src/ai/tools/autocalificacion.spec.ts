import {
  autoCalificar,
  esAutoCalificable,
} from './autocalificacion.tool';
import type { ItemEvaluable } from '../pipeline/tipos';

describe('autocalificación objetiva (tools primero · §7A)', () => {
  const base: ItemEvaluable = {
    tipo: 'entrega',
    id: 'e1',
    actividadTipo: 'autoevaluacion',
    respuesta: { respuestas: { q1: 'a', q2: 'c' } },
    claveObjetiva: { correctas: { q1: 'a', q2: 'c' } },
  };

  it('es auto-calificable solo si es autoevaluación con clave y respuesta', () => {
    expect(esAutoCalificable(base)).toBe(true);
    expect(esAutoCalificable({ ...base, actividadTipo: 'tarea' })).toBe(false);
    expect(esAutoCalificable({ ...base, claveObjetiva: null })).toBe(false);
    expect(esAutoCalificable({ ...base, respuesta: {} })).toBe(false);
  });

  it('califica 100 cuando todo coincide', () => {
    const r = autoCalificar(base.respuesta, base.claveObjetiva!);
    expect(r.nota).toBe(100);
    expect(r.aciertos).toBe(2);
    expect(r.total).toBe(2);
  });

  it('califica proporcional a los aciertos', () => {
    const r = autoCalificar({ respuestas: { q1: 'a', q2: 'x' } }, base.claveObjetiva!);
    expect(r.nota).toBe(50);
    expect(r.aciertos).toBe(1);
  });

  it('multi-respuesta es orden-insensible', () => {
    const r = autoCalificar(
      { respuestas: { q1: ['b', 'a'] } },
      { correctas: { q1: ['a', 'b'] } },
    );
    expect(r.nota).toBe(100);
  });

  it('respuesta faltante cuenta como incorrecta', () => {
    const r = autoCalificar({ respuestas: { q1: 'a' } }, base.claveObjetiva!);
    expect(r.aciertos).toBe(1);
    expect(r.total).toBe(2);
    expect(r.nota).toBe(50);
  });
});

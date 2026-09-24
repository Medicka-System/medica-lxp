import { describe, expect, it } from 'vitest';
import { comoAutoevalConfig, normalizarReactivo } from './autoeval-contrato';

describe('normalizarReactivo', () => {
  it('descarta reactivos sin enunciado', () => {
    expect(normalizarReactivo({ enunciado: '   ' })).toBeNull();
    expect(normalizarReactivo(null)).toBeNull();
    expect(normalizarReactivo('texto')).toBeNull();
  });

  it('normaliza un reactivo de opción múltiple (correcta como clave)', () => {
    const r = normalizarReactivo({
      enunciado: '¿Qué es POCUS?',
      tipo: 'opcion_multiple',
      opciones: [
        { clave: 'a', texto: 'Point-of-care US' },
        { clave: 'b', texto: 'Otra' },
      ],
      correcta: 'a',
      puntaje: 2,
    });
    expect(r).not.toBeNull();
    expect(r!.tipo).toBe('opcion_multiple');
    expect(r!.correcta).toBe('a');
    expect(r!.puntaje).toBe(2);
    expect(r!.opciones).toHaveLength(2);
    expect(r!.id).toBeTruthy();
  });

  it('conserva varias correctas en multi (arreglo)', () => {
    const r = normalizarReactivo({
      enunciado: 'Marca las verdaderas',
      tipo: 'multi',
      opciones: [
        { clave: 'a', texto: 'x' },
        { clave: 'b', texto: 'y' },
        { clave: 'c', texto: 'z' },
      ],
      correcta: ['a', 'c'],
    });
    expect(r!.correcta).toEqual(['a', 'c']);
  });

  it('fuerza correcta null y sin opciones en abierta', () => {
    const r = normalizarReactivo({
      enunciado: 'Describe el hallazgo',
      tipo: 'abierta',
      correcta: 'algo',
      opciones: [{ clave: 'a', texto: 'x' }],
    });
    expect(r!.tipo).toBe('abierta');
    expect(r!.correcta).toBeNull();
  });

  it('cae a opcion_multiple ante un tipo inválido y puntaje ≥ 1', () => {
    const r = normalizarReactivo({ enunciado: 'x', tipo: 'inexistente', puntaje: -3 });
    expect(r!.tipo).toBe('opcion_multiple');
    expect(r!.puntaje).toBe(1);
  });

  it('limpia imagen vacía a undefined y conserva una URL', () => {
    expect(normalizarReactivo({ enunciado: 'x', imagen: '   ' })!.imagen).toBeUndefined();
    // `imagen` se normaliza al objeto ImagenReactivo ({ url, pie, anotaciones }): la URL
    // (recortada) vive en `.url`. Antes el reactivo guardaba un string plano.
    expect(normalizarReactivo({ enunciado: 'x', imagen: ' http://a/b.png ' })!.imagen?.url).toBe(
      'http://a/b.png',
    );
  });
});

describe('comoAutoevalConfig', () => {
  it('devuelve defaults seguros para config vacío', () => {
    const c = comoAutoevalConfig({});
    expect(c.reactivos).toEqual([]);
    expect(c.mostrarRetro).toBe(true); // por defecto se muestra
    expect(c.barajar).toBe(false);
    expect(c.actividadId).toBeUndefined();
  });

  it('filtra reactivos inválidos y preserva el puente actividadId', () => {
    const c = comoAutoevalConfig({
      reactivos: [{ enunciado: 'ok' }, { enunciado: '' }, 42],
      actividadId: 'act-1',
      barajar: true,
      mostrarRetro: false,
      intentos: 3,
    });
    expect(c.reactivos).toHaveLength(1);
    expect(c.actividadId).toBe('act-1');
    expect(c.barajar).toBe(true);
    expect(c.mostrarRetro).toBe(false);
    expect(c.intentos).toBe(3);
  });

  it('ignora null/undefined sin lanzar', () => {
    expect(comoAutoevalConfig(null).reactivos).toEqual([]);
    expect(comoAutoevalConfig(undefined).reactivos).toEqual([]);
  });
});

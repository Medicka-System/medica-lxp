import { describe, expect, it } from 'vitest';
import { parseDefinicion, resolverCalculo, type DefinicionCalculadora } from './calculadoras-motor';

const defElipsoide = {
  entradas: [
    { nombre: 'largo', etiqueta: 'Largo', unidad: 'cm' },
    { nombre: 'ancho', etiqueta: 'Ancho', unidad: 'cm' },
    { nombre: 'alto', etiqueta: 'Alto', unidad: 'cm' },
  ],
  formula: '0.52 * largo * ancho * alto',
  salida: {
    unidad: 'mL',
    decimales: 1,
    bandas: [
      { max: 25, texto: 'Dentro de rango', tono: 'primary' },
      { min: 25, texto: 'Aumentado', tono: 'warning' },
    ],
  },
};

describe('parseDefinicion', () => {
  it('acepta una definición válida', () => {
    const d = parseDefinicion(defElipsoide);
    expect(d).not.toBeNull();
    expect(d!.entradas).toHaveLength(3);
    expect(d!.salida.unidad).toBe('mL');
    expect(d!.salida.bandas).toHaveLength(2);
  });

  it('rechaza formas inválidas', () => {
    expect(parseDefinicion(null)).toBeNull();
    expect(parseDefinicion({})).toBeNull();
    expect(parseDefinicion({ entradas: [], formula: '1' })).toBeNull();
    expect(parseDefinicion({ entradas: [{ nombre: 'a', etiqueta: 'A' }], formula: '' })).toBeNull();
  });

  it('rechaza nombres de entrada inválidos o duplicados', () => {
    expect(parseDefinicion({ entradas: [{ nombre: '1x', etiqueta: 'X' }], formula: '1x' })).toBeNull();
    expect(
      parseDefinicion({
        entradas: [
          { nombre: 'a', etiqueta: 'A' },
          { nombre: 'a', etiqueta: 'A2' },
        ],
        formula: 'a',
      }),
    ).toBeNull();
  });

  it('rechaza la fórmula que usa una variable inexistente', () => {
    expect(parseDefinicion({ entradas: [{ nombre: 'a', etiqueta: 'A' }], formula: 'a + b' })).toBeNull();
  });

  it('SEGURIDAD: rechaza fórmulas con funciones/identificadores no permitidos', () => {
    const peligrosas = [
      'process',
      'globalThis.x',
      'eval(1)',
      'a.b',
      'window',
      "require('fs')",
      'constructor',
    ];
    for (const f of peligrosas) {
      expect(parseDefinicion({ entradas: [{ nombre: 'a', etiqueta: 'A' }], formula: f })).toBeNull();
    }
  });

  it('acepta funciones y constantes del catálogo cerrado', () => {
    expect(
      parseDefinicion({ entradas: [{ nombre: 'r', etiqueta: 'R' }], formula: 'pi * r ^ 2' }),
    ).not.toBeNull();
    expect(
      parseDefinicion({ entradas: [{ nombre: 'x', etiqueta: 'X' }], formula: 'sqrt(x) + abs(-x)' }),
    ).not.toBeNull();
  });
});

describe('resolverCalculo', () => {
  const def = parseDefinicion(defElipsoide) as DefinicionCalculadora;

  it('calcula el volumen y elige la banda correcta', () => {
    // 0.52 * 3 * 3 * 3 = 14.04 → banda "Dentro de rango"
    const r = resolverCalculo(def, { largo: '3', ancho: '3', alto: '3' });
    expect(r).not.toBeNull();
    expect(r!.valor).toBe('14.0');
    expect(r!.unidad).toBe('mL');
    expect(r!.tono).toBe('primary');
    expect(r!.nota).toBe('Dentro de rango');
  });

  it('elige la banda "Aumentado" para volúmenes altos', () => {
    // 0.52 * 5 * 5 * 5 = 65 → banda "Aumentado"
    const r = resolverCalculo(def, { largo: '5', ancho: '5', alto: '5' });
    expect(r!.tono).toBe('warning');
    expect(r!.nota).toBe('Aumentado');
  });

  it('devuelve null si falta o es inválida alguna entrada', () => {
    expect(resolverCalculo(def, { largo: '3', ancho: '3' })).toBeNull();
    expect(resolverCalculo(def, { largo: '3', ancho: 'x', alto: '3' })).toBeNull();
  });

  it('respeta precedencia, paréntesis y unario', () => {
    const d = parseDefinicion({
      entradas: [
        { nombre: 'a', etiqueta: 'A' },
        { nombre: 'b', etiqueta: 'B' },
      ],
      formula: '(a + b) * -2',
      salida: { decimales: 0 },
    }) as DefinicionCalculadora;
    expect(resolverCalculo(d, { a: '3', b: '1' })!.valor).toBe('-8');
  });

  it('acepta punto y coma decimal en las entradas', () => {
    const r = resolverCalculo(def, { largo: '2,5', ancho: '2', alto: '2' });
    // 0.52 * 2.5 * 2 * 2 = 5.2
    expect(r!.valor).toBe('5.2');
  });

  it('devuelve null ante división entre cero (no finito)', () => {
    const d = parseDefinicion({
      entradas: [
        { nombre: 'a', etiqueta: 'A' },
        { nombre: 'b', etiqueta: 'B' },
      ],
      formula: 'a / b',
    }) as DefinicionCalculadora;
    expect(resolverCalculo(d, { a: '5', b: '0' })).toBeNull();
  });

  it('evalúa funciones del catálogo (Mosteller: sqrt(peso*talla/3600))', () => {
    const d = parseDefinicion({
      entradas: [
        { nombre: 'peso', etiqueta: 'Peso', unidad: 'kg' },
        { nombre: 'talla', etiqueta: 'Talla', unidad: 'cm' },
      ],
      formula: 'sqrt(peso * talla / 3600)',
      salida: { unidad: 'm²', decimales: 2 },
    }) as DefinicionCalculadora;
    // sqrt(70 * 170 / 3600) = sqrt(3.305…) ≈ 1.82
    expect(resolverCalculo(d, { peso: '70', talla: '170' })!.valor).toBe('1.82');
  });
});

import { describe, expect, it } from 'vitest';
import { acotarIndice, intervaloMs, siguienteIndice } from './cine';

describe('intervaloMs', () => {
  it('convierte fps a milisegundos por frame', () => {
    expect(intervaloMs(10)).toBe(100);
    expect(intervaloMs(25)).toBe(40);
  });
  it('cae a 30fps ante valores inválidos', () => {
    expect(intervaloMs(0)).toBe(intervaloMs(30));
    expect(intervaloMs(-5)).toBe(intervaloMs(30));
    expect(intervaloMs(Number.NaN)).toBe(intervaloMs(30));
  });
});

describe('siguienteIndice', () => {
  it('avanza al siguiente frame', () => {
    expect(siguienteIndice(0, 5, true)).toEqual({ indice: 1, detener: false });
    expect(siguienteIndice(3, 5, false)).toEqual({ indice: 4, detener: false });
  });
  it('vuelve al inicio con loop en el último frame', () => {
    expect(siguienteIndice(4, 5, true)).toEqual({ indice: 0, detener: false });
  });
  it('se detiene en el último frame sin loop', () => {
    expect(siguienteIndice(4, 5, false)).toEqual({ indice: 4, detener: true });
  });
  it('una serie de un frame siempre se detiene en 0', () => {
    expect(siguienteIndice(0, 1, true)).toEqual({ indice: 0, detener: true });
    expect(siguienteIndice(0, 0, true)).toEqual({ indice: 0, detener: true });
  });
  it('acota índices fuera de rango antes de avanzar', () => {
    expect(siguienteIndice(99, 5, true)).toEqual({ indice: 0, detener: false });
    expect(siguienteIndice(-3, 5, true)).toEqual({ indice: 1, detener: false });
  });
});

describe('acotarIndice', () => {
  it('envuelve por ambos extremos', () => {
    expect(acotarIndice(5, 3)).toBe(2);
    expect(acotarIndice(-1, 3)).toBe(2);
    expect(acotarIndice(3, 3)).toBe(0);
    expect(acotarIndice(1, 3)).toBe(1);
  });
  it('devuelve 0 sin frames', () => {
    expect(acotarIndice(4, 0)).toBe(0);
  });
});

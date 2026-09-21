import { describe, it, expect } from 'vitest';
import { comoAncla, esAnclaTexto, esAnclaVideo } from './notas-contrato';

/**
 * El jsonb `ancla` puede volver de la BD/frontera RSC como OBJETO o como STRING; usar
 * `in`/acceder a props sobre un string revienta (regresión real al renderizar una nota
 * de subrayado). `comoAncla` debe dejar siempre un objeto seguro.
 */
describe('comoAncla', () => {
  it('parsea el ancla cuando llega como string (jsonb crudo)', () => {
    const s = JSON.stringify({ bloqueId: 'b1', inicio: 1, fin: 5, texto: 'hola' });
    const a = comoAncla(s);
    expect(esAnclaTexto(a)).toBe(true);
    if (esAnclaTexto(a)) expect(a.texto).toBe('hola');
  });

  it('pasa el objeto tal cual y reconoce el ancla de video', () => {
    const a = comoAncla({ segundos: 42 });
    expect(a).toEqual({ segundos: 42 });
    expect(esAnclaVideo(a)).toBe(true);
  });

  it('cae a objeto vacío ante basura', () => {
    expect(comoAncla('no-es-json')).toEqual({});
    expect(comoAncla(null)).toEqual({});
    expect(comoAncla(123)).toEqual({});
    expect(esAnclaTexto(comoAncla('x'))).toBe(false);
  });
});

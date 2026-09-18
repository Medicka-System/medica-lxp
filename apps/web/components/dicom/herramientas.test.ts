import { describe, expect, it } from 'vitest';
import {
  HERRAMIENTAS,
  HERRAMIENTA_POR_DEFECTO,
  herramientasPorCategoria,
  obtenerHerramienta,
} from './herramientas';

describe('catálogo de herramientas', () => {
  it('tiene ids únicos', () => {
    const ids = HERRAMIENTAS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mapea cada herramienta a una tool de Cornerstone', () => {
    for (const h of HERRAMIENTAS) {
      expect(h.nombreCornerstone).toMatch(/^[A-Za-z]+$/);
    }
  });

  it('cubre manipulación, medición y anotación', () => {
    expect(herramientasPorCategoria('manipulacion').length).toBeGreaterThan(0);
    expect(herramientasPorCategoria('medicion').length).toBeGreaterThan(0);
    expect(herramientasPorCategoria('anotacion').length).toBeGreaterThan(0);
  });

  it('marca como anotables solo las de medición/anotación', () => {
    for (const h of HERRAMIENTAS) {
      if (h.categoria === 'manipulacion') expect(h.anota).toBe(false);
      else expect(h.anota).toBe(true);
    }
  });

  it('la herramienta por defecto existe en el catálogo', () => {
    expect(() => obtenerHerramienta(HERRAMIENTA_POR_DEFECTO)).not.toThrow();
  });

  it('obtenerHerramienta lanza ante un id desconocido', () => {
    // @ts-expect-error id inválido a propósito
    expect(() => obtenerHerramienta('inexistente')).toThrow();
  });
});

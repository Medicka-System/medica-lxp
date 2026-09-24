import { describe, expect, it } from 'vitest';
import {
  INFO_BLOQUE_TEORIA,
  TIPOS_BLOQUE_TEORIA,
  comoTipoBloqueTeoria,
  configInicial,
  type TipoBloqueTeoria,
} from './tipos-bloque';

/**
 * Contrato del registro de sub-tipos del editor de teoría (§5C). Es la fuente de
 * verdad de qué bloques existen y con qué `config` nacen — se prueba porque el editor
 * y el selector de recursos dependen de esta forma.
 */
describe('tipos-bloque · registro del editor de teoría', () => {
  it('ofrece exactamente los 10 sub-tipos de bloque pedidos', () => {
    expect([...TIPOS_BLOQUE_TEORIA].sort()).toEqual(
      ['caso', 'galeria', 'h5p', 'html', 'imagen', 'link', 'pdf', 'texto', 'video', 'xapi'].sort(),
    );
  });

  it('INFO_BLOQUE_TEORIA describe cada tipo (rótulo, descripción, familia, ícono)', () => {
    for (const t of TIPOS_BLOQUE_TEORIA) {
      const info = INFO_BLOQUE_TEORIA[t];
      expect(info.tipo).toBe(t);
      expect(info.rotulo).toBeTruthy();
      expect(info.descripcion).toBeTruthy();
      expect(info.icono).toBeTruthy();
      expect(['contenido', 'multimedia', 'interactivo', 'clinico']).toContain(info.familia);
    }
  });

  it('H5P y xAPI existen como BLOQUE (no como tipo de lección) y se insertan desde recurso', () => {
    expect(TIPOS_BLOQUE_TEORIA).toContain('h5p');
    expect(TIPOS_BLOQUE_TEORIA).toContain('xapi');
    expect(INFO_BLOQUE_TEORIA.h5p.desdeRecurso).toBe(true);
    expect(INFO_BLOQUE_TEORIA.xapi.desdeRecurso).toBe(true);
    expect(INFO_BLOQUE_TEORIA.caso.desdeRecurso).toBe(true);
    expect(INFO_BLOQUE_TEORIA.video.desdeRecurso).toBe(true);
    expect(INFO_BLOQUE_TEORIA.pdf.desdeRecurso).toBe(true);
  });

  it('configInicial da el cuerpo vacío correcto por tipo', () => {
    expect(configInicial('texto')).toEqual({ html: '' });
    expect(configInicial('html')).toEqual({ html: '' });
    expect(configInicial('imagen')).toEqual({ src: '', alt: '', pie: '' });
    expect(configInicial('galeria')).toEqual({ imagenes: [] });
    // Video usa el contrato de fuente compartido con la lección (subir/enlace + hitos);
    // `src`/`poster` ya no forman parte del cuerpo inicial (son compat de bloques viejos).
    expect(configInicial('video')).toEqual({ titulo: '', hitos: [] });
    expect(configInicial('link')).toEqual({ url: '', titulo: '', descripcion: '' });
    expect(configInicial('pdf')).toEqual({ src: '', titulo: '' });
    expect(configInicial('caso')).toEqual({ casoId: '', titulo: '' });
    expect(configInicial('h5p')).toEqual({ contentId: '', titulo: '' });
    // xAPI arranca solo con título; la fuente (contenidoId por ingesta o url por enlace) se fija después.
    expect(configInicial('xapi')).toEqual({ titulo: '' });
  });

  it('configInicial devuelve objetos nuevos (sin estado compartido entre bloques)', () => {
    const a = configInicial('galeria');
    const b = configInicial('galeria');
    expect(a).not.toBe(b);
    expect(a.imagenes).not.toBe(b.imagenes);
  });

  it('comoTipoBloqueTeoria normaliza crudos válidos y rechaza desconocidos', () => {
    for (const t of TIPOS_BLOQUE_TEORIA) {
      expect(comoTipoBloqueTeoria(t)).toBe(t);
    }
    expect(comoTipoBloqueTeoria('scorm')).toBeNull();
    expect(comoTipoBloqueTeoria('')).toBeNull();
    expect(comoTipoBloqueTeoria(undefined)).toBeNull();
    expect(comoTipoBloqueTeoria(42 as unknown)).toBeNull();
  });

  it('todos los tipos tienen config inicial serializable a JSON (van a jsonb)', () => {
    for (const t of TIPOS_BLOQUE_TEORIA as readonly TipoBloqueTeoria[]) {
      const cfg = configInicial(t);
      expect(() => JSON.stringify(cfg)).not.toThrow();
      expect(JSON.parse(JSON.stringify(cfg))).toEqual(cfg);
    }
  });
});

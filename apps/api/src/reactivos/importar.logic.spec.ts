import { parsearReactivos } from './importar.logic';

const H = ['enunciado', 'tipo', 'opciones', 'correcta', 'puntaje', 'dominio', 'retro'];

describe('parsearReactivos (import CSV/Excel · §7A)', () => {
  it('parsea opción múltiple con claves explícitas y correcta por clave', () => {
    const r = parsearReactivos([
      H,
      ['¿Órgano del signo de Murphy?', 'opcion_multiple', 'a) Vesícula | b) Riñón | c) Bazo', 'a', '2', 'interpretacion', 'Revisa colecistitis'],
    ]);
    expect(r.errores).toEqual([]);
    expect(r.reactivos).toHaveLength(1);
    const q = r.reactivos[0];
    expect(q.tipo).toBe('opcion_multiple');
    expect(q.opciones).toEqual([
      { clave: 'a', texto: 'Vesícula' },
      { clave: 'b', texto: 'Riñón' },
      { clave: 'c', texto: 'Bazo' },
    ]);
    expect(q.correcta).toBe('a');
    expect(q.puntaje).toBe(2);
    expect(q.dominio).toBe('interpretacion');
    expect(q.retro).toBe('Revisa colecistitis');
  });

  it('infiere multi cuando hay varias correctas y claves automáticas', () => {
    const r = parsearReactivos([
      H,
      ['Selecciona hallazgos', '', 'Pared engrosada | Líquido | Cálculo', 'a,c', '', 'adquisición', ''],
    ]);
    const q = r.reactivos[0];
    expect(q.tipo).toBe('multi');
    expect(q.correcta).toEqual(['a', 'c']);
    expect(q.dominio).toBe('adquisicion'); // normaliza acento
    expect(q.puntaje).toBe(1); // default
  });

  it('resuelve la correcta por TEXTO de la opción', () => {
    const r = parsearReactivos([H, ['Q', 'opcion_multiple', 'Sí | No', 'Sí', '', '', '']]);
    expect(r.reactivos[0].correcta).toBe('a');
  });

  it('acepta abierta sin opciones', () => {
    const r = parsearReactivos([H, ['Describe el caso', 'abierta', '', '', '', '', '']]);
    expect(r.reactivos[0].tipo).toBe('abierta');
    expect(r.reactivos[0].correcta).toBeNull();
  });

  it('omite filas inválidas y las reporta', () => {
    const r = parsearReactivos([
      H,
      ['', 'opcion_multiple', 'a|b', 'a', '', '', ''], // sin enunciado
      ['Sin opciones', 'opcion_multiple', '', '', '', '', ''], // sin opciones
      ['Sin correcta', 'opcion_multiple', 'a|b', 'zzz', '', '', ''], // correcta no casa
      ['Válida', 'opcion_multiple', 'a) X | b) Y', 'b', '', '', ''],
    ]);
    expect(r.reactivos).toHaveLength(1);
    expect(r.reactivos[0].enunciado).toBe('Válida');
    expect(r.errores.length).toBe(3);
  });

  it('reconoce encabezados en español con acentos y sinónimos', () => {
    const r = parsearReactivos([
      ['Pregunta', 'Tipo', 'Opciones', 'Respuesta', 'Puntos'],
      ['¿VF?', 'verdadero_falso', 'Verdadero | Falso', 'Verdadero', '3'],
    ]);
    expect(r.reactivos[0].tipo).toBe('verdadero_falso');
    expect(r.reactivos[0].correcta).toBe('a');
    expect(r.reactivos[0].puntaje).toBe(3);
  });

  it('falla si falta la columna enunciado', () => {
    const r = parsearReactivos([['tipo', 'opciones'], ['x', 'y']]);
    expect(r.reactivos).toHaveLength(0);
    expect(r.errores[0]).toMatch(/enunciado/i);
  });
});

import { renderizarPlantilla } from './plantilla';

describe('renderizarPlantilla (user prompt configurable · §7A)', () => {
  it('interpola variables provistas', () => {
    const r = renderizarPlantilla('Hola {{nombre}}, verdad: {{verdad}}', {
      nombre: 'Ana',
      verdad: 'colecistitis',
    });
    expect(r.texto).toBe('Hola Ana, verdad: colecistitis');
    expect(r.faltantes).toEqual([]);
  });

  it('serializa objetos/arreglos a JSON', () => {
    const r = renderizarPlantilla('{{rubrica}}', {
      rubrica: [{ criterio: 'dx', peso: 0.5 }],
    });
    expect(r.texto).toContain('"criterio": "dx"');
  });

  it('reemplaza faltantes por vacío y las reporta (no deja el literal {{x}})', () => {
    const r = renderizarPlantilla('a {{falta}} b', {});
    expect(r.texto).toBe('a  b');
    expect(r.faltantes).toEqual(['falta']);
  });

  it('tolera espacios dentro de las llaves', () => {
    const r = renderizarPlantilla('{{  respuesta  }}', { respuesta: 'ok' });
    expect(r.texto).toBe('ok');
  });
});

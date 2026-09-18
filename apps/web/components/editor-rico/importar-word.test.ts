import { describe, it, expect, vi, beforeEach } from 'vitest';

// El bundle browser de mammoth se mockea: en jsdom no hay un .docx real que abrir,
// y aquí solo verificamos el contrato del importador (html + mapeo de avisos).
const convertToHtml = vi.fn();
vi.mock('mammoth/mammoth.browser.js', () => ({
  default: { convertToHtml: (...a: unknown[]) => convertToHtml(...a) },
}));

import { importarWord } from './importar-word';

describe('importarWord', () => {
  beforeEach(() => convertToHtml.mockReset());

  it('convierte el .docx a HTML y expone los avisos de formato', async () => {
    convertToHtml.mockResolvedValue({
      value: '<h1>Título</h1><p>Cuerpo</p>',
      messages: [{ message: 'Estilo no soportado' }, { message: 'Otro aviso' }],
    });
    const archivo = new File([new Uint8Array([1, 2, 3])], 'clase.docx');

    const r = await importarWord(archivo);

    expect(r.html).toContain('<h1>Título</h1>');
    expect(r.avisos).toEqual(['Estilo no soportado', 'Otro aviso']);
  });

  it('devuelve sin avisos cuando el documento se mapea limpio', async () => {
    convertToHtml.mockResolvedValue({ value: '<p>ok</p>', messages: [] });
    const r = await importarWord(new File([new Uint8Array([0])], 'x.docx'));
    expect(r.avisos).toHaveLength(0);
  });
});

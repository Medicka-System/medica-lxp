import { BadRequestException } from '@nestjs/common';
import { MediaArchivosService } from './media-archivos.service';
import type { StorageService } from '../dicom/storage.service';

const storage = {
  claveArchivo: jest.fn((id: string, ext: string) => `media/archivos/${id}.${ext}`),
  firmarSubida: jest.fn(() => 'http://storage/put'),
  firmarLectura: jest.fn(() => 'http://storage/get'),
} as unknown as StorageService;

describe('MediaArchivosService', () => {
  beforeEach(() => jest.clearAllMocks());
  const svc = new MediaArchivosService(storage);

  it('firma la subida de un documento permitido (normaliza a minúsculas)', () => {
    const r = svc.firmarSubida('DOCX');
    expect(r.ext).toBe('docx');
    expect(r.ref).toBe(`media/archivos/${r.id}.docx`);
  });

  it('rechaza una extensión desconocida en vez de forzarla a pdf', () => {
    expect(() => svc.firmarSubida('exe')).toThrow(BadRequestException);
    expect(() => svc.firmarSubida('')).toThrow(BadRequestException);
    expect(storage.firmarSubida).not.toHaveBeenCalled();
  });

  it('firma lectura solo de claves media/archivos/', () => {
    const { urls } = svc.firmarLectura(['media/archivos/a.pdf', 'media/imagenes/b.png']);
    expect(urls['media/archivos/a.pdf']).toBe('http://storage/get');
    expect(urls['media/imagenes/b.png']).toBeUndefined();
  });
});

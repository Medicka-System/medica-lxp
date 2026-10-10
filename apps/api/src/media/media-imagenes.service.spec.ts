import { BadRequestException } from '@nestjs/common';
import { MediaImagenesService } from './media-imagenes.service';
import type { StorageService } from '../dicom/storage.service';

const storage = {
  claveImagenContenido: jest.fn((id: string, ext: string) => `media/imagenes/${id}.${ext}`),
  firmarSubida: jest.fn(() => 'http://storage/put'),
  firmarLectura: jest.fn(() => 'http://storage/get'),
  firmarLecturaEstable: jest.fn(() => 'http://storage/get'), // lectura cacheable (Fase 1 entrega)
} as unknown as StorageService;

describe('MediaImagenesService', () => {
  beforeEach(() => jest.clearAllMocks());
  const svc = new MediaImagenesService(storage);

  it('firma la subida de una extensión permitida (normaliza a minúsculas)', () => {
    const r = svc.firmarSubida('PNG');
    expect(r.ext).toBe('png');
    expect(r.ref).toBe(`media/imagenes/${r.id}.png`);
    expect(r.urlSubida).toBe('http://storage/put');
  });

  it('rechaza una extensión desconocida en vez de forzarla a jpg', () => {
    expect(() => svc.firmarSubida('exe')).toThrow(BadRequestException);
    expect(() => svc.firmarSubida('')).toThrow(BadRequestException);
    expect(storage.firmarSubida).not.toHaveBeenCalled();
  });

  it('firma lectura solo de claves media/imagenes/', () => {
    const { urls } = svc.firmarLectura(['media/imagenes/a.png', 'media/archivos/b.pdf']);
    expect(urls['media/imagenes/a.png']).toBe('http://storage/get');
    expect(urls['media/archivos/b.pdf']).toBeUndefined();
  });
});

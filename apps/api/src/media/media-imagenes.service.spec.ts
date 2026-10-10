import { BadRequestException } from '@nestjs/common';
import { MediaImagenesService } from './media-imagenes.service';
import type { StorageService } from '../dicom/storage.service';
import type { ColasProducer } from '../colas/colas-producer';

const storage = {
  claveImagenContenido: jest.fn((id: string, ext: string) => `media/imagenes/${id}.${ext}`),
  firmarSubida: jest.fn(() => 'http://storage/put'),
  firmarLectura: jest.fn(() => 'http://storage/get'),
  firmarLecturaEstable: jest.fn(() => 'http://storage/get'), // lectura cacheable (Fase 1 entrega)
} as unknown as StorageService;

const colas = { encolar: jest.fn(async () => 'job-1') } as unknown as ColasProducer;

describe('MediaImagenesService', () => {
  beforeEach(() => jest.clearAllMocks());
  const svc = new MediaImagenesService(storage, colas);

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

  it('derivar encola 1 job por imagen de contenido e ignora no-derivables', async () => {
    const r = await svc.derivar([
      'media/imagenes/aaaa.jpg', // derivable
      'media/imagenes/bbbb.png', // derivable
      'media/imagenes/casos/c1/thumb.jpg', // thumb (subpath) → fuera
      'media/imagenes/vid.mp4', // video → fuera
      'media/archivos/doc.pdf', // otro prefijo → fuera
    ]);
    expect(r.encolados).toBe(2);
    expect(colas.encolar).toHaveBeenCalledTimes(2);
    // Cada job trae 3 destinos (640/1080/1600) con claves derivadas correctas.
    const [, job] = (colas.encolar as jest.Mock).mock.calls[0];
    expect(job.destinos.map((d: { ancho: number }) => d.ancho)).toEqual([640, 1080, 1600]);
    expect(job.destinos[0].ref).toBe('media/imagenes/aaaa/640.webp');
  });
});

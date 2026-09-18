import { ConflictException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { claveVideo } from './claves';
import type { DbService } from '../db/db.service';
import type { StorageService } from '../dicom/storage.service';

/** `sql` falso: cada llamada devuelve el siguiente resultado encolado. */
function sqlFalso(resultados: unknown[][]): DbService {
  let i = 0;
  const sql = ((): Promise<unknown[]> => Promise.resolve(resultados[i++] ?? [])) as unknown;
  return { sql } as DbService;
}

const storage = {
  firmarSubida: jest.fn(() => 'http://storage/put-firmado'),
  firmarLectura: jest.fn(() => 'http://storage/get-firmado'),
  firmarBorrado: jest.fn(),
} as unknown as StorageService;

describe('MediaService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('solicita subida: pre-registra y firma el PUT con la clave del video', async () => {
    const db = sqlFalso([[{ id: 'v1', estado: 'procesando', recurso_ref: null, titulo: 'Intro' }]]);
    const media = new MediaService(db, storage);
    const r = await media.solicitarSubidaVideo({ titulo: 'Intro' });
    expect(r.videotecaId).toBe('v1');
    expect(r.recursoRef).toBe(claveVideo('v1'));
    expect(r.urlSubida).toBe('http://storage/put-firmado');
    expect(storage.firmarSubida).toHaveBeenCalledWith(claveVideo('v1'));
  });

  it('confirma el video y lo deja listo', async () => {
    const db = sqlFalso([[{ id: 'v1', estado: 'listo', recurso_ref: claveVideo('v1'), titulo: 'Intro' }]]);
    const media = new MediaService(db, storage);
    const r = await media.confirmarVideo('v1', { duracionSeg: 120 });
    expect(r).toEqual({ videotecaId: 'v1', estado: 'listo' });
  });

  it('reproducir firma un GET solo si el video está listo', async () => {
    const db = sqlFalso([[{ id: 'v1', estado: 'listo', recurso_ref: claveVideo('v1'), titulo: 'Intro' }]]);
    const media = new MediaService(db, storage);
    const r = await media.firmarReproduccion('v1');
    expect(r.urlReproduccion).toBe('http://storage/get-firmado');
    expect(storage.firmarLectura).toHaveBeenCalledWith(claveVideo('v1'));
  });

  it('reproducir falla si el video no está listo', async () => {
    const db = sqlFalso([[{ id: 'v1', estado: 'procesando', recurso_ref: null, titulo: 'Intro' }]]);
    const media = new MediaService(db, storage);
    await expect(media.firmarReproduccion('v1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmar falla si el video no existe', async () => {
    const db = sqlFalso([[]]);
    const media = new MediaService(db, storage);
    await expect(media.confirmarVideo('nope', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
